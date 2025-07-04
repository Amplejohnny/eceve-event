"use client";

import React, { useState } from "react";
import { Moon, Sun, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  type FormData = {
    email: string;
  };

  type Errors = Partial<Record<keyof FormData, string>>;

  const [formData, setFormData] = useState<FormData>({
    email: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Character limits
  const limits = {
    email: 255,
  };

  // Enhanced email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= limits.email;
  };

  // Client-side form validation
  const validateForm = (): { isValid: boolean; errors: Errors } => {
    const newErrors: Errors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    return formData.email.trim() !== "" && emailValid === true;
  };

  // Real-time validation effects
  React.useEffect(() => {
    if (formData.email) {
      setEmailValid(validateEmail(formData.email));
    } else {
      setEmailValid(null);
    }
  }, [formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const limit = limits[name as keyof typeof limits];
    const trimmedValue = limit ? value.slice(0, limit) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: trimmedValue,
    }));

    // Clear errors and messages when user types
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (message) setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const validation = validateForm();
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        setMessage(
          "If an account with that email exists, we've sent you a password reset link."
        );
      } else {
        setMessage(data.message || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);

      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setMessage(
          "Network error. Please check your internet connection and try again."
        );
      } else {
        setMessage(
          "An unexpected error occurred. Please try again or contact support."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleBackToLogin = () => {
    router.push("/auth/login");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="flex min-h-screen">
        {/* Left side - Welcome section */}
        <div
          className={`hidden lg:flex lg:w-1/2 p-8 lg:p-12 xl:p-16 flex-col justify-center transition-colors duration-300 relative ${
            isDarkMode ? "bg-slate-800" : "bg-slate-900"
          }`}
        >
          <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
            <div className="flex items-center">
              <div className="">
                <Image
                  src="/ticket.png"
                  alt="Comforeve Logo"
                  width={32}
                  height={32}
                  className="rounded-md border"
                />
              </div>
              <span className="text-[#ffe047] text-xl font-semibold ml-1">
                Comforeve
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center h-full max-w-md">
            <h1 className="text-white text-3xl font-bold mb-4 leading-tight">
              Reset your password
              <br />
              Enter your email address and we'll send you a link to reset your
              password.
            </h1>
          </div>
        </div>

        {/* Right side - Form section */}
        <div
          className={`w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 transition-colors duration-300 relative ${
            isDarkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <button
            onClick={toggleDarkMode}
            className={`absolute top-6 right-6 p-2 rounded-full transition-colors duration-300 ${
              isDarkMode
                ? "bg-gray-800 text-yellow-400 hover:bg-gray-700"
                : "bg-white text-gray-600 hover:bg-gray-100"
            } shadow-md`}
            aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="w-full max-w-md">
            {/* Mobile header */}
            <div className="lg:hidden mb-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">E</span>
                </div>
                <span
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Comforeve
                </span>
              </div>
              <h1
                className={`text-2xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Forgot Password
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Enter your email to reset your password
              </p>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Forgot Password
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Enter your email address and we'll send you a reset link
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes("sent") || isSubmitted
                    ? isDarkMode
                      ? "bg-green-900 text-green-200 border border-green-700"
                      : "bg-green-50 text-green-700 border border-green-200"
                    : isDarkMode
                    ? "bg-red-900 text-red-200 border border-red-700"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
                role="alert"
                aria-live="polite"
              >
                {message}
              </div>
            )}

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label
                    htmlFor="email"
                    className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      maxLength={limits.email}
                      className={`w-full px-3 py-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                        isDarkMode
                          ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                      } ${
                        errors.email
                          ? "border-red-500"
                          : emailValid === false
                          ? "border-orange-500"
                          : emailValid === true
                          ? "border-green-500"
                          : ""
                      }`}
                      placeholder="Enter your email address"
                      aria-describedby={
                        errors.email ? "email-error" : "email-validation"
                      }
                      autoComplete="email"
                      disabled={isLoading}
                    />
                    {formData.email && emailValid === false && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <AlertCircle
                          size={18}
                          className="text-orange-500"
                          aria-label="Invalid email format"
                        />
                      </div>
                    )}
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1" role="alert">
                      {errors.email}
                    </p>
                  )}
                  {!errors.email && emailValid === false && formData.email && (
                    <p
                      id="email-validation"
                      className="text-orange-500 text-xs mt-1"
                      role="alert"
                    >
                      Please enter a valid email address
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className={`w-full font-medium py-2.5 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isLoading || !isFormValid()
                      ? "bg-gray-400 cursor-not-allowed text-gray-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  aria-describedby="submit-status"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>

                {/* Back to Login Link */}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className={`w-full flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
                    isDarkMode
                      ? "bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                  disabled={isLoading}
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Success state - show back to login button */}
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className={`w-full flex items-center justify-center gap-2 font-medium py-2.5 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-blue-600 hover:bg-blue-700 text-white`}
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>

                {/* Additional info */}
                <p
                  className={`text-center text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Didn't receive an email? Check your spam folder or{" "}
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setMessage("");
                      setFormData({ email: "" });
                    }}
                    className="text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                  >
                    try again
                  </button>
                </p>
              </div>
            )}

            {/* Sign Up Link */}
            {!isSubmitted && (
              <p
                className={`text-center text-sm mt-6 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                >
                  Sign up
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
