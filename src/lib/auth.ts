import { getServerSession } from "next-auth/next";
import { db } from "./db";
import {
  sendVerificationRequest,
  sendPasswordResetEmail,
} from "./email";
import { hashPassword } from "./utils";
import { randomBytes } from "crypto";
import { NextApiRequest } from "next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";


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

//verify password reset token
export async function verifyPasswordResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string }> {
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(), // Check if token is still valid
      },
      isActive: true,
    },
    select: { id: true },
  });

  if (user) {
    return { valid: true, userId: user.id };
  }

  return { valid: false };
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
