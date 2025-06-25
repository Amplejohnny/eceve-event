import { NextRequest, NextResponse } from "next/server";
import { resendVerificationEmail, getUserStatus } from "@/lib/auth";
import { z } from "zod";

// Validation schema
const resendSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required")
    .max(255, "Email is too long")
    .transform((email) => email.toLowerCase().trim()),
});

// Rate limiting for resend requests (stricter than registration)
const resendAttempts = new Map<string, { count: number; resetTime: number }>();

function checkResendRateLimit(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes window
  const maxAttempts = 3; // Max 3 resend attempts per 5 minutes

  const current = resendAttempts.get(identifier);

  if (!current || now > current.resetTime) {
    resendAttempts.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetIn: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= maxAttempts) {
    const resetIn = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, resetIn };
  }

  current.count++;
  const resetIn = Math.ceil((current.resetTime - now) / 1000);
  return { allowed: true, remaining: maxAttempts - current.count, resetIn };
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    // Get client IP for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    
    // Use both IP and email for rate limiting key to prevent abuse
    const rateLimitKey = `${ip}:${email}`;

    // Check rate limit
    const rateLimit = checkResendRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many resend requests. Please wait ${Math.ceil(rateLimit.resetIn / 60)} minutes before trying again.`,
          code: "RATE_LIMITED",
          resetIn: rateLimit.resetIn,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + rateLimit.resetIn),
            "Retry-After": String(rateLimit.resetIn),
          },
        }
      );
    }

    // Check user status
    const userStatus = await getUserStatus(email);

    if (!userStatus.exists) {
      // Don't reveal if user exists for security, but log the attempt
      console.log(`Resend verification attempted for non-existent user: ${email}`);
      return NextResponse.json(
        {
          message: "If an account with this email exists and is unverified, we've sent a new verification email.",
          code: "EMAIL_SENT",
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    if (userStatus.verified) {
      return NextResponse.json(
        {
          error: "This email address is already verified. You can log in to your account.",
          code: "ALREADY_VERIFIED",
          redirectTo: "/auth/login",
        },
        { status: 400 }
      );
    }

    // Attempt to resend verification email
    const emailSent = await resendVerificationEmail(email);

    if (emailSent) {
      console.log(`Verification email resent to: ${email}`);
      return NextResponse.json(
        {
          message: "Verification email sent successfully! Please check your inbox and spam folder.",
          code: "EMAIL_SENT",
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    } else {
      return NextResponse.json(
        {
          error: "Failed to send verification email. Please try again later or contact support.",
          code: "EMAIL_SEND_FAILED",
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Resend verification error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.reduce((acc, err) => {
        const field = err.path[0] as string;
        acc[field] = err.message;
        return acc;
      }, {} as Record<string, string>);

      return NextResponse.json(
        {
          error: "Please enter a valid email address.",
          code: "VALIDATION_ERROR",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("SMTP")) {
        return NextResponse.json(
          {
            error: "Email service is temporarily unavailable. Please try again later.",
            code: "SMTP_ERROR",
          },
          { status: 503 }
        );
      }
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again later.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" }, 
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" }, 
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" }, 
    { status: 405 }
  );
}