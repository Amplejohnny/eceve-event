import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, resendVerificationEmail } from "@/lib/auth";
import { verifyPassword } from "@/lib/utils";
import { db } from "@/lib/db";
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
  console.error(`[LOGIN_ERROR] ${context}:`, logData);

  // Example: Send to external logging service
  // await sendToLoggingService(logData);
};

const logInfo = (message: string, metadata?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.log(`[LOGIN_INFO] ${timestamp}: ${message}`, metadata || {});
};

const logWarning = (message: string, metadata?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.warn(`[LOGIN_WARNING] ${timestamp}: ${message}`, metadata || {});
};

// Validation schema with better error messages
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters")
    .transform((email) => email.toLowerCase().trim()),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be less than 128 characters"),
});

// Enhanced rate limiting with better tracking
const loginAttempts = new Map<
  string,
  {
    count: number;
    resetTime: number;
    attempts: number[];
    lastAttempt: number;
    blocked: boolean;
  }
>();

function checkRateLimit(
  ip: string,
  email?: string
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 10; // More lenient than signup
  const blockDuration = 30 * 60 * 1000; // 30 minutes block after max attempts

  // Use IP as primary key, but track email attempts too
  const key = `${ip}:${email || "unknown"}`;
  const current = loginAttempts.get(key);

  if (!current || now > current.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs,
      attempts: [now],
      lastAttempt: now,
      blocked: false,
    };
    loginAttempts.set(key, newEntry);

    logInfo("Login rate limit reset", {
      ip,
      email: email?.substring(0, 3) + "***",
      newAttempts: 1,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: newEntry.resetTime,
      isBlocked: false,
    };
  }

  // Check if currently blocked
  if (current.blocked && now < current.resetTime) {
    logWarning("Login attempt while blocked", {
      ip,
      email: email?.substring(0, 3) + "***",
      attempts: current.count,
      timeUntilReset: Math.ceil((current.resetTime - now) / 1000),
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      isBlocked: true,
    };
  }

  if (current.count >= maxAttempts) {
    // Block the IP/email combination
    current.blocked = true;
    current.resetTime = now + blockDuration;

    logWarning("Login rate limit exceeded - blocking", {
      ip,
      email: email?.substring(0, 3) + "***",
      attempts: current.count,
      blockUntil: new Date(current.resetTime).toISOString(),
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      isBlocked: true,
    };
  }

  current.count++;
  current.attempts.push(now);
  current.lastAttempt = now;

  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime: current.resetTime,
    isBlocked: false,
  };
}

// Get client IP with better extraction
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "unknown";
}

// Helper function to get user login info safely
async function getUserLoginInfo(email: string) {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true,
        emailVerified: true,
        role: true,
        name: true,
      },
    });

    return user;
  } catch (error) {
    logError(error, "Database query failed during login", {
      email: email.substring(0, 3) + "***",
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(request);

  try {
    // Check if user is already logged in
    const existingSession = await getServerSession(authOptions);
    if (existingSession?.user) {
      logInfo("Login attempt by already authenticated user", {
        ip,
        userId: existingSession.user.id,
        email: existingSession.user.email?.substring(0, 3) + "***",
      });

      return NextResponse.json(
        {
          message: "You are already logged in",
          user: {
            id: existingSession.user.id,
            email: existingSession.user.email,
            name: existingSession.user.name,
            role: existingSession.user.role,
          },
          redirectTo: "/",
        },
        { status: 200 }
      );
    }

    logInfo("Login attempt started", { ip });

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logError(parseError, "JSON parsing failed during login", { ip });
      return NextResponse.json(
        {
          error:
            "Invalid request format. Please check your data and try again.",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    const validatedData = loginSchema.parse(body);
    const { email, password } = validatedData;

    logInfo("Login validation passed", {
      ip,
      email: email.substring(0, 3) + "***",
    });

    // Check rate limit
    const rateLimit = checkRateLimit(ip, email);
    if (!rateLimit.allowed) {
      const timeUntilReset = Math.ceil(
        (rateLimit.resetTime - Date.now()) / 1000
      );

      logWarning("Rate limit blocked login attempt", {
        ip,
        email: email.substring(0, 3) + "***",
        isBlocked: rateLimit.isBlocked,
        timeUntilReset,
      });

      return NextResponse.json(
        {
          error: rateLimit.isBlocked
            ? "Too many failed login attempts. Your account has been temporarily blocked."
            : "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
          retryAfter: timeUntilReset,
          blocked: rateLimit.isBlocked,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
            "Retry-After": String(timeUntilReset),
          },
        }
      );
    }

    // Get user information
    const user = await getUserLoginInfo(email);

    if (!user) {
      logWarning("Login attempt with non-existent email", {
        ip,
        email: email.substring(0, 3) + "***",
      });

      return NextResponse.json(
        {
          error: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      logWarning("Login attempt with inactive account", {
        ip,
        email: email.substring(0, 3) + "***",
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: "Your account has been deactivated. Please contact support.",
          code: "ACCOUNT_DEACTIVATED",
        },
        { status: 401 }
      );
    }

    // Check if user has a password (shouldn't happen, but safety check)
    if (!user.password) {
      logWarning("Login attempt for user without password", {
        ip,
        email: email.substring(0, 3) + "***",
        userId: user.id,
      });

      return NextResponse.json(
        {
          error:
            "Your account was created without a password. Please reset your password.",
          code: "NO_PASSWORD",
          redirectTo: "/auth/reset-password",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      logWarning("Invalid password attempt", {
        ip,
        email: email.substring(0, 3) + "***",
        userId: user.id,
      });

      return NextResponse.json(
        {
          error: "Invalid email or password",
          code: "INVALID_CREDENTIALS",
        },
        { status: 401 }
      );
    }

    // Check email verification
    if (!user.emailVerified) {
      logInfo("Login attempt with unverified email", {
        ip,
        email: email.substring(0, 3) + "***",
        userId: user.id,
      });

      // Automatically resend verification email
      try {
        await resendVerificationEmail(user.email);
        logInfo("Verification email resent during login", {
          ip,
          email: email.substring(0, 3) + "***",
          userId: user.id,
        });
      } catch (error) {
        logError(error, "Failed to resend verification email during login", {
          ip,
          email: email.substring(0, 3) + "***",
          userId: user.id,
        });
      }

      return NextResponse.json(
        {
          error:
            "Please verify your email address before logging in. We've sent you a new verification link.",
          code: "EMAIL_NOT_VERIFIED",
          redirectTo: "/auth/verify-request",
          email: user.email,
        },
        { status: 401 }
      );
    }

    // At this point, authentication is successful
    // Return success response with user info
    // The actual session creation will be handled by your client-side code
    // calling NextAuth's signIn function

    const processingTime = Date.now() - startTime;

    logInfo("User authentication successful", {
      ip,
      userId: user.id,
      email: email.substring(0, 3) + "***",
      role: user.role,
      processingTime,
    });

    return NextResponse.json(
      {
        message: "Authentication successful",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        redirectTo: "/",
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logError(error, "Login validation error", {
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

    // Handle specific login errors
    if (error instanceof Error) {
      // Database connection errors
      if (
        error.message.includes("connect") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNREFUSED")
      ) {
        logError(error, "Database connection error during login", {
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
      logError(error, "Unhandled login error", {
        ip,
        processingTime,
        errorMessage: error.message,
      });
    } else {
      // Log non-Error objects
      logError(
        new Error("Unknown error type"),
        "Non-Error object thrown during login",
        {
          ip,
          processingTime,
          errorType: typeof error,
          errorValue: String(error),
        }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Something went wrong during login. Please try again later.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods with logging
export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported GET request to login endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported PUT request to login endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIP(request);
  logInfo("Unsupported DELETE request to login endpoint", { ip });
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
