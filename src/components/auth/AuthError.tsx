"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorConfig {
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon: React.ReactNode;
  variant: "error" | "warning" | "info";
}

export default function AuthErrorPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const error = searchParams.get("error");
  const email = searchParams.get("email");

  const handleResendVerification = async (): Promise<void> => {
    if (!email || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
      } else {
        console.error("Failed to resend verification email");
      }
    } catch (error) {
      console.error("Error resending verification:", error);
    } finally {
      setIsResending(false);
    }
  };

  const getErrorConfig = (errorCode: string | null): ErrorConfig => {
    switch (errorCode) {
      case "EMAIL_NOT_VERIFIED":
        return {
          title: "Email Verification Required",
          message: email
            ? `Please check your email (${email}) and click the verification link to activate your account.`
            : "Please check your email and click the verification link to activate your account.",
          action: email
            ? {
                label: resendSuccess
                  ? "Verification email sent!"
                  : isResending
                  ? "Sending..."
                  : "Resend verification email",
                onClick: handleResendVerification,
              }
            : undefined,
          icon: <Mail className="h-8 w-8 text-blue-500" />,
          variant: "info",
        };

      case "INVALID_CREDENTIALS":
        return {
          title: "Invalid Credentials",
          message:
            "The email or password you entered is incorrect. Please check your credentials and try again.",
          action: {
            label: "Try again",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };

      case "RATE_LIMITED":
        return {
          title: "Too Many Attempts",
          message:
            "You've made too many login attempts. Please wait 15 minutes before trying again.",
          action: {
            label: "Back to login",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
          variant: "warning",
        };

      case "MISSING_CREDENTIALS":
        return {
          title: "Missing Information",
          message: "Please provide both email and password to sign in.",
          action: {
            label: "Back to login",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
          variant: "warning",
        };

      case "AUTH_ERROR":
        return {
          title: "Authentication Error",
          message:
            "An unexpected error occurred during authentication. Please try again.",
          action: {
            label: "Try again",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };

      case "Configuration":
        return {
          title: "Configuration Error",
          message:
            "There's a configuration issue with the authentication system. Please contact support.",
          action: {
            label: "Back to home",
            href: "/",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };

      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "You don't have permission to access this resource.",
          action: {
            label: "Back to login",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };

      case "VERIFICATION_LINK_EXPIRED":
        return {
          title: "Verification Error",
          message:
            "The verification link is invalid or has expired. Please request a new one.",
          action: email
            ? {
                label: resendSuccess
                  ? "Verification email sent!"
                  : isResending
                  ? "Sending..."
                  : "Request new verification link",
                onClick: handleResendVerification,
              }
            : {
                label: "Back to login",
                href: "/auth/login",
              },
          icon: <AlertTriangle className="h-8 w-8 text-orange-500" />,
          variant: "warning",
        };
      case "ACCOUNT_DEACTIVATED":
        return {
          title: "Account Deactivated",
          message:
            "Your account has been deactivated. Please contact support for assistance.",
          action: {
            label: "Contact support",
            href: "/contact",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };

      default:
        return {
          title: "Authentication Error",
          message: "An error occurred during authentication. Please try again.",
          action: {
            label: "Back to login",
            href: "/auth/login",
          },
          icon: <AlertTriangle className="h-8 w-8 text-red-500" />,
          variant: "error",
        };
    }
  };

  const errorConfig = getErrorConfig(error);

  const getBackgroundColor = (
    variant: string
  ): "bg-red-50" | "bg-orange-50" | "bg-blue-50" | "bg-gray-50" => {
    switch (variant) {
      case "error":
        return "bg-red-50";
      case "warning":
        return "bg-orange-50";
      case "info":
        return "bg-blue-50";
      default:
        return "bg-gray-50";
    }
  };

  const getBorderColor = (
    variant: string
  ):
    | "border-red-200"
    | "border-orange-200"
    | "border-blue-200"
    | "border-gray-200" => {
    switch (variant) {
      case "error":
        return "border-red-200";
      case "warning":
        return "border-orange-200";
      case "info":
        return "border-blue-200";
      default:
        return "border-gray-200";
    }
  };

  const getButtonColor = (
    variant: string
  ):
    | "bg-red-600 hover:bg-red-700 focus:ring-red-500"
    | "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
    | "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
    | "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500" => {
    switch (variant) {
      case "error":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      case "warning":
        return "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500";
      case "info":
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
      default:
        return "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Link>
        </div>

        {/* Error Card */}
        <div
          className={`rounded-lg border ${getBorderColor(
            errorConfig.variant
          )} ${getBackgroundColor(errorConfig.variant)} p-6`}
        >
          <div className="flex items-center justify-center mb-4">
            {errorConfig.icon}
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {errorConfig.title}
            </h1>
            <p className="text-gray-700 mb-6">{errorConfig.message}</p>

            {errorConfig.action && (
              <div className="space-y-4">
                {errorConfig.action.href ? (
                  <Link
                    href={errorConfig.action.href}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${getButtonColor(
                      errorConfig.variant
                    )} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
                  >
                    {errorConfig.action.label}
                  </Link>
                ) : (
                  <button
                    onClick={errorConfig.action.onClick}
                    disabled={
                      isResending ||
                      resendSuccess ||
                      errorConfig.action.label.includes("sent!")
                    }
                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${getButtonColor(
                      errorConfig.variant
                    )} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isResending && (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {errorConfig.action.label}
                  </button>
                )}

                {resendSuccess && (
                  <p className="text-sm text-green-600 text-center">
                    Verification email sent! Please check your inbox.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{" "}
            <Link
              href="/contact"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
