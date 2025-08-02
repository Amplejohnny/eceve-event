"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Clock,
  RefreshCw,
  Home,
  CheckCircle,
  AlertCircle,
  Shield,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { maskEmail } from "@/lib/utils";

interface ErrorObject {
  message?: string;
  name?: string;
}

interface LogData {
  timestamp: string;
  context: string;
  error: {
    message: string;
    name: string;
  };
  metadata?: Record<string, unknown>;
  userAgent: string;
  url: string;
}

interface ApiErrorResponse {
  error?: string;
  code?: string;
  fieldErrors?: {
    email?: string;
  };
  retryAfter?: number;
  resetIn?: number;
}

// Client-side error logging utility
const logClientError = (
  error: ErrorObject | Error | unknown,
  context: string,
  metadata?: Record<string, unknown>
): void => {
  const errorObj = error instanceof Error ? error : (error as ErrorObject);
  const logData: LogData = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: errorObj?.message || String(error),
      name: errorObj?.name || "Unknown",
    },
    metadata,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error(`[VERIFY_REQUEST_CLIENT_ERROR] ${context}:`, logData);

  // In production, send to logging service
  // sendToClientLoggingService(logData);
};

const VerifyRequestPage = (): React.JSX.Element => {
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [countdown, setCountdown] = useState(100);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [networkError, setNetworkError] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState("");

  // Enhanced email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return (): void => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Enhanced error handling for API responses
  const handleApiError = (data: ApiErrorResponse, response: Response): void => {
    logClientError(
      new Error(`API Error: ${response.status} ${response.statusText}`),
      "Resend verification API error",
      {
        status: response.status,
        statusText: response.statusText,
        responseData: data,
        resendAttempt: resendAttempts + 1,
        email: !!email,
      }
    );

    if (data.fieldErrors) {
      setEmailValidationError(data.fieldErrors.email || "");
    } else {
      const errorMessage =
        data.error || "Failed to resend verification email. Please try again.";
      setResendMessage(errorMessage);

      // Handle specific error codes
      switch (data.code) {
        case "RATE_LIMITED":
          if (data.resetIn) {
            const resetTime = Math.min(data.resetIn, 300); // Max 5 minutes
            setCountdown(resetTime);
            setCanResend(false);
          }
          break;
        case "EMAIL_NOT_FOUND":
          break;
        case "ALREADY_VERIFIED":
          break;
        case "EMAIL_SEND_FAILED":
          break;
        case "INVALID_EMAIL":
          setEmailValidationError("Please enter a valid email address");
          break;
      }
    }
  };

  // Enhanced resend email handler
  const handleResendEmail = async (): Promise<void> => {
    const attemptNumber = resendAttempts + 1;
    setResendAttempts(attemptNumber);

    // Client-side validation
    if (!email) {
      setEmailValidationError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setEmailValidationError("Please enter a valid email address");
      return;
    }

    if (!canResend || isResending) {
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setEmailValidationError("");
    setNetworkError(false);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage(
          data.message || "Verification email sent successfully!"
        );
        setCountdown(data.resetIn || 100);
        setCanResend(false);
        setResendCount((prev) => prev + 1);
      } else {
        handleApiError(data, response);
      }
    } catch (error) {
      setNetworkError(true);

      logClientError(error, "Resend verification network error", {
        attempt: attemptNumber,
        isOnline: navigator.onLine,
        email: !!email,
      });

      if (!navigator.onLine) {
        setResendMessage(
          "You appear to be offline. Please check your internet connection and try again."
        );
      } else {
        setResendMessage(
          "Network error. Please check your connection and try again."
        );
      }
    } finally {
      setIsResending(false);
    }
  };

  // Enhanced email input handler
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newEmail = e.target.value.trim().slice(0, 255);
    setEmail(newEmail);

    // Clear validation errors when user starts typing
    if (emailValidationError) {
      setEmailValidationError("");
    }
    if (resendMessage) {
      setResendMessage("");
    }
    if (networkError) {
      setNetworkError(false);
    }
  };

  // Enhanced timer formatting
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const maskedEmail = maskEmail(email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Check Your Email
              </h1>
              <p className="text-blue-100 text-lg">Verification link sent!</p>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 space-y-6">
            {/* Email Display */}
            {email && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800 text-lg">
                    {maskedEmail}
                  </span>
                </div>
              </div>
            )}

            {/* Success Messages */}
            {resendMessage && (
              <div
                className={`p-4 rounded-2xl text-sm font-medium ${
                  resendMessage.includes("successfully") ||
                  resendMessage.includes("sent")
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200"
                    : networkError
                    ? "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200"
                    : "bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200"
                }`}
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center space-x-2">
                  {resendMessage.includes("successfully") ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span>{resendMessage}</span>
                </div>
              </div>
            )}

            {/* Email Validation Error */}
            {emailValidationError && (
              <div
                className="p-4 rounded-2xl text-sm font-medium bg-gradient-to-r from-red-50 to-pink-50 text-red-700 border border-red-200"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{emailValidationError}</span>
                </div>
              </div>
            )}

            {/* Instructions Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <h3 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
                <Sparkles className="w-5 h-5 mr-3 text-blue-600" />
                What's Next?
              </h3>
              <div className="space-y-3">
                {[
                  "Open your email inbox",
                  "Look for our verification email",
                  "Click the verification button",
                  "Complete your account setup",
                ].map((step, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-blue-800 font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Troubleshooting Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
              <h3 className="font-bold text-amber-900 mb-4 flex items-center text-lg">
                <AlertCircle className="w-5 h-5 mr-3 text-amber-600" />
                Don't See the Email?
              </h3>
              <div className="space-y-2 text-amber-800">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Check your spam/junk folder</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Verify your email address is correct</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span>Wait a few minutes for delivery</span>
                </div>
              </div>
            </div>

            {/* Countdown Timer */}
            {!canResend && countdown > 0 && (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800 font-mono">
                      {formatTime(countdown)}
                    </div>
                    <div className="text-sm text-gray-600">
                      until next resend
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email Input for Manual Entry */}
            {!email && (
              <div className="space-y-3">
                <label
                  htmlFor="manual-email"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Enter your email to resend verification:
                </label>
                <div className="relative">
                  <input
                    id="manual-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="your@email.com"
                    maxLength={255}
                    className={`w-full px-4 py-3 pr-12 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm ${
                      emailValidationError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-200"
                    }`}
                    aria-label="Email address"
                    autoComplete="email"
                    required
                  />
                  <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
              </div>
            )}

            {/* Resend Button */}
            <button
              onClick={handleResendEmail}
              disabled={
                !canResend || isResending || !email || !!emailValidationError
              }
              className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform ${
                canResend && !isResending && email && !emailValidationError
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              } flex items-center justify-center space-x-3`}
              aria-label={
                isResending
                  ? "Sending verification email"
                  : "Resend verification email"
              }
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>
                    {resendCount > 0 ? "Send Again" : "Resend Verification"}
                  </span>
                </>
              )}
            </button>

            {/* Support Message for Multiple Attempts */}
            {resendCount > 2 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-800 mb-1">
                      Still having trouble?
                    </p>
                    <p className="text-orange-700">
                      Contact our support team at{" "}
                      <a
                        href="mailto:support@eventify.com"
                        className="font-semibold underline hover:text-orange-600 transition-colors"
                      >
                        support@eventify.com
                      </a>{" "}
                      for assistance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Section */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-6 border-t border-gray-100">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <Shield className="w-4 h-4" />
                <span className="text-sm">
                  Verification links expire in 30 minutes
                </span>
              </div>

              <Link
                href="/"
                className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-semibold py-3 px-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                <span>Return to Homepage</span>
              </Link>

              <p className="text-xs text-gray-400 mt-4">
                You can safely close this page after verification
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyRequestPage;
