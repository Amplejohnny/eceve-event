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
