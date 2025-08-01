import bcrypt from "bcrypt";
import { randomBytes } from "crypto";


export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Email masking utility for verification page
export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;

  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${"*".repeat(localPart.length)}@${domain}`;
  }

  const visibleStart = localPart.slice(0, 1);
  const visibleEnd = localPart.slice(-1);
  const maskedMiddle = "*".repeat(Math.max(localPart.length - 2, 1));

  return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
};

// Server-side environment utilities
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getEventUrl(slug: string): string {
  return `${getBaseUrl()}/events/${slug}`;
}

export function getEventShareUrl(slug: string): string {
  return `${getBaseUrl()}/e/${slug}`;
}

// Server-side error logging
export function logServerError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] ${context ? `[${context}] ` : ""}${message}`);
  if (stack && process.env.NODE_ENV === "development") {
    console.error(stack);
  }
}

// Generate secure tokens for server-side operations
export async function generateSecureToken(length: number = 32): Promise<string> {
  return randomBytes(length).toString("hex");
}

// Server-side request rate limiting helper
export function createRateLimiter(windowMs: number, maxRequests: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return {
    checkLimit: (
      identifier: string
    ): { allowed: boolean; remaining: number } => {
      const now = Date.now();
      const current = requests.get(identifier);

      if (!current || now > current.resetTime) {
        requests.set(identifier, {
          count: 1,
          resetTime: now + windowMs,
        });
        return { allowed: true, remaining: maxRequests - 1 };
      }

      if (current.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }

      current.count++;
      return { allowed: true, remaining: maxRequests - current.count };
    },

    reset: (identifier: string): void => {
      requests.delete(identifier);
    },
  };
}
