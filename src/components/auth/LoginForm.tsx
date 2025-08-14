"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Moon, Sun, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

const getDeviceTheme = (): boolean => {
  try {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false; // Default to light theme if window is undefined (SSR)
  } catch (error) {
    console.warn("Error reading device theme settings:", error);
    return false; // Fallback to light theme on error
  }
};

// Character limits
const limits = {
  email: 255,
  password: 128,
};

// Enhanced email validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= limits.email;
};

const LoginForm = (): React.JSX.Element => {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  type FormData = {
    email: string;
    password: string;
  };

  type Errors = Partial<Record<keyof FormData, string>>;

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Client-side form validation
  const validateForm = (): { isValid: boolean; errors: Errors } => {
    const newErrors: Errors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    return (
      formData.email.trim() !== "" &&
      emailValid === true &&
      formData.password !== ""
    );
  };

  //checks device theme
  useEffect(() => {
    const devicePrefersDark = getDeviceTheme();
    setIsDarkMode(devicePrefersDark);

    // Optional: Listen for changes in device theme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleThemeChange);

      // Cleanup listener on unmount
      return () => {
        mediaQuery.removeEventListener("change", handleThemeChange);
      };
    }
  }, []);

  // Real-time validation effects
  useEffect(() => {
    if (formData.email) {
      setEmailValid(validateEmail(formData.email));
    } else {
      setEmailValid(null);
    }
  }, [formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
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

    // In handleSubmit function, replace the entire signIn logic with:
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - now sign in with NextAuth using the verified credentials
        const result = await signIn("credentials", {
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          setMessage("Login successful! Redirecting...");
          setTimeout(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const returnTo = urlParams.get("callbackUrl") || "/";
            router.push(returnTo);
          }, 1000);
        }
      } else {
        // Handle specific error codes from your API
        switch (data.code) {
          case "EMAIL_NOT_VERIFIED":
            setMessage(
              "Please verify your email address before logging in. We've sent you a new verification link."
            );
            break;
          case "INVALID_CREDENTIALS":
            setMessage("Invalid email or password. Please try again.");
            break;
          case "ACCOUNT_DEACTIVATED":
            setMessage(
              "Your account has been deactivated. Please contact support for assistance."
            );
            break;
          case "RATE_LIMITED":
            setMessage(
              "Too many login attempts. Please wait 15 minutes before trying again."
            );
            break;
          default:
            setMessage(data.error || "Something went wrong. Please try again.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = (): void => {
    setIsDarkMode(!isDarkMode);
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
              Discover tailored
              <br />
              events.
              <br />
              Sign in for personalized recommendations today!
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
                <div className="w-8 h-8 bg-[#ffe047] rounded-md flex items-center justify-center mr-3">
                  <Image
                    src="/ticket.png"
                    alt="Comforeve Logo"
                    width={32}
                    height={32}
                    className="rounded-md"
                  />
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
                Login
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Welcome back! Please sign in to your account
              </p>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Login
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Welcome back! Please sign in to your account
              </p>
            </div>

            {/* Messages */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes("successful")
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

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    maxLength={limits.password}
                    className={`w-full px-3 py-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } ${errors.password ? "border-red-500" : ""}`}
                    placeholder="Enter your password"
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className={`w-full font-medium py-2.5 px-4 cursor-pointer rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLoading || !isFormValid()
                    ? "bg-gray-400 cursor-not-allowed text-gray-200"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                aria-describedby="submit-status"
              >
                {isLoading ? "Signing in..." : "Login"}
              </button>

              {/* Sign Up Link */}
              <p
                className={`text-center text-sm ${
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
