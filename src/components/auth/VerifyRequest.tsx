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

const VerifyRequestPage = () => {
  const searchParams = useSearchParams();
  const emailParam = searchParams?.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [countdown, setCountdown] = useState(100);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendCount, setResendCount] = useState(0);

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

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Handle resend verification email
  const handleResendEmail = async () => {
    if (!email || isResending || !canResend) return;

    setIsResending(true);
    setResendMessage("");

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
        setResendMessage("Verification email sent successfully!");
        setCountdown(100);
        setCanResend(false);
        setResendCount((prev) => prev + 1);
      } else {
        if (data.code === "RATE_LIMITED") {
          setResendMessage(
            data.error ||
              "You are sending requests too quickly. Please wait before trying again."
          );
          if (data.resetIn) {
            setCountdown(Math.min(data.resetIn, 300)); // Max 5 minutes
          }
        } else {
          setResendMessage(
            data.error ||
              "Failed to resend verification email. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Resend email error:", error);
      setResendMessage(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
            <li>You'll be automatically redirected...</li>
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
            <li>• Make sure {maskedEmail} is correct</li>
            <li>• Wait a few minutes for delivery</li>
            <li>• Request a new verification email below</li>
          </ul>
        </div>

        {/* Resend Section */}
        <div className="border-t pt-6">
          {resendMessage && (
            <div
              className={`mb-4 p-3 rounded-md text-sm ${
                resendMessage.includes("successfully")
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
              role="alert"
              aria-live="polite"
            >
              {resendMessage}
            </div>
          )}

          {!canResend ? (
            <div className="flex items-center justify-center space-x-2 text-gray-500 mb-4">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Resend available in {formatTime(countdown)}
              </span>
            </div>
          ) : null}

          <button
            onClick={handleResendEmail}
            disabled={!canResend || isResending || !email}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
              canResend && !isResending && email
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

          {resendCount > 2 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-xs text-orange-800">
                <strong>Still having trouble?</strong> Contact our support team
                at{" "}
                <a href="mailto:support@eventify.com" className="underline">
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
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>

        {/* Email Input for Manual Entry */}
        {!email && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-3">
              Enter your email address to resend verification:
            </p>
            <div className="flex space-x-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                aria-label="Email address"
                aria-describedby="manual-email-label"
                autoComplete="email"
                required
              />
            </div>
          </div>
        )}

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
