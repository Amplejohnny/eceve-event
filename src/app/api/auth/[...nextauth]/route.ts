import { authOptions } from "@/lib/auth-config";
import NextAuth from "next-auth";

// NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
      emailVerified?: Date | null;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role?: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
    emailVerified?: Date | null;
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
