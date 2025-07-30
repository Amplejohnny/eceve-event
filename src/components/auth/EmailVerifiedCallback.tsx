"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, AlertCircle, RefreshCw, Home, Mail } from "lucide-react";
import Link from "next/link";

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

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

// Client-side logging utility
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

  console.error(`[EMAIL_VERIFIED_CLIENT_ERROR] ${context}:`, logData);
};

const logClientInfo = (
  message: string,
  metadata?: Record<string, unknown>
): void => {
  console.log(
    `[EMAIL_VERIFIED_CLIENT_INFO] ${new Date().toISOString()}: ${message}`,
    metadata || {}
  );
};

// Analytics tracking utility
const trackEvent = (
  eventName: string,
  properties?: Record<string, unknown>
): void => {
  try {
    logClientInfo(`Analytics: ${eventName}`, properties);
  } catch (error) {
    logClientError(error, "Analytics tracking failed", {
      eventName,
      properties,
    });
  }
};

export default function EmailVerified(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error" | "already_verified"
  >("pending");
  const [isVerifying, setIsVerifying] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    email: string;
    name: string | null;
  } | null>(null);

  // Handle verification on component mount
  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");

    // Handle pre-verified states from URL params
    if (verified === "true") {
      setVerificationStatus("success");
      trackEvent("email_verification_success_from_url");
      return;
    }

    if (error) {
      setVerificationStatus("error");
      setErrorMessage(decodeURIComponent(error));
      trackEvent("email_verification_error_from_url", { error });
      return;
    }

    // Perform verification if we have token and email
    if (token && email) {
      performEmailVerification(token, email);
    } else {
      // No verification params - might be a direct visit
      setVerificationStatus("error");
      setErrorMessage("Missing verification parameters");
      trackEvent("email_verification_missing_params");
    }
  }, [searchParams]);

  const performEmailVerification = async (token: string, email: string) => {
    setIsVerifying(true);

    try {
      logClientInfo("Starting email verification", {
        email,
        hasToken: !!token,
      });

      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, email }),
      });

      const result: VerificationResult = await response.json();

      if (result.success) {
        setVerificationStatus(
          result.message === "Email already verified"
            ? "already_verified"
            : "success"
        );
        setUserInfo({
          email: result.user?.email || email,
          name: result.user?.name || null,
        });

        trackEvent("email_verification_success", {
          email,
          alreadyVerified: result.message === "Email already verified",
        });

        logClientInfo("Email verification successful", {
          email,
          result: result.message,
        });
      } else {
        setVerificationStatus("error");
        setErrorMessage(result.message);

        trackEvent("email_verification_failed", {
          email,
          error: result.message,
        });

        logClientError(new Error(result.message), "Email verification failed", {
          email,
        });
      }
    } catch (error) {
      setVerificationStatus("error");
      setErrorMessage("Network error during verification");

      logClientError(error, "Email verification network error", { email });
      trackEvent("email_verification_network_error", {
        email,
        error: String(error),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const performRedirect = useCallback(
    async (attempt: number = 1) => {
      try {
        setIsRedirecting(true);
        setHasError(false);

        logClientInfo("Starting redirect", {
          attempt,
          destination: "/auth/login",
          countdown: countdown,
        });

        trackEvent("email_verification_redirect_attempt", {
          attempt,
          method: "automatic",
          countdownRemaining: countdown,
        });

        await new Promise((resolve) => setTimeout(resolve, 100));
        router.push("/auth/login");

        trackEvent("email_verification_redirect_success", {
          attempt,
          method: "automatic",
        });

        logClientInfo("Redirect successful", { attempt });
      } catch (error) {
        logClientError(error, "Redirect failed", {
          attempt,
          countdown,
        });

        setIsRedirecting(false);
        setHasError(true);
        setRetryAttempts(attempt);

        trackEvent("email_verification_redirect_failed", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt === 1) {
          setErrorMessage(
            "Unable to redirect automatically. Please try again."
          );
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
    },
    [countdown, router]
  );

  const handleManualRedirect = async (): Promise<void> => {
    const attempt = retryAttempts + 1;
    trackEvent("email_verification_manual_redirect", {
      attempt,
      previousAutoAttempts: retryAttempts,
    });
    await performRedirect(attempt);
  };

  // Countdown and auto-redirect logic - only for successful verification
  useEffect(() => {
    if (
      hasError ||
      isRedirecting ||
      isVerifying ||
      (verificationStatus !== "success" &&
        verificationStatus !== "already_verified")
    ) {
      return;
    }

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

    return (): void => clearInterval(timer);
  }, [
    hasError,
    isRedirecting,
    isVerifying,
    verificationStatus,
    performRedirect,
  ]);

  const handleRetry = (): void => {
    setHasError(false);
    setErrorMessage("");
    setCountdown(3);

    trackEvent("email_verification_retry_initiated", {
      previousAttempts: retryAttempts,
    });
  };

  const renderContent = () => {
    // Show loading state during verification
    if (isVerifying) {
      return (
        <>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Verifying Email...
          </h1>
          <p className="text-gray-600 mb-6">
            Please wait while we verify your email address.
          </p>
        </>
      );
    }

    // Show error state
    if (verificationStatus === "error") {
      return (
        <>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Verification Failed
          </h1>
          <p className="text-gray-600 mb-6">
            {errorMessage ||
              "We couldn't verify your email address. The link may be expired or invalid."}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
            <p className="text-red-800 text-sm">
              Please request a new verification email or contact support if the
              problem persists.
            </p>
          </div>
        </>
      );
    }

    // Show success state
    return (
      <>
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CircleCheck className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Email Verified!
        </h1>
        <p className="text-gray-600 mb-6">
          {verificationStatus === "already_verified"
            ? "Your email was already verified. You can now access all features of your account."
            : "Your email has been successfully verified. You can now access all features of your account."}
        </p>
        {userInfo && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-6">
            <p className="text-green-800 text-sm">
              Welcome{userInfo.name ? `, ${userInfo.name}` : ""}! Your account (
              {userInfo.email}) is now active.
            </p>
          </div>
        )}
      </>
    );
  };

  const renderStatusMessages = () => {
    if (verificationStatus === "error") {
      return null; // Error messages are handled in renderContent
    }

    if (
      !hasError &&
      !isRedirecting &&
      countdown > 0 &&
      (verificationStatus === "success" ||
        verificationStatus === "already_verified")
    ) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
          <p className="text-blue-800 text-sm">
            Redirecting to Login Page in{" "}
            <span className="font-semibold">{countdown}</span> seconds...
          </p>
        </div>
      );
    }

    if (isRedirecting) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="animate-spin h-4 w-4 text-blue-600 mr-2" />
            <p className="text-blue-800 text-sm">Redirecting...</p>
          </div>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
            <p className="text-red-800 text-sm font-medium">Redirect Failed</p>
          </div>
          <p className="text-red-700 text-xs">{errorMessage}</p>
        </div>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    if (verificationStatus === "error") {
      return (
        <div className="space-y-3">
          <Link
            href="/auth/verify-request"
            className="w-full group relative flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            onClick={() => trackEvent("email_verification_resend_clicked")}
          >
            <Mail className="h-4 w-4 mr-2" />
            Request New Verification Email
          </Link>
          <Link
            href="/"
            className="w-full group relative flex justify-center items-center py-2.5 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            onClick={() => trackEvent("email_verification_home_clicked")}
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Homepage
          </Link>
        </div>
      );
    }

    // Success state buttons
    if (hasError) {
      return (
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
      );
    }

    return (
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
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {renderContent()}
          {renderStatusMessages()}

          <div className="space-y-3">{renderActionButtons()}</div>

          {/* Additional Help */}
          {retryAttempts >= 2 && verificationStatus !== "error" && (
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
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <p>
              Debug: Status: {verificationStatus} | Countdown: {countdown} |
              Verifying: {String(isVerifying)} | Redirecting:{" "}
              {String(isRedirecting)} | Error: {String(hasError)} | Attempts:{" "}
              {retryAttempts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
