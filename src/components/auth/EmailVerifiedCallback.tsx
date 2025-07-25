"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

// Client-side logging utility (matching LoginForm pattern)
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

  console.error(`[EMAIL_VERIFIED_CLIENT_ERROR] ${context}:`, logData);

  // In production, send to logging service
  // sendToClientLoggingService(logData);
};

const logClientInfo = (message: string, metadata?: Record<string, any>) => {
  console.log(
    `[EMAIL_VERIFIED_CLIENT_INFO] ${new Date().toISOString()}: ${message}`,
    metadata || {}
  );
};

// Analytics tracking utility
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  try {
    // Example analytics tracking - replace with your analytics service
    logClientInfo(`Analytics: ${eventName}`, properties);

    // In production, replace with your analytics service:
    // analytics.track(eventName, properties);
    // gtag('event', eventName, properties);
    // mixpanel.track(eventName, properties);
  } catch (error) {
    logClientError(error, "Analytics tracking failed", {
      eventName,
      properties,
    });
  }
};

export default function EmailVerified() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5); // Increased for better UX
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [verificationToken, setVerificationToken] = useState<string | null>(
    null
  );

  // Extract token from URL params for analytics
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || urlParams.get("verification_token");
    setVerificationToken(token);

    // Track successful email verification view
    trackEvent("email_verification_success_viewed", {
      hasToken: !!token,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });

    logClientInfo("Email verification page loaded", {
      hasToken: !!token,
      tokenLength: token?.length,
    });
  }, []);

  // Enhanced redirect with error handling
  const performRedirect = async (attempt: number = 1) => {
    try {
      setIsRedirecting(true);
      setHasError(false);

      logClientInfo("Starting redirect", {
        attempt,
        destination: "/",
        countdown: countdown,
      });

      // Track redirect attempt
      trackEvent("email_verification_redirect_attempt", {
        attempt,
        method: "automatic",
        countdownRemaining: countdown,
      });

      // Simulate potential network check or validation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Perform the redirect
      await router.push("/");

      // Track successful redirect
      trackEvent("email_verification_redirect_success", {
        attempt,
        method: "automatic",
      });

      logClientInfo("Redirect successful", { attempt });
    } catch (error) {
      logClientError(error, "Redirect failed", {
        attempt,
        destination: "/",
        countdown,
      });

      setIsRedirecting(false);
      setHasError(true);
      setRetryAttempts(attempt);

      // Track redirect failure
      trackEvent("email_verification_redirect_failed", {
        attempt,
        error: error instanceof Error ? error.message : String(error),
        method: "automatic",
      });

      if (attempt === 1) {
        setErrorMessage("Unable to redirect automatically. Please try again.");
      } else if (attempt === 2) {
        setErrorMessage(
          "Still having trouble redirecting. You can continue manually."
        );
      } else {
        setErrorMessage(
          "Automatic redirect failed. Please use the button below to continue."
        );
      }
    }
  };

  // Manual redirect handler
  const handleManualRedirect = async () => {
    const attempt = retryAttempts + 1;

    trackEvent("email_verification_manual_redirect", {
      attempt,
      previousAutoAttempts: retryAttempts,
    });

    await performRedirect(attempt);
  };

  // Countdown and auto-redirect logic
  useEffect(() => {
    if (hasError || isRedirecting) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          performRedirect(1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasError, isRedirecting]);

  // Retry logic for failed redirects
  const handleRetry = () => {
    setHasError(false);
    setErrorMessage("");
    setCountdown(3); // Shorter countdown for retry

    trackEvent("email_verification_retry_initiated", {
      previousAttempts: retryAttempts,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <CircleCheck className="h-8 w-8 text-green-600" />
          </div>

          {/* Main Content */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Email Verified!
          </h1>

          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now access all
            features of your account.
          </p>

          {/* Status Messages */}
          {!hasError && !isRedirecting && countdown > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <p className="text-blue-800 text-sm">
                Redirecting to homepage in{" "}
                <span className="font-semibold">{countdown}</span> seconds...
              </p>
            </div>
          )}

          {isRedirecting && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin h-4 w-4 text-blue-600 mr-2" />
                <p className="text-blue-800 text-sm">Redirecting...</p>
              </div>
            </div>
          )}

          {hasError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                <p className="text-red-800 text-sm font-medium">
                  Redirect Failed
                </p>
              </div>
              <p className="text-red-700 text-xs">{errorMessage}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action Button */}
            {hasError ? (
              <div className="flex space-x-3">
                <button
                  onClick={handleManualRedirect}
                  disabled={isRedirecting}
                  className="flex-1 group relative flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isRedirecting ? (
                    <>
                      <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <Home className="h-4 w-4 mr-2" />
                      Continue to Homepage
                    </>
                  )}
                </button>

                <button
                  onClick={handleRetry}
                  disabled={isRedirecting}
                  className="px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Retry Auto
                </button>
              </div>
            ) : (
              <button
                onClick={handleManualRedirect}
                disabled={isRedirecting}
                className="w-full group relative flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isRedirecting ? (
                  <>
                    <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Home className="h-4 w-4 mr-2" />
                    Continue to Homepage
                  </>
                )}
              </button>
            )}
          </div>

          {/* Additional Help */}
          {retryAttempts >= 2 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                Having trouble? You can also:
              </p>
              <div className="flex justify-center space-x-4 text-xs">
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-500 transition-colors duration-200"
                  onClick={() =>
                    trackEvent("email_verification_manual_link_clicked")
                  }
                >
                  Go to Homepage
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/profile"
                  className="text-blue-600 hover:text-blue-500 transition-colors duration-200"
                  onClick={() =>
                    trackEvent("email_verification_profile_link_clicked")
                  }
                >
                  View Profile
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <p>
              Debug: Countdown: {countdown} | Redirecting:{" "}
              {String(isRedirecting)} | Error: {String(hasError)} | Attempts:{" "}
              {retryAttempts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
