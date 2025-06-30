"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
// This component wraps the children with the NextAuth SessionProvider to manage authentication state.
// It allows the use of authentication features throughout the application.
