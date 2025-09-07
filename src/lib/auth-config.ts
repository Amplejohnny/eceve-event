import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { sendVerificationRequest } from "@/lib/email";

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

// Helper function to get admin emails (supports both single and multiple)
function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.trim()
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : process.env.ADMIN_EMAIL
    ? [process.env.ADMIN_EMAIL.toLowerCase()]
    : [];
}

// Helper function to check if email is admin
function isAdminEmail(email: string): boolean {
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.toLowerCase());
}

// Helper function to check and upgrade admin user
async function checkAndUpgradeAdmin(email: string) {
  if (isAdminEmail(email)) {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, role: true, emailVerified: true, isActive: true },
    });

    if (user && user.role !== "ADMIN") {
      console.log(`Upgrading user ${email} to ADMIN role`);
      await db.user.update({
        where: { email: email.toLowerCase() },
        data: {
          role: "ADMIN",
          emailVerified: user.emailVerified || new Date(),
          isActive: true,
        },
      });
      return true;
    }
  }
  return false;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 10 * 24 * 60 * 60,
  },
  providers: [
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

        const email = credentials.email.toLowerCase().trim();

        try {
          // Check and upgrade admin before getting user
          await checkAndUpgradeAdmin(email);

          // Since validation is already done by the API route,
          // we just need to get the user for session creation
          const user = await db.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
              emailVerified: true,
            },
          });

          if (!user || !user.isActive || !user.emailVerified) {
            return null;
          }

          // Return user object for session creation
          return {
            id: user.id,
            email: user.email || "",
            name: user.name || undefined,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          console.error("Error during authorize:", error);
          return null;
        }
      },
    }),

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
      maxAge: 30 * 60,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (!user.email) {
          console.error("Sign in failed: No email provided");
          return false;
        }

        // Handle credentials provider sign-ins (main login method)
        if (account?.provider === "credentials") {
          return true;
        }

        // Handle email provider sign-ins (ONLY for email verification after registration)
        if (account?.provider === "email") {
          // Check if this is an admin email
          if (isAdminEmail(user.email)) {
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
      if (user && account) {
        // Validate email exists
        if (!user.email) {
          console.error("JWT callback failed: No email provided");
          return token;
        }

        // Check and upgrade admin user if needed
        await checkAndUpgradeAdmin(user.email);

        const dbUser = await db.user.findUnique({
          where: { email: user.email },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.emailVerified = dbUser.emailVerified;
        }
      }

      // Handle session updates and check for admin upgrades
      if (trigger === "update" || !token.role) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
        });

        if (dbUser) {
          // Check if this user should be admin
          if (isAdminEmail(dbUser.email) && dbUser.role !== "ADMIN") {
            await db.user.update({
              where: { id: dbUser.id },
              data: {
                role: "ADMIN",
                emailVerified: dbUser.emailVerified || new Date(),
                isActive: true,
              },
            });
            token.role = "ADMIN";
          } else {
            token.role = dbUser.role;
          }

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

      // Check if this is admin email during user creation
      if (user.email && isAdminEmail(user.email)) {
        console.log(`Admin user detected during creation: ${user.email}`);
        await checkAndUpgradeAdmin(user.email);
      }
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
