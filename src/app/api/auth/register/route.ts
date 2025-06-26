// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { registerUser, getUserStatus } from "@/lib/auth";
import { z } from "zod";

// Enhanced logging utility
const logError = (
  error: any,
  context: string,
  metadata?: Record<string, any>
) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    context,
    error: {
      message: error.message,
      name: error.constructor.name,
      stack: error.stack,
    },
    metadata,
  };

  // In production, you'd want to use a proper logging service
  console.error(`[SIGNUP_ERROR] ${context}:`, logData);

  // Example: Send to external logging service
  // await sendToLoggingService(logData);
};

const logInfo = (message: string, metadata?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.log(`[SIGNUP_INFO] ${timestamp}: ${message}`, metadata || {});
};

// Validation schema with better error messages
const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address")
      .max(255, "Email must be less than 255 characters")
      .transform((email) => email.toLowerCase().trim()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be less than 100 characters")
      .trim()
      .optional(),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Enhanced rate limiting with better tracking
const signupAttempts = new Map<
  string,
  { count: number; resetTime: number; attempts: number[] }
>();

function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;

  const current = signupAttempts.get(ip);

  if (!current || now > current.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs,
      attempts: [now],
    };
    signupAttempts.set(ip, newEntry);

    logInfo("Rate limit reset", { ip, newAttempts: 1 });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (current.count >= maxAttempts) {
    logInfo("Rate limit exceeded", {
      ip,
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
    logInfo("Signup attempt started", { ip });

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      logInfo("Rate limit blocked signup", {
        ip,
        resetTime: rateLimit.resetTime,
      });

      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again in 15 minutes.",
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

    const validatedData = signupSchema.parse(body);
    const { email, password, name } = validatedData;

    logInfo("Input validation passed", {
      ip,
      email: email.substring(0, 3) + "***", // Partial email for privacy
      hasName: !!name,
    });

    // Check if user already exists
    const userStatus = await getUserStatus(email);

    if (userStatus.exists) {
      logInfo("User already exists", {
        ip,
        email: email.substring(0, 3) + "***",
        verified: userStatus.verified,
      });

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

    const processingTime = Date.now() - startTime;

    logInfo("User registered successfully", {
      ip,
      userId: newUser.id,
      email: email.substring(0, 3) + "***",
      processingTime,
      hasName: !!name,
    });

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
        logInfo("Duplicate user creation attempt", {
          ip,
          processingTime,
          errorMessage: error.message,
        });

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
        logError(error, "Email verification failed", {
          ip,
          processingTime,
          errorType: "email_verification",
        });

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
        logError(error, "SMTP error during registration", {
          ip,
          processingTime,
          errorType: "smtp",
        });

        return NextResponse.json(
          {
            error:
              "Account created but there was an issue with email delivery. Please contact support.",
            code: "SMTP_ERROR",
          },
          { status: 500 }
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
      logError(error, "Unhandled registration error", {
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
  logInfo("Unsupported GET request to signup endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported PUT request to signup endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported DELETE request to signup endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
