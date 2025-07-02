"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun, Check, X, AlertCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

  console.error(`[SIGNUP_CLIENT_ERROR] ${context}:`, logData);

  // In production, send to logging service
  // sendToClientLoggingService(logData);
};

const logClientInfo = (message: string, metadata?: Record<string, any>) => {
  console.log(
    `[SIGNUP_CLIENT_INFO] ${new Date().toISOString()}: ${message}`,
    metadata || {}
  );
};

const SignupForm = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  type FormData = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };

  type Errors = Partial<Record<keyof FormData, string>>;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [networkError, setNetworkError] = useState(false);

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    criteria: {
      length: false,
      lowercase: false,
      uppercase: false,
      number: false,
      special: false,
    },
  });

  // Character limits
  const limits = {
    name: 100,
    email: 255,
    password: 128,
  };

  // Enhanced email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email) && email.length <= limits.email;

    logClientInfo("Email validation", {
      isValid,
      emailLength: email.length,
      hasAtSymbol: email.includes("@"),
      hasDot: email.includes("."),
    });

    return isValid;
  };

  // Enhanced password strength calculation
  const calculatePasswordStrength = (password: string) => {
    const criteria = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(criteria).filter(Boolean).length;

    logClientInfo("Password strength calculated", {
      score,
      passwordLength: password.length,
      criteriaCount: score,
    });

    return { score, criteria };
  };

  // Client-side form validation
  const validateForm = (): { isValid: boolean; errors: Errors } => {
    const newErrors: Errors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length > limits.name) {
      newErrors.name = `Name must be less than ${limits.name} characters`;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (formData.email.length > limits.email) {
      newErrors.email = `Email must be less than ${limits.email} characters`;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    } else if (formData.password.length > limits.password) {
      newErrors.password = `Password must be less than ${limits.password} characters`;
    } else if (passwordStrength.score < 3) {
      newErrors.password =
        "Password is too weak. Please meet more requirements.";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }

    const isValid = Object.keys(newErrors).length === 0;

    logClientInfo("Client-side validation", {
      isValid,
      errorCount: Object.keys(newErrors).length,
      errors: Object.keys(newErrors),
    });

    return { isValid, errors: newErrors };
  };

  // Check if form is valid for submission
  const isFormValid = (): boolean => {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      emailValid === true &&
      formData.password !== "" &&
      passwordStrength.score >= 3 &&
      passwordsMatch === true
    );
  };

  // Real-time validation effects
  useEffect(() => {
    if (formData.email) {
      setEmailValid(validateEmail(formData.email));
    } else {
      setEmailValid(null);
    }
  }, [formData.email]);

  useEffect(() => {
    if (formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password]);

  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordsMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordsMatch(null);
    }
  }, [formData.password, formData.confirmPassword]);

  const getPasswordStrengthText = (score: number): string => {
    const strengthMap = {
      0: "Very Weak",
      1: "Very Weak",
      2: "Weak",
      3: "Fair",
      4: "Good",
      5: "Strong",
    };
    return strengthMap[score as keyof typeof strengthMap] || "Very Weak";
  };

  const getPasswordStrengthColor = (score: number): string => {
    const colorMap = {
      0: "bg-red-500",
      1: "bg-red-500",
      2: "bg-orange-500",
      3: "bg-yellow-500",
      4: "bg-blue-500",
      5: "bg-green-500",
    };
    return colorMap[score as keyof typeof colorMap] || "bg-gray-300";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Enforce character limits silently
    const limit = limits[name as keyof typeof limits];
    const trimmedValue = limit ? value.slice(0, limit) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: trimmedValue,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear general message when user modifies form
    if (message) {
      setMessage("");
    }

    // Clear network error flag
    if (networkError) {
      setNetworkError(false);
    }
  };

  // Enhanced error handling
  const handleApiError = (data: any, response: Response) => {
    logClientError(
      new Error(`API Error: ${response.status} ${response.statusText}`),
      "API response error",
      {
        status: response.status,
        statusText: response.statusText,
        responseData: data,
        submitAttempt: submitAttempts + 1,
      }
    );

    if (data.fieldErrors) {
      setErrors(data.fieldErrors);
      logClientInfo("Server validation errors received", {
        fieldErrors: Object.keys(data.fieldErrors),
      });
    } else {
      const errorMessage =
        data.error || "Something went wrong. Please try again.";
      setMessage(errorMessage);

      // Handle specific error codes
      switch (data.code) {
        case "RATE_LIMITED":
          logClientInfo("Rate limited", { retryAfter: data.retryAfter });
          break;
        case "USER_EXISTS":
          logClientInfo("User already exists");
          break;
        case "EMAIL_SEND_FAILED":
          logClientInfo("Email send failed");
          break;
        default:
          logClientInfo("Generic API error", { code: data.code });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const attemptNumber = submitAttempts + 1;
    setSubmitAttempts(attemptNumber);

    logClientInfo("Form submission started", {
      attempt: attemptNumber,
      formValid: isFormValid(),
      hasName: !!formData.name.trim(),
    });

    // Client-side validation
    const validation = validateForm();
    if (!validation.isValid) {
      setErrors(validation.errors);
      logClientInfo("Client-side validation failed", {
        errors: Object.keys(validation.errors),
      });
      return;
    }

    setIsLoading(true);
    setErrors({});
    setMessage("");
    setNetworkError(false);

    const requestStart = Date.now();

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const requestTime = Date.now() - requestStart;

      logClientInfo("API request completed", {
        status: response.status,
        requestTime,
        attempt: attemptNumber,
      });

      const data = await response.json();

      if (response.ok) {
        logClientInfo("Registration successful", {
          userId: data.user?.id,
          requestTime,
          attempt: attemptNumber,
        });

        setMessage(data.message);

        // Clear form on success
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });

        // Optional: Redirect after success
        if (data.redirectTo) {
          setTimeout(() => {
            window.location.href = data.redirectTo;
          }, 2000);
        }
      } else {
        handleApiError(data, response);
      }
    } catch (error) {
      const requestTime = Date.now() - requestStart;

      logClientError(error, "Network request failed", {
        requestTime,
        attempt: attemptNumber,
        isOnline: navigator.onLine,
      });

      setNetworkError(true);

      if (!navigator.onLine) {
        setMessage(
          "You appear to be offline. Please check your internet connection and try again."
        );
      } else {
        setMessage(
          "Network error. Please check your connection and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    logClientInfo("Dark mode toggled", { isDarkMode: !isDarkMode });
  };

  // Component render starts here
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
          <button
            onClick={toggleDarkMode}
            className={`absolute top-8 right-8 p-2 rounded-full transition-colors duration-300 ${
              isDarkMode
                ? "bg-gray-700 text-yellow-400 hover:bg-gray-600"
                : "bg-gray-700 text-white hover:bg-gray-600"
            } shadow-md`}
            aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="max-w-md">
            <div className="flex items-center mb-8">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center mr-3">
                <Image
                  src="/ticket.png"
                  alt="Comforeve Logo"
                  width={32}
                  height={32}
                  className="rounded-md"
                />
              </div>
              <span className="text-white text-xl font-semibold">
                Comforeve
              </span>
            </div>

            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4 leading-tight">
              Discover tailored events.
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Sign up for personalized recommendations today!
            </p>
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
            className={`lg:hidden absolute top-6 right-6 p-2 rounded-full transition-colors duration-300 ${
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
                Create Account
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Join us for personalized event recommendations
              </p>
            </div>

            {/* Desktop header */}
            <div className="hidden lg:block mb-8">
              <h1
                className={`text-3xl font-bold mb-2 ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Create Account
              </h1>
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Get started with your free account
              </p>
            </div>

            {/* Success/Error Messages */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes("successfully") ||
                  message.includes("created")
                    ? isDarkMode
                      ? "bg-green-900 text-green-200 border border-green-700"
                      : "bg-green-50 text-green-700 border border-green-200"
                    : networkError
                    ? isDarkMode
                      ? "bg-orange-900 text-orange-200 border border-orange-700"
                      : "bg-orange-50 text-orange-700 border border-orange-200"
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
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className={`block text-sm font-medium mb-1 ${
                    isDarkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  maxLength={limits.name}
                  className={`w-full px-3 py-2.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  } ${errors.name ? "border-red-500" : ""}`}
                  placeholder="Enter your name"
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p
                    id="name-error"
                    className="text-red-500 text-xs mt-1"
                    role="alert"
                  >
                    {errors.name}
                  </p>
                )}
              </div>

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
                  />
                  {formData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {emailValid === true ? (
                        <Check
                          size={18}
                          className="text-green-500"
                          aria-label="Valid email format"
                        />
                      ) : emailValid === false ? (
                        <AlertCircle
                          size={18}
                          className="text-orange-500"
                          aria-label="Invalid email format"
                        />
                      ) : null}
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p
                    id="email-error"
                    className="text-red-500 text-xs mt-1"
                    role="alert"
                  >
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
                    placeholder="Create a password"
                    aria-describedby="password-strength"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
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

                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        id="password-strength"
                        className={`text-xs font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Password Strength:{" "}
                        {getPasswordStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(
                          passwordStrength.score
                        )} ${
                          passwordStrength.score === 0
                            ? "w-0"
                            : passwordStrength.score === 1
                            ? "w-1/5"
                            : passwordStrength.score === 2
                            ? "w-2/5"
                            : passwordStrength.score === 3
                            ? "w-3/5"
                            : passwordStrength.score === 4
                            ? "w-4/5"
                            : "w-full"
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <div
                      id="password-requirements"
                      className="text-xs space-y-1"
                    >
                      {Object.entries(passwordStrength.criteria).map(
                        ([key, met]) => (
                          <div
                            key={key}
                            className="flex items-center space-x-2"
                          >
                            {met ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <X size={12} className="text-red-500" />
                            )}
                            <span
                              className={`${
                                met
                                  ? "text-green-500"
                                  : isDarkMode
                                  ? "text-gray-400"
                                  : "text-gray-500"
                              }`}
                            >
                              {key === "length" && "At least 8 characters"}
                              {key === "lowercase" && "One lowercase letter"}
                              {key === "uppercase" && "One uppercase letter"}
                              {key === "number" && "One number"}
                              {key === "special" && "One special character"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-red-500 text-xs mt-1" role="alert">
                    {errors.password}
                  </p>
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
                    className={`w-full px-3 py-2.5 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    } ${
                      errors.confirmPassword
                        ? "border-red-500"
                        : passwordsMatch === false
                        ? "border-orange-500"
                        : passwordsMatch === true
                        ? "border-green-500"
                        : ""
                    }`}
                    placeholder="Confirm your password"
                    aria-describedby={
                      errors.confirmPassword
                        ? "confirm-password-error"
                        : "confirm-password-match"
                    }
                  />
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                    {formData.confirmPassword &&
                      passwordsMatch !== null &&
                      (passwordsMatch ? (
                        <Check
                          size={18}
                          className="text-green-500"
                          aria-label="Passwords match"
                        />
                      ) : (
                        <X
                          size={18}
                          className="text-red-500"
                          aria-label="Passwords don't match"
                        />
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-300"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <Eye size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </button>
                </div>

                {formData.confirmPassword && passwordsMatch === false && (
                  <p
                    id="confirm-password-match"
                    className="text-orange-500 text-xs mt-1"
                    role="alert"
                  >
                    Passwords don't match
                  </p>
                )}

                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1" role="alert">
                    {errors.confirmPassword}
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
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>

              {/* Sign In Link */}
              <p
                className={`text-center text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
