// src/app/auth/verify-request/page.tsx
import { Suspense } from "react";
import VerifyRequestPage from "@/components/auth/VerifyRequest";

export const metadata = {
  title: "Verify Your Email - Eventify",
  description:
    "Check your email and click the verification link to complete your account setup.",
};

export default function VerifyRequest() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      }
    >
      <VerifyRequestPage />
    </Suspense>
  );
}
