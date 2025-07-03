"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  Clock,
  RefreshCw,
  Home,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Client-side logging utility
const logClientError = (
  error: any,
  context: string,
  metadata?: Record<string, any>
) => {
  const logData = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      message: error.message || String(error),
      name: error.name || "Unknown",
    },
    metadata,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  console.error(`[VERIFY_REQUEST_CLIENT_ERROR] ${context}:`, logData);

  // In production, send to logging service
  // sendToClientLoggingService(logData);
};

const logClientInfo = (message: string, metadata?: Record<string, any>) => {
  console.log(
    `[VERIFY_REQUEST_CLIENT_INFO] ${new Date().toISOString()}: ${message}`,
    metadata || {}
  );
};

const VerifyRequestPage = () => {
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
    const isValid = emailRegex.test(email) && email.length <= 255;

    logClientInfo("Email validation in verify request", {
      isValid,
      emailLength: email.length,
      hasAtSymbol: email.includes("@"),
      hasDot: email.includes("."),
    });

    return isValid;
  };

  // Log component initialization
  useEffect(() => {
    logClientInfo("VerifyRequest component initialized", {
      hasEmailParam: !!emailParam,
      emailSource: emailParam ? "url_param" : "manual_entry",
      initialCountdown: countdown,
    });

    // Track user session start
    const sessionStart = Date.now();

    return () => {
      const sessionDuration = Date.now() - sessionStart;
      logClientInfo("VerifyRequest component unmounted", {
        sessionDuration,
        resendCount,
        resendAttempts,
        finalEmail: !!email,
      });
    };
  }, []);

  // Mask email for privacy
  const maskEmail = (email: string): string => {
    if (!email || !email.includes("@")) return email;

    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) {
      return `${"*".repeat(localPart.length)}@${domain}`;
    }

    const visibleStart = localPart.slice(0, 1);
    const visibleEnd = localPart.slice(-1);
    const maskedMiddle = "*".repeat(Math.max(localPart.length - 2, 1));

    return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`;
  };

  // Enhanced countdown timer effect with logging
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
      logClientInfo("Resend timer completed", {
        resendCount,
        totalWaitTime: 100,
      });
    }
  }, [countdown, resendCount]);

  // Enhanced error handling for API responses
  const handleApiError = (data: any, response: Response) => {
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
      logClientInfo("Server validation errors received", {
        fieldErrors: Object.keys(data.fieldErrors),
      });
    } else {
      const errorMessage =
        data.error || "Failed to resend verification email. Please try again.";
      setResendMessage(errorMessage);

      // Handle specific error codes
      switch (data.code) {
        case "RATE_LIMITED":
          logClientInfo("Rate limited during resend", {
            retryAfter: data.retryAfter,
            resetIn: data.resetIn,
          });
          if (data.resetIn) {
            const resetTime = Math.min(data.resetIn, 300); // Max 5 minutes
            setCountdown(resetTime);
            setCanResend(false);
          }
          break;
        case "EMAIL_NOT_FOUND":
          logClientInfo("Email not found during resend");
          break;
        case "ALREADY_VERIFIED":
          logClientInfo("Email already verified");
          break;
        case "EMAIL_SEND_FAILED":
          logClientInfo("Email send failed during resend");
          break;
        case "INVALID_EMAIL":
          logClientInfo("Invalid email format during resend");
          setEmailValidationError("Please enter a valid email address");
          break;
        default:
          logClientInfo("Generic resend API error", { code: data.code });
      }
    }
  };

  // Enhanced resend email handler with comprehensive logging
  const handleResendEmail = async () => {
    const attemptNumber = resendAttempts + 1;
    setResendAttempts(attemptNumber);

    logClientInfo("Resend verification email started", {
      attempt: attemptNumber,
      hasEmail: !!email,
      emailValid: email ? validateEmail(email) : false,
      resendCount,
      timeSinceLastResend: canResend,
    });

    // Client-side validation
    if (!email) {
      const errorMsg = "Please enter your email address";
      setEmailValidationError(errorMsg);
      logClientInfo("Resend validation failed - no email", {
        attempt: attemptNumber,
      });
      return;
    }

    if (!validateEmail(email)) {
      const errorMsg = "Please enter a valid email address";
      setEmailValidationError(errorMsg);
      logClientInfo("Resend validation failed - invalid email", {
        attempt: attemptNumber,
        emailLength: email.length,
      });
      return;
    }

    if (!canResend || isResending) {
      logClientInfo("Resend blocked - not ready", {
        canResend,
        isResending,
        countdown,
      });
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setEmailValidationError("");
    setNetworkError(false);

    const requestStart = Date.now();

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const requestTime = Date.now() - requestStart;

      logClientInfo("Resend API request completed", {
        status: response.status,
        requestTime,
        attempt: attemptNumber,
      });

      const data = await response.json();

      if (response.ok) {
        logClientInfo("Resend verification successful", {
          requestTime,
          attempt: attemptNumber,
          newResendCount: resendCount + 1,
          resetCountdown: data.resetIn || 100,
        });

        setResendMessage(
          data.message || "Verification email sent successfully!"
        );
        setCountdown(data.resetIn || 100);
        setCanResend(false);
        setResendCount((prev) => prev + 1);

        // Track successful resend patterns
        if (resendCount >= 2) {
          logClientInfo("Multiple resend attempts detected", {
            totalResends: resendCount + 1,
            userMayNeedHelp: true,
          });
        }
      } else {
        handleApiError(data, response);
      }
    } catch (error) {
      const requestTime = Date.now() - requestStart;

      logClientError(error, "Resend verification network error", {
        requestTime,
        attempt: attemptNumber,
        isOnline: navigator.onLine,
        email: !!email,
      });

      setNetworkError(true);

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

  // Enhanced email input handler with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.trim().slice(0, 255); // Enforce length limit
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

    logClientInfo("Email input changed", {
      emailLength: newEmail.length,
      isValid: newEmail ? validateEmail(newEmail) : null,
    });
  };

  // Enhanced timer formatting
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Log component state changes
  useEffect(() => {
    logClientInfo("Component state update", {
      canResend,
      isResending,
      hasResendMessage: !!resendMessage,
      resendCount,
      countdown,
      hasEmail: !!email,
      networkError,
    });
  }, [
    canResend,
    isResending,
    resendMessage,
    resendCount,
    countdown,
    email,
    networkError,
  ]);

  const maskedEmail = maskEmail(email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8 text-center">
        {/* Header Icon */}
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check Your Email
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 mb-6">
          We've sent a verification link to your email address
        </p>

        {/* Email Display */}
        {email && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{maskedEmail}</span>
            </div>
          </div>
        )}

        {/* Main Instructions */}
        <div className="text-left bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Next Steps:
          </h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Open your email inbox and look for our verification email</li>
            <li>Click the "Verify Email Address" button in the email</li>
            <li>You'll be automatically redirected to complete setup</li>
            <li>Start discovering amazing events!</li>
          </ol>
        </div>

        {/* Troubleshooting */}
        <div className="text-left bg-amber-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Don't see the email?
          </h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure {maskedEmail || "your email"} is correct</li>
            <li>• Wait a few minutes for delivery</li>
            <li>• Request a new verification email below</li>
          </ul>
        </div>

        {/* Resend Section */}
        <div className="border-t pt-6">
          {/* Success/Error Messages */}
          {resendMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                resendMessage.includes("successfully") ||
                resendMessage.includes("sent")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : networkError
                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
              role="alert"
              aria-live="polite"
            >
              {resendMessage}
            </div>
          )}

          {/* Email Validation Error */}
          {emailValidationError && (
            <div
              className="mb-4 p-3 rounded-md text-sm bg-red-50 text-red-700 border border-red-200"
              role="alert"
              aria-live="polite"
            >
              {emailValidationError}
            </div>
          )}

          {/* Countdown Timer */}
          {!canResend && (
            <div className="flex items-center justify-center space-x-2 text-gray-500 mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Resend available in {formatTime(countdown)}
              </span>
            </div>
          )}

          {/* Email Input for Manual Entry */}
          {!email && (
            <div className="mb-4">
              <label
                htmlFor="manual-email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Enter your email address to resend verification:
              </label>
              <input
                id="manual-email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your@email.com"
                maxLength={255}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                  emailValidationError ? "border-red-500" : "border-gray-300"
                }`}
                aria-label="Email address"
                aria-describedby={
                  emailValidationError ? "email-error" : undefined
                }
                autoComplete="email"
                required
              />
            </div>
          )}

          {/* Resend Button */}
          <button
            onClick={handleResendEmail}
            disabled={
              !canResend || isResending || !email || !!emailValidationError
            }
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              canResend && !isResending && email && !emailValidationError
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            } flex items-center justify-center space-x-2`}
            aria-label={
              isResending
                ? "Sending verification email"
                : "Resend verification email"
            }
            aria-describedby="resend-timer"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>
                  {resendCount > 0 ? "Send Again" : "Resend Verification Email"}
                </span>
              </>
            )}
          </button>

          {/* Support Message for Multiple Attempts */}
          {resendCount > 2 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-xs text-orange-800">
                <strong>Still having trouble?</strong> Contact our support team
                at{" "}
                <a
                  href="mailto:support@eventify.com"
                  className="underline hover:text-orange-600"
                  onClick={() =>
                    logClientInfo("Support email clicked", { resendCount })
                  }
                >
                  support@eventify.com
                </a>{" "}
                for assistance.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-gray-500 mb-4">
            You can safely close this page after clicking the verification link
            in your email.
          </p>
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
            onClick={() => logClientInfo("Homepage navigation clicked")}
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t">
          <p className="text-xs text-gray-400">
            Verification links expire in 30 minutes for security reasons.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyRequestPage;
