// src/app/(auth)/auth/error/page.tsx - Replace the entire file
import { Suspense } from "react";
import AuthErrorPage from "@/components/auth/AuthError";

function AuthErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-gray-300 rounded mx-auto mb-4 w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded mx-auto mb-6 w-full"></div>
              <div className="h-10 bg-gray-300 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<AuthErrorFallback />}>
      <AuthErrorPage />
    </Suspense>
  );
}
