"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun, Check, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  type FormData = {
    password: string;
    confirmPassword: string;
  };

  type Errors = Partial<Record<keyof FormData, string>>;

  const [formData, setFormData] = useState<FormData>({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  // Password validation states
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // Character limits
  const limits = {
    password: 128,
    confirmPassword: 128,
  };

  // Check if token exists on mount
  useEffect(() => {
    if (!token) {
      setMessage("Invalid or missing reset token.");
    }
  }, [token]);

  // Password validation
  const validatePassword = (password: string) => {
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordCriteria(criteria);
    return Object.values(criteria).every(Boolean);
  };

  // Client-side form validation
  const validateForm = (): { isValid: boolean; errors: Errors } => {
    const newErrors: Errors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Password does not meet requirements";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    return (
      formData.password !== "" &&
      formData.confirmPassword !== "" &&
      validatePassword(formData.password) &&
      formData.password === formData.confirmPassword
    );
  };

  // Real-time validation effects
  useEffect(() => {
    if (formData.password) {
      validatePassword(formData.password);
    }
  }, [formData.password]);

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

    if (!token) {
      setMessage("Invalid reset token.");
      return;
    }

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
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(
          "Password reset successful! You can now login with your new password."
        );
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      } else {
        // Handle different error scenarios
        if (data.message?.includes("token")) {
          setMessage(
            "This reset link is invalid or has expired. Please request a new one."
          );
        } else {
          setMessage(
            data.message || "Failed to reset password. Please try again."
          );
        }
      }
    } catch (error) {
      console.error("Reset password error:", error);

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

  // Show error state for missing token
  if (!token) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-600" />
            </div>
            <h1
              className={`text-2xl font-bold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Invalid Reset Link
            </h1>
            <p
              className={`mb-6 ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}
            >
              This password reset link is missing or invalid.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md transition-colors duration-200"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              Create new password
              <br />
              Choose a strong password to secure your account.
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
                  Eventify
                </span>
              </div>
              <h1
                className={`text-2xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Reset Password
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Enter your new password
              </p>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Reset Password
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Create a new password for your account
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes("successful") || isSuccess
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

            {!isSuccess && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your new password"
                      className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password
                          ? isDarkMode
                            ? "bg-gray-800 border-red-500 text-white placeholder-gray-400"
                            : "bg-white border-red-500 text-gray-900 placeholder-gray-400"
                          : isDarkMode
                          ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:border-gray-400"
                      }`}
                      maxLength={limits.password}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        isDarkMode
                          ? "text-gray-400 hover:text-gray-300"
                          : "text-gray-500 hover:text-gray-700"
                      } transition-colors duration-200`}
                      tabIndex={-1}
                    >
                      {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1" role="alert">
                      {errors.password}
                    </p>
                  )}

                  {/* Character count */}
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-xs ${
                        formData.password.length >= limits.password * 0.9
                          ? "text-orange-500"
                          : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {formData.password.length}/{limits.password}
                    </span>
                  </div>

                  {/* Password Requirements */}
                  {formData.password && (
                    <div
                      className={`mt-3 p-3 rounded-md ${
                        isDarkMode ? "bg-gray-800" : "bg-gray-50"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium mb-2 ${
                          isDarkMode ? "text-gray-200" : "text-gray-700"
                        }`}
                      >
                        Password must contain:
                      </p>
                      <div className="space-y-1">
                        {Object.entries({
                          length: "At least 8 characters",
                          uppercase: "One uppercase letter (A-Z)",
                          lowercase: "One lowercase letter (a-z)",
                          number: "One number (0-9)",
                          special: "One special character (!@#$%^&*)",
                        }).map(([key, description]) => (
                          <div key={key} className="flex items-center text-xs">
                            {passwordCriteria[
                              key as keyof typeof passwordCriteria
                            ] ? (
                              <Check
                                size={12}
                                className="text-green-500 mr-2 flex-shrink-0"
                              />
                            ) : (
                              <X
                                size={12}
                                className="text-gray-400 mr-2 flex-shrink-0"
                              />
                            )}
                            <span
                              className={
                                passwordCriteria[
                                  key as keyof typeof passwordCriteria
                                ]
                                  ? "text-green-600"
                                  : isDarkMode
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }
                            >
                              {description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className={`block text-sm font-medium mb-1 ${
                      isDarkMode ? "text-gray-200" : "text-gray-700"
                    }`}
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your new password"
                      className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword
                          ? isDarkMode
                            ? "bg-gray-800 border-red-500 text-white placeholder-gray-400"
                            : "bg-white border-red-500 text-gray-900 placeholder-gray-400"
                          : isDarkMode
                          ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400 hover:border-gray-500"
                          : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 hover:border-gray-400"
                      }`}
                      maxLength={limits.confirmPassword}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        isDarkMode
                          ? "text-gray-400 hover:text-gray-300"
                          : "text-gray-500 hover:text-gray-700"
                      } transition-colors duration-200`}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <Eye size={16} />
                      ) : (
                        <EyeOff size={16} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1" role="alert">
                      {errors.confirmPassword}
                    </p>
                  )}

                  {/* Character count */}
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-xs ${
                        formData.confirmPassword.length >=
                        limits.confirmPassword * 0.9
                          ? "text-orange-500"
                          : isDarkMode
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {formData.confirmPassword.length}/{limits.confirmPassword}
                    </span>
                  </div>

                  {/* Password match indicator */}
                  {formData.confirmPassword && formData.password && (
                    <div className="flex items-center mt-2">
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <Check size={12} className="text-green-500 mr-2" />
                          <span className="text-green-600 text-xs">
                            Passwords match
                          </span>
                        </>
                      ) : (
                        <>
                          <X size={12} className="text-red-500 mr-2" />
                          <span className="text-red-500 text-xs">
                            Passwords do not match
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className={`w-full font-medium py-2.5 px-4 rounded-md transition-all duration-200 text-sm ${
                    isLoading || !isFormValid()
                      ? isDarkMode
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}

            {/* Success state - Login redirect */}
            {isSuccess && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-600" />
                </div>
                <p
                  className={`mb-4 ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Redirecting to login page...
                </p>
                <Link
                  href="/auth/login"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-md transition-colors duration-200"
                >
                  Go to Login
                </Link>
              </div>
            )}

            {/* Back to login link */}
            {!isSuccess && (
              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className={`text-sm hover:underline transition-colors duration-200 ${
                    isDarkMode
                      ? "text-blue-400 hover:text-blue-300"
                      : "text-blue-600 hover:text-blue-700"
                  }`}
                >
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;
