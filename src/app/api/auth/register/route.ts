// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { registerUser, getUserStatus } from "@/lib/auth";
import { z } from "zod";

// Validation schema
const signupSchema = z
  .object({
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required")
      .max(255, "Email is too long")
      .transform((email) => email.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name is too long")
      .trim()
      .optional(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Rate limiting helper (simple in-memory implementation)
const signupAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const current = signupAttempts.get(ip);

  if (!current || now > current.resetTime) {
    signupAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (current.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxAttempts - current.count };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again in 15 minutes.",
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 900),
          },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = signupSchema.parse(body);

    const { email, password, name } = validatedData;

    // Check if user already exists
    const userStatus = await getUserStatus(email);

    if (userStatus.exists) {
      if (userStatus.verified) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please try logging in instead.",
            code: "USER_EXISTS",
            redirectTo: "/auth/login",
          },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          {
            error:
              "An account with this email exists but is not verified. Please check your email for the verification link.",
            code: "USER_UNVERIFIED",
            redirectTo: "/auth/verify-request",
          },
          { status: 409 }
        );
      }
    }

    // Create new user
    const newUser = await registerUser(email, password, name);

    // Log successful registration (without sensitive data)
    console.log(`New user registered: ${email} (ID: ${newUser.id})`);

    return NextResponse.json(
      {
        message:
          "Account created successfully! Please check your email to verify your account.",
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
        nextStep: "email_verification",
        redirectTo: "/auth/verify-request",
      },
      {
        status: 201,
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    console.error("Signup error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const fieldErrors = error.errors.reduce((acc, err) => {
        const field = err.path[0] as string;
        acc[field] = err.message;
        return acc;
      }, {} as Record<string, string>);

      return NextResponse.json(
        {
          error: "Please check your input and try again.",
          code: "VALIDATION_ERROR",
          fieldErrors,
        },
        { status: 400 }
      );
    }

    // Handle specific registration errors
    if (error instanceof Error) {
      if (error.message === "User already exists") {
        return NextResponse.json(
          {
            error: "An account with this email already exists.",
            code: "USER_EXISTS",
            redirectTo: "/auth/login",
          },
          { status: 409 }
        );
      }

      if (error.message === "Failed to send verification email") {
        return NextResponse.json(
          {
            error:
              "Account created but we couldn't send the verification email. Please try requesting a new verification email.",
            code: "EMAIL_SEND_FAILED",
            redirectTo: "/auth/verify-request",
          },
          { status: 500 }
        );
      }

      if (error.message.includes("SMTP")) {
        return NextResponse.json(
          {
            error:
              "Account created but there was an issue with email delivery. Please contact support.",
            code: "SMTP_ERROR",
          },
          { status: 500 }
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
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
