import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resetPasswordWithToken, verifyPasswordResetToken } from "@/lib/auth";
import { z } from "zod";

// Enhanced logging utilities
const logError = (
  error: unknown,
  context: string,
  metadata?: Record<string, unknown>
): void => {
  const timestamp = new Date().toISOString();
  const errorInfo =
    error instanceof Error
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
  console.error(`[RESET_PASSWORD_ERROR] ${context}:`, logData);

  // Example: Send to external logging service
  // await sendToLoggingService(logData);
};

const logInfo = (message: string, metadata?: Record<string, unknown>): void => {
  const timestamp = new Date().toISOString();
  console.log(`[RESET_PASSWORD_INFO] ${timestamp}: ${message}`, metadata || {});
};

const logSecurityEvent = (
  level: "info" | "warn" | "error",
  event: string,
  details: Record<string, unknown>,
  req: NextRequest
) => {
  const clientInfo = getClientInfo(req);
  const timestamp = new Date().toISOString();

  const logData = {
    timestamp,
    level,
    event,
    ...clientInfo,
    ...details,
    sanitized: true,
  };

  console.log(`[SECURITY] ${level.toUpperCase()}: ${event}`, logData);
};

// Enhanced validation schema with better error messages
const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .min(1, "Reset token is required")
      .length(64, "Invalid token format")
      .regex(/^[a-f0-9]+$/i, "Invalid token characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(128, "Password must be less than 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
      )
      .refine((password) => !password.toLowerCase().includes("password"), {
        message: "Password cannot contain the word 'password'",
      })
      .refine((password) => !/(.)\1{2,}/.test(password), {
        message: "Password cannot contain repeated characters",
      })
      .refine(
        (password) =>
          !/^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
            password
          ),
        {
          message: "Password cannot contain sequential characters",
        }
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Enhanced rate limiting with better tracking
const resetPasswordAttempts = new Map<
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
  const maxAttempts = 3;

  const current = resetPasswordAttempts.get(ip);

  if (!current || now > current.resetTime) {
    const newEntry = {
      count: 1,
      resetTime: now + windowMs,
      attempts: [now],
    };
    resetPasswordAttempts.set(ip, newEntry);

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

// Get client IP and info with better extraction
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

function getClientInfo(req: NextRequest) {
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const origin = req.headers.get("origin") || "unknown";

  return { ip, userAgent, origin };
}

// Main POST handler
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIP(req);

  try {
    logInfo("Password reset attempt started", { ip });

    // Check rate limit
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      logSecurityEvent(
        "warn",
        "RESET_PASSWORD_RATE_LIMITED",
        {
          attempts: resetPasswordAttempts.get(ip)?.count || 0,
          resetTime: rateLimit.resetTime,
        },
        req
      );

      return NextResponse.json(
        {
          error:
            "Too many password reset attempts. Please try again in 15 minutes.",
          code: "RATE_LIMITED",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            ),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
          },
        }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
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

    const validatedData = resetPasswordSchema.parse(body);
    const { token, password } = validatedData;

    logInfo("Input validation passed", {
      ip,
      tokenLength: token.length,
      passwordLength: password.length,
      hasConfirmPassword: !!body.confirmPassword,
    });

    // Verify token exists and is valid
    const tokenVerification = await verifyPasswordResetToken(token);

    if (!tokenVerification.valid) {
      logSecurityEvent(
        "warn",
        "RESET_PASSWORD_INVALID_TOKEN",
        {
          tokenFormat: token.length === 64 ? "valid_format" : "invalid_format",
          hasUserId: !!tokenVerification.userId,
        },
        req
      );

      return NextResponse.json(
        {
          error:
            "Invalid or expired reset token. Please request a new password reset link.",
          code: "INVALID_TOKEN",
          redirectTo: "/auth/forgot-password",
        },
        { status: 400 }
      );
    }

    logInfo("Token verification passed", {
      ip,
      userId: tokenVerification.userId,
    });

    // Attempt password reset
    const resetResult = await resetPasswordWithToken(token, password);

    if (!resetResult.success) {
      logError(new Error(resetResult.message), "Password reset failed", {
        ip,
        userId: tokenVerification.userId,
        duration: Date.now() - startTime,
      });

      // Map internal error messages to user-friendly ones
      let userMessage = "Failed to reset password. Please try again.";
      let errorCode = "RESET_FAILED";
      let redirectTo = undefined;

      if (resetResult.message.includes("token")) {
        userMessage =
          "Invalid or expired reset token. Please request a new password reset link.";
        errorCode = "TOKEN_EXPIRED";
        redirectTo = "/auth/forgot-password";
      } else if (resetResult.message.includes("password")) {
        userMessage = "Password does not meet security requirements.";
        errorCode = "INVALID_PASSWORD";
      }

      return NextResponse.json(
        {
          error: userMessage,
          code: errorCode,
          redirectTo,
        },
        { status: 400 }
      );
    }

    const processingTime = Date.now() - startTime;

    // Success - log the event
    logSecurityEvent(
      "info",
      "RESET_PASSWORD_SUCCESS",
      {
        userId: tokenVerification.userId,
        duration: processingTime,
      },
      req
    );

    logInfo("Password reset successful", {
      ip,
      userId: tokenVerification.userId,
      processingTime,
    });

    return NextResponse.json(
      {
        message:
          "Password reset successful. You can now login with your new password.",
        success: true,
        redirectTo: "/auth/login",
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

    // Handle specific reset errors
    if (error instanceof Error) {
      if (
        error.message.includes("Token not found") ||
        error.message.includes("expired")
      ) {
        logInfo("Invalid/expired token attempt", {
          ip,
          processingTime,
          errorMessage: error.message,
        });

        return NextResponse.json(
          {
            error:
              "Invalid or expired reset token. Please request a new password reset link.",
            code: "TOKEN_INVALID",
            redirectTo: "/auth/forgot-password",
          },
          { status: 400 }
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
      logError(error, "Unhandled reset password error", {
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

    // Log unexpected errors
    logSecurityEvent(
      "error",
      "RESET_PASSWORD_UNEXPECTED_ERROR",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        duration: processingTime,
      },
      req
    );

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
export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  logInfo("Unsupported GET request to reset-password endpoint", { ip });
  logSecurityEvent(
    "warn",
    "RESET_PASSWORD_METHOD_NOT_ALLOWED",
    {
      method: "GET",
      path: req.nextUrl.pathname,
    },
    req
  );

  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function PUT(req: NextRequest) {
  const ip = getClientIP(req);
  logInfo("Unsupported PUT request to reset-password endpoint", { ip });
  logSecurityEvent(
    "warn",
    "RESET_PASSWORD_METHOD_NOT_ALLOWED",
    {
      method: "PUT",
      path: req.nextUrl.pathname,
    },
    req
  );

  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIP(req);
  logInfo("Unsupported DELETE request to reset-password endpoint", { ip });
  logSecurityEvent(
    "warn",
    "RESET_PASSWORD_METHOD_NOT_ALLOWED",
    {
      method: "DELETE",
      path: req.nextUrl.pathname,
    },
    req
  );

  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIP(req);
  logInfo("Unsupported PATCH request to reset-password endpoint", { ip });
  logSecurityEvent(
    "warn",
    "RESET_PASSWORD_METHOD_NOT_ALLOWED",
    {
      method: "PATCH",
      path: req.nextUrl.pathname,
    },
    req
  );

  return NextResponse.json(
    { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    }
  );
}
