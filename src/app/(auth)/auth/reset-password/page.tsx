// src/app/(auth)/auth/reset-password/page.tsx - Replace the entire file
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

function ResetPasswordFallback() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left side - Welcome section */}
        <div className="hidden lg:flex lg:w-1/2 p-8 lg:p-12 xl:p-16 flex-col justify-center bg-slate-900">
          <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-[#ffe047] text-xl font-semibold">
                Eventify
              </span>
            </div>
          </div>
          <div className="flex flex-col justify-center h-full max-w-md">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-700 rounded mb-4 w-3/4"></div>
              <div className="h-8 bg-gray-700 rounded mb-4 w-1/2"></div>
            </div>
          </div>
        </div>

        {/* Right side - Form section */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
          <div className="w-full max-w-md">
            <div className="animate-pulse">
              {/* Header */}
              <div className="hidden lg:block mb-8">
                <div className="h-8 bg-gray-300 rounded mb-2 w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-gray-300 rounded mb-2 w-1/4"></div>
                  <div className="h-10 bg-gray-300 rounded w-full"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-300 rounded mb-2 w-1/3"></div>
                  <div className="h-10 bg-gray-300 rounded w-full"></div>
                </div>
                <div className="h-10 bg-gray-300 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
