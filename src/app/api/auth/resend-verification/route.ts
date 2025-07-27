import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resendVerificationEmail, getUserStatus } from "@/lib/auth";
import { z } from "zod";

// Enhanced logging utility
const logError = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>
): void => {
  const timestamp = new Date().toISOString();
  const errorInfo = error instanceof Error 
    ? {
        message: error.message,
        name: error.constructor.name,
        stack: error.stack,
      }
    : {
        message: String(error),
        name: "Unknown",
        stack: undefined,
      };

  const logData = {
    timestamp,
    context,
    error: errorInfo,
    metadata,
  };

  // In production, you'd want to use a proper logging service
  console.error(`[RESEND_VERIFICATION_ERROR] ${context}:`, logData);

  // Example: Send to external logging service
  // await sendToLoggingService(logData);
};

const logInfo = (message: string, metadata?: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  console.log(
    `[RESEND_VERIFICATION_INFO] ${timestamp}: ${message}`,
    metadata || {}
  );
};

// Enhanced validation schema with better error messages
const resendSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .transform((email) => email.toLowerCase().trim()),
});

// Enhanced rate limiting with better tracking
const resendAttempts = new Map<
  string,
  { count: number; resetTime: number; attempts: number[] }
>();

function checkResendRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes window
  const maxAttempts = 3; // Max 3 resend attempts per 5 minutes

  const current = resendAttempts.get(identifier);

  if (!current || now > current.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs,
      attempts: [now],
    };
    resendAttempts.set(identifier, newEntry);

    logInfo("Resend rate limit reset", {
      identifier: identifier.split(":")[0],
      newAttempts: 1,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (current.count >= maxAttempts) {
    logInfo("Resend rate limit exceeded", {
      identifier: identifier.split(":")[0],
      attempts: current.count,
      timeUntilReset: Math.ceil((current.resetTime - now) / 1000),
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }

  current.count++;
  current.attempts.push(now);

  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime: current.resetTime,
  };
}

// Get client IP with better extraction
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(request);

  try {
    logInfo("Resend verification attempt started", { ip });

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logError(parseError, "JSON parsing failed", { ip });
      return NextResponse.json(
        {
          error:
            "Invalid request format. Please check your data and try again.",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const validatedData = resendSchema.parse(body);
    const { email } = validatedData;

    logInfo("Input validation passed", {
      ip,
      email: email.substring(0, 3) + "***", // Partial email for privacy
    });

    // Use both IP and email for rate limiting key to prevent abuse
    const rateLimitKey = `${ip}:${email}`;

    // Check rate limit
    const rateLimit = checkResendRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      logInfo("Rate limit blocked resend verification", {
        ip,
        email: email.substring(0, 3) + "***",
        resetTime: rateLimit.resetTime,
      });

      return NextResponse.json(
        {
          error: `Too many resend requests. Please wait ${Math.ceil(
            (rateLimit.resetTime - Date.now()) / 60000
          )} minutes before trying again.`,
          code: "RATE_LIMITED",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
            "Retry-After": String(
              Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            ),
          },
        }
      );
    }

    // Check user status
    const userStatus = await getUserStatus(email);

    if (!userStatus.exists) {
      // Don't reveal if user exists for security, but log the attempt
      logInfo("Resend verification attempted for non-existent user", {
        ip,
        email: email.substring(0, 3) + "***",
      });

      // Return success response to prevent email enumeration
      return NextResponse.json(
        {
          message:
            "If an account with this email exists and is unverified, we've sent a new verification email.",
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
      logInfo("Resend verification attempted for already verified user", {
        ip,
        email: email.substring(0, 3) + "***",
        verified: true,
      });

      return NextResponse.json(
        {
          error:
            "This email address is already verified. You can log in to your account.",
          code: "ALREADY_VERIFIED",
          redirectTo: "/auth/login",
        },
        { status: 400 }
      );
    }

    // Attempt to resend verification email
    const emailSent = await resendVerificationEmail(email);

    const processingTime = Date.now() - startTime;

    if (emailSent) {
      logInfo("Verification email resent successfully", {
        ip,
        email: email.substring(0, 3) + "***",
        processingTime,
      });

      return NextResponse.json(
        {
          message:
            "Verification email sent successfully! Please check your inbox and spam folder.",
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
      logError(
        new Error("Failed to send verification email"),
        "Email sending failed",
        {
          ip,
          email: email.substring(0, 3) + "***",
          processingTime,
        }
      );

      return NextResponse.json(
        {
          error:
            "Failed to send verification email. Please try again later or contact support.",
          code: "EMAIL_SEND_FAILED",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logError(error, "Validation error", {
        ip,
        processingTime,
        fieldErrors: error.errors.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      });

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
        logError(error, "SMTP error during resend verification", {
          ip,
          processingTime,
          errorType: "smtp",
        });

        return NextResponse.json(
          {
            error:
              "Email service is temporarily unavailable. Please try again later.",
            code: "SMTP_ERROR",
          },
          { status: 503 }
        );
      }

      // Database connection errors
      if (
        error.message.includes("connect") ||
        error.message.includes("timeout")
      ) {
        logError(error, "Database connection error", {
          ip,
          processingTime,
          errorType: "database",
        });

        return NextResponse.json(
          {
            error:
              "Service temporarily unavailable. Please try again in a few moments.",
            code: "SERVICE_UNAVAILABLE",
          },
          { status: 503 }
        );
      }

      // Log any other specific errors
      logError(error, "Unhandled resend verification error", {
        ip,
        processingTime,
        errorMessage: error.message,
      });
    } else {
      // Log non-Error objects
      logError(new Error("Unknown error type"), "Non-Error object thrown", {
        ip,
        processingTime,
        errorType: typeof error,
        errorValue: String(error),
      });
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

// Handle unsupported methods with logging
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported GET request to resend verification endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported PUT request to resend verification endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported DELETE request to resend verification endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
