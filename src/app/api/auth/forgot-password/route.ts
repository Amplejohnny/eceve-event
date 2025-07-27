import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPasswordResetRequest } from "@/lib/auth";
import { z } from "zod";

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number; blocked: boolean }
>();

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email format")
    .min(1, "Email is required")
    .max(255, "Email too long")
    .transform((email) => email.toLowerCase().trim()),
});

// Enhanced rate limiting with IP and email tracking
function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to cleanup
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!current || now > current.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
      blocked: false,
    });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: now + windowMs,
    };
  }

  if (current.count >= maxAttempts) {
    current.blocked = true;
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetTime: current.resetTime,
  };
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}

// Logging utility
function createSecurityLog(
  level: "info" | "warn" | "error",
  action: string,
  details: Record<string, unknown>,
  request: NextRequest
) {
  const timestamp = new Date().toISOString();
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  const logEntry = {
    timestamp,
    level,
    action,
    ip,
    userAgent,
    ...details,
  };

  // In production, send to your logging service (e.g., Winston, Pino, etc.)
  console.log(`[SECURITY:${level.toUpperCase()}]`, JSON.stringify(logEntry));

  return logEntry;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const ip = getClientIP(request);
  let body; // Declare body here so it's accessible in catch block

  try {
    // Log incoming request
    createSecurityLog(
      "info",
      "FORGOT_PASSWORD_REQUEST",
      {
        requestId,
        method: "POST",
      },
      request
    );

    // Parse request body
    try {
      body = await request.json();
    } catch {
      createSecurityLog(
        "warn",
        "FORGOT_PASSWORD_INVALID_JSON",
        {
          requestId,
          error: "Invalid JSON in request body",
        },
        request
      );

      return NextResponse.json(
        {
          success: false,
          message: "Invalid request format",
          requestId,
        },
        { status: 400 }
      );
    }

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      createSecurityLog(
        "warn",
        "FORGOT_PASSWORD_VALIDATION_FAILED",
        {
          requestId,
          errors,
          providedEmail: body?.email ? "provided" : "missing",
        },
        request
      );

      return NextResponse.json(
        {
          success: false,
          message: "Invalid email address",
          errors,
          requestId,
        },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Rate limiting by IP
    const ipRateLimit = checkRateLimit(`ip:${ip}`, 10, 15 * 60 * 1000); // 10 attempts per 15 min per IP
    if (!ipRateLimit.allowed) {
      createSecurityLog(
        "warn",
        "FORGOT_PASSWORD_IP_RATE_LIMITED",
        {
          requestId,
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"), // Mask email in logs
          rateLimitKey: `ip:${ip}`,
          resetTime: new Date(ipRateLimit.resetTime).toISOString(),
        },
        request
      );

      return NextResponse.json(
        {
          success: false,
          message: "Too many requests from this IP. Please try again later.",
          retryAfter: Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000),
          requestId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (ipRateLimit.resetTime - Date.now()) / 1000
            ).toString(),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": ipRateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              ipRateLimit.resetTime / 1000
            ).toString(),
          },
        }
      );
    }

    // Rate limiting by email
    const emailRateLimit = checkRateLimit(`email:${email}`, 3, 60 * 60 * 1000); // 3 attempts per hour per email
    if (!emailRateLimit.allowed) {
      createSecurityLog(
        "warn",
        "FORGOT_PASSWORD_EMAIL_RATE_LIMITED",
        {
          requestId,
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          rateLimitKey: `email:${email}`,
          resetTime: new Date(emailRateLimit.resetTime).toISOString(),
        },
        request
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Too many password reset requests for this email. Please try again later.",
          retryAfter: Math.ceil((emailRateLimit.resetTime - Date.now()) / 1000),
          requestId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (emailRateLimit.resetTime - Date.now()) / 1000
            ).toString(),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": emailRateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              emailRateLimit.resetTime / 1000
            ).toString(),
          },
        }
      );
    }

    // Additional security checks
    const suspiciousPatterns = [
      /^test.*@.*$/i,
      /^admin.*@.*$/i,
      /^root.*@.*$/i,
      /.*\+.*@.*$/, // Plus addressing might indicate testing
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      pattern.test(email)
    );
    if (isSuspicious) {
      createSecurityLog(
        "warn",
        "FORGOT_PASSWORD_SUSPICIOUS_EMAIL",
        {
          requestId,
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          pattern: "suspicious_pattern_detected",
        },
        request
      );

      // Still process but log for monitoring
    }

    // Process password reset request
    createSecurityLog(
      "info",
      "FORGOT_PASSWORD_PROCESSING",
      {
        requestId,
        email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
      },
      request
    );

    const success = await createPasswordResetRequest(email);
    const processingTime = Date.now() - startTime;

    if (success) {
      createSecurityLog(
        "info",
        "FORGOT_PASSWORD_SUCCESS",
        {
          requestId,
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          processingTimeMs: processingTime,
        },
        request
      );

      // Always return the same response for security (timing attack prevention)
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, we've sent you a password reset link.",
          requestId,
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit-IP": "10",
            "X-RateLimit-Remaining-IP": ipRateLimit.remaining.toString(),
            "X-RateLimit-Limit-Email": "3",
            "X-RateLimit-Remaining-Email": emailRateLimit.remaining.toString(),
          },
        }
      );
    } else {
      createSecurityLog(
        "error",
        "FORGOT_PASSWORD_FAILED",
        {
          requestId,
          email: email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          processingTimeMs: processingTime,
          reason: "createPasswordResetRequest_returned_false",
        },
        request
      );

      // Still return success message for security
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, we've sent you a password reset link.",
          requestId,
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit-IP": "10",
            "X-RateLimit-Remaining-IP": ipRateLimit.remaining.toString(),
            "X-RateLimit-Limit-Email": "3",
            "X-RateLimit-Remaining-Email": emailRateLimit.remaining.toString(),
          },
        }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    createSecurityLog(
      "error",
      "FORGOT_PASSWORD_INTERNAL_ERROR",
      {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        processingTimeMs: processingTime,
      },
      request
    );

    // Log error details for debugging (remove in production logs)
    console.error("[FORGOT_PASSWORD_ERROR]", {
      requestId,
      error,
      body: body ? { email: body.email ? "provided" : "missing" } : "no_body",
    });

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred. Please try again later.",
        requestId,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
