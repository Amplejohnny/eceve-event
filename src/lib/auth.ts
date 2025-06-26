import { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth/next";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./db";
import {
  sendVerificationRequest,
  sendWelcomeEmail,
  sendPasswordResetEmail,
} from "./email";
import { hashPassword, verifyPassword } from "./utils";
import { randomBytes } from "crypto";
import { NextApiRequest } from "next";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
    emailVerified: Date | null;
  }
}

// Add this near the top after imports
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
          return null;
        }

        try {
          // Find user by email
          const user = await db.user.findUnique({
            where: { email: credentials.email.toLowerCase() },
          });

          if (!user || !user.isActive || !user.password) {
            return null;
          }

          // Verify password
          const isValidPassword = await verifyPassword(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            return null;
          }

          // Check if email is verified
          if (!user.emailVerified) {
            // User exists, password is correct, but email is not verified
            // Automatically send a new verification email
            try {
              await resendVerificationEmail(user.email);
              console.log(`Verification email resent to ${user.email}`);
            } catch (error) {
              console.error("Failed to resend verification email:", error);
            }

            // Return null to prevent login, but email has been sent
            return null;
          }

          // Return user object (password excluded for security)
          return {
            id: user.id,
            email: user.email || "",
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("Credentials authorization error:", error);
          return null;
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
          where: { id: token.id },
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

      // Handle sign-in redirects
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

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
  },
  debug: process.env.NODE_ENV === "development",
};

// Password Reset Functions (integrated with sendPasswordResetEmail)
export async function generatePasswordResetToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetRequest(
  email: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true,
        emailVerified: true,
      },
    });

    // Only send reset email to verified users with passwords
    if (!user || !user.password || !user.isActive || !user.emailVerified) {
      // Don't reveal if user exists for security
      return true;
    }

    const resetToken = await generatePasswordResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (you'll need to add these fields to User model)
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail({
      email: user.email,
      resetUrl,
    });

    console.log(`Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error("Error creating password reset request:", error);
    return false;
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isActive: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid or expired reset token",
      };
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    console.log(`Password reset successful for user: ${user.email}`);
    return {
      success: true,
      message: "Password reset successful",
    };
  } catch (error) {
    console.error("Error resetting password:", error);
    return {
      success: false,
      message: "Failed to reset password",
    };
  }
}

// Registration function - creates user and triggers NextAuth email verification
export async function registerUser(
  email: string,
  password: string,
  name?: string
) {
  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      password: hashedPassword,
      role: "USER",
      emailVerified: null,
      isActive: true,
    },
  });

  // This creates a verification token in the verification_token table automatically
  try {
    // Validate required environment variables
    if (
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS
    ) {
      throw new Error("SMTP configuration is missing");
    }

    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
    if (!fromEmail) {
      throw new Error("FROM_EMAIL or SMTP_USER must be configured");
    }

    // Create a verification token record using NextAuth's system
    const identifier = newUser.email;
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // NextAuth will handle this through the verification_token table
    await db.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });

    // Send the verification email
    const nextAuthUrl = process.env.NEXTAUTH_URL || "";
    const verificationUrl = `${nextAuthUrl}/api/auth/callback/email?callbackUrl=${encodeURIComponent(
      nextAuthUrl
    )}&token=${token}&email=${encodeURIComponent(identifier)}`;

    await sendVerificationRequest({
      identifier,
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
        from: fromEmail,
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

    console.log(`Verification email sent to ${newUser.email}`);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }

  return newUser;
}

//login function for existing users
export async function loginUser(email: string, password: string) {

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.isActive) {
    throw new Error("User not found or inactive");
  }

  if (!user.password) {
    throw new Error("User not found or inactive");
  }

  const isValidPassword = await verifyPassword(password, user.password);

  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  if (!user.emailVerified) {
    // Automatically send a new verification email
    try {
      await resendVerificationEmail(user.email);
      console.log(`Verification email resent to ${user.email}`);
    } catch (error) {
      console.error("Failed to resend verification email:", error);
    }
    throw new Error("Email not verified. A verification email has been sent.");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

// Function to resend verification email to existing users
export async function resendVerificationEmail(email: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.emailVerified) {
      // Don't send if user doesn't exist or is already verified
      return false;
    }

    // Check if there's already a recent verification token
    const existingToken = await db.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase(),
        expires: {
          gt: new Date(), // Still valid
        },
      },
      orderBy: {
        expires: "desc",
      },
    });

    let token: string;
    let expires: Date;

    if (existingToken) {
      // Use existing token if it's still valid
      token = existingToken.token;
      expires = existingToken.expires;
    } else {
      // Create new token
      token = randomBytes(32).toString("hex");
      expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Delete any expired tokens first
      await db.verificationToken.deleteMany({
        where: {
          identifier: email.toLowerCase(),
          expires: {
            lt: new Date(),
          },
        },
      });

      // Create new verification token
      await db.verificationToken.create({
        data: {
          identifier: email.toLowerCase(),
          token,
          expires,
        },
      });
    }

    // Send the verification email
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

    console.log(`Verification email resent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error resending verification email:", error);
    return false;
  }
}

// Helper functions for authentication
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCurrentUser(req: NextApiRequest) {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

export async function requireAuth(
  req: NextApiRequest,
  requiredRole?: "USER" | "ORGANIZER" | "ADMIN"
) {
  const user = await getCurrentUser(req);

  if (!user) {
    throw new Error("Authentication required");
  }

  if (!user.emailVerified) {
    throw new Error("Email verification required");
  }

  if (requiredRole) {
    const roleHierarchy = {
      USER: 1,
      ORGANIZER: 2,
      ADMIN: 3,
    };

    const userLevel =
      roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      throw new Error("Insufficient permissions");
    }
  }

  return user;
}

export async function requireEmailVerification(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.emailVerified) {
    throw new Error("Email verification required");
  }

  return user;
}

export async function updateUserRole(
  userId: string,
  role: "USER" | "ORGANIZER" | "ADMIN"
) {
  return await db.user.update({
    where: { id: userId },
    data: { role },
  });
}

export async function verifyUserEmail(userId: string) {
  return await db.user.update({
    where: { id: userId },
    data: {
      emailVerified: new Date(),
      isActive: true,
    },
  });
}

export async function deactivateUser(userId: string) {
  return await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}

export async function reactivateUser(userId: string) {
  return await db.user.update({
    where: { id: userId },
    data: { isActive: true },
  });
}

// Helper function to update user password
export async function updateUserPassword(userId: string, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword);

  return await db.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

// Helper function to check if user exists and their verification status
export async function getUserStatus(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      emailVerified: true,
      password: true,
      isActive: true,
    },
  });

  if (!user) {
    return {
      exists: false,
      verified: false,
      hasPassword: false,
      active: false,
    };
  }

  return {
    exists: true,
    verified: !!user.emailVerified,
    hasPassword: !!user.password,
    active: user.isActive,
  };
}

// Function to check what authentication method user should use
export async function getAuthMethodForUser(
  email: string
): Promise<"credentials" | "magic-link" | "register"> {
  const status = await getUserStatus(email);

  if (!status.exists) {
    return "register"; // User needs to register first
  }

  if (!status.verified && status.hasPassword) {
    return "magic-link"; // User registered but needs email verification
  }

  if (status.verified && status.hasPassword && status.active) {
    return "credentials"; // User can login with email/password
  }

  return "register"; // Fallback to registration
}

// Utility function to check user permissions
export function hasPermission(
  userRole: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN",
  requiredRole: "USER" | "ORGANIZER" | "ADMIN"
): boolean {
  const roleHierarchy = {
    VISITOR: 0,
    USER: 1,
    ORGANIZER: 2,
    ADMIN: 3,
  };

  const userLevel = roleHierarchy[userRole];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

// Email masking utility for verification page
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (localPart.length <= 4) {
    return `${"x".repeat(localPart.length)}@${domain}`;
  }

  const visibleChars = localPart.slice(-4);
  const maskedChars = "x".repeat(localPart.length - 4);

  return `${maskedChars}${visibleChars}@${domain}`;
}
