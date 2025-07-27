"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({
  children,
}: AuthProviderProps): React.JSX.Element {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
// This component wraps the children with the NextAuth SessionProvider to manage authentication state.
// It allows the use of authentication features throughout the application.
