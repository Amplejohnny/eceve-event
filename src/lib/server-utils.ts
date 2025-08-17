import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "./db";

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
export async function generateSecureToken(
  length: number = 32
): Promise<string> {
  return randomBytes(length).toString("hex");
}

// Server-side function to fetch event data
export async function getEvent(slug: string) {
  try {
    const event = await db.event.findUnique({
      where: {
        slug: slug,
        status: "ACTIVE",
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
          },
        },
      },
    });

    return event;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}
