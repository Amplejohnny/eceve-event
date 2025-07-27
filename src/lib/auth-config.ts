import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { sendVerificationRequest, sendWelcomeEmail } from "@/lib/email";
import { verifyPassword } from "@/lib/utils";
import { randomBytes } from "crypto";

export class AuthError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

// Enhanced rate limiting for NextAuth
const loginAttempts = new Map<
  string,
  { count: number; resetTime: number; blocked: boolean }
>();

function checkRateLimit(email: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // Stricter for NextAuth

  const current = loginAttempts.get(email);

  if (!current || now > current.resetTime) {
    loginAttempts.set(email, {
      count: 1,
      resetTime: now + windowMs,
      blocked: false,
    });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (current.count >= maxAttempts) {
    current.blocked = true;
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxAttempts - current.count };
}

// Environment variables check
const requiredEnvVars = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn(`Missing environment variables: ${missingVars.join(", ")}`);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    // Main credentials provider for all user logins
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "your@email.com",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new AuthError(
            "Email and password are required",
            "MISSING_CREDENTIALS"
          );
        }

        const email = credentials.email.toLowerCase().trim();

        // Rate limiting check
        const rateLimit = checkRateLimit(email);
        if (!rateLimit.allowed) {
          throw new AuthError(
            "Too many login attempts. Please try again later.",
            "RATE_LIMITED"
          );
        }

        try {
          // Find user by email
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.isActive || !user.password) {
            throw new AuthError(
              "Invalid email or password",
              "INVALID_CREDENTIALS"
            );
          }

          // Verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            throw new AuthError(
              "Invalid email or password",
              "INVALID_CREDENTIALS"
            );
          }

          // Check if email is verified
          if (!user.emailVerified) {
            // User exists, password is correct, but email is not verified
            // Automatically send a new verification email
            try {
              await resendVerificationEmailInternal(user.email);
              console.log(`Verification email resent to ${user.email}`);
            } catch (error) {
              console.error("Failed to resend verification email:", error);
            }

            throw new AuthError(
              "Please verify your email address before logging in. We've sent you a new verification link.",
              "EMAIL_NOT_VERIFIED"
            );
          }

          // Return user object (password excluded for security)
          return {
            id: user.id,
            email: user.email || "",
            name: user.name || undefined,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          // Re-throw AuthErrors to preserve error codes
          if (error instanceof AuthError) {
            throw error;
          }

          // Log unexpected errors
          console.error(
            "Unexpected error during credentials authorization:",
            error
          );
          throw new AuthError(
            "Authentication failed. Please try again.",
            "AUTH_ERROR"
          );
        }
      },
    }),

    // Email provider ONLY for initial email verification during registration
    // This is NOT used for regular login - only for verifying new accounts
    EmailProvider({
      server: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      sendVerificationRequest,
      maxAge: 30 * 60, // 30 minutes expiry for verification links
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Handle credentials provider sign-ins (main login method)
        if (account?.provider === "credentials") {
          return true;
        }

        // Handle email provider sign-ins (ONLY for email verification after registration)
        if (account?.provider === "email") {
          // Check if this is the admin email
          if (user.email === process.env.ADMIN_EMAIL) {
            const existingUser = await db.user.findUnique({
              where: { email: user.email },
            });

            if (!existingUser) {
              // Create admin user
              await db.user.create({
                data: {
                  email: user.email || "",
                  name: user.name || "Admin",
                  role: "ADMIN",
                  emailVerified: new Date(),
                  isActive: true,
                },
              });
            } else if (existingUser.role !== "ADMIN") {
              // Update existing user to admin
              await db.user.update({
                where: { email: user.email },
                data: {
                  role: "ADMIN",
                  emailVerified: new Date(),
                  isActive: true,
                },
              });
            }
            return true;
          }

          // For regular users - this should only happen during email verification
          const existingUser = await db.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser && !existingUser.emailVerified) {
            // This is email verification for a registered user
            await db.user.update({
              where: { email: user.email },
              data: {
                emailVerified: new Date(),
                isActive: true,
              },
            });

            // Send welcome email after email verification
            try {
              await sendWelcomeEmail({
                email: user.email || "",
                name: existingUser.name || "User",
              });
            } catch (error) {
              console.error("Failed to send welcome email:", error);
            }

            return true;
          }

          // Prevent magic link login for already verified users
          // They should use credentials instead
          return false;
        }

        return false;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },

    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user && account) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
        }
      }

      // Handle session updates
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
          token.name = dbUser.name;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.emailVerified = token.emailVerified;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle email verification callback
      if (url.includes("/api/auth/callback/email")) {
        return `${baseUrl}/auth/email-verified`;
      }

      // Handle successful login redirects
      if (url.includes("/api/auth/login") || url === "/auth/login") {
        return `${baseUrl}`;
      }

      // Handle sign-in redirects
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      // Handle same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  events: {
    async createUser({ user }) {
      console.log(`User created: ${user.email}`);
    },
    async signIn({ user, account }) {
      console.log(`User signed in: ${user.email} via ${account?.provider}`);
    },
    async signOut({ token }) {
      console.log(`User signed out: ${token?.email}`);
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Internal function to resend verification email to avoid circular dependency
async function resendVerificationEmailInternal(
  email: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.emailVerified) {
      return false;
    }

    // Check if there's already a recent verification token
    const existingToken = await db.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase(),
        expires: {
          gt: new Date(),
        },
      },
      orderBy: {
        expires: "desc",
      },
    });

    let token: string;
    let expires: Date;

    if (existingToken) {
      token = existingToken.token;
      expires = existingToken.expires;
    } else {
      token = randomBytes(32).toString("hex");
      expires = new Date(Date.now() + 30 * 60 * 1000);

      await db.verificationToken.deleteMany({
        where: {
          identifier: email.toLowerCase(),
          expires: {
            lt: new Date(),
          },
        },
      });

      await db.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token,
          expires,
        },
      });
    }

    const nextAuthUrl = process.env.NEXTAUTH_URL || "";
    const verificationUrl = `${nextAuthUrl}/api/auth/callback/email?callbackUrl=${encodeURIComponent(
      nextAuthUrl
    )}&token=${token}&email=${encodeURIComponent(email.toLowerCase())}`;

    await sendVerificationRequest({
      identifier: email.toLowerCase(),
      url: verificationUrl,
      provider: {
        id: "email",
        type: "email",
        name: "Email",
        server: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
        from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
        maxAge: 30 * 60,
        options: {},
        sendVerificationRequest,
      },
      expires,
      token: "",
      theme: {
        brandColor: "#346df1",
        buttonText: "#fff",
      },
    });

    return true;
  } catch (error) {
    console.error("Error resending verification email:", error);
    return false;
  }
}
