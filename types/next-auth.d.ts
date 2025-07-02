// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    emailVerified?: boolean;
  }
}
