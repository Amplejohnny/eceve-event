import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun, AlertCircle } from "lucide-react";
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

  console.error(`[LOGIN_CLIENT_ERROR] ${context}:`, logData);

  // In production, send to logging service
  // sendToClientLoggingService(logData);
};

const logClientInfo = (message: string, metadata?: Record<string, any>) => {
  console.log(
    `[LOGIN_CLIENT_INFO] ${new Date().toISOString()}: ${message}`,
    metadata || {}
  );
};

const LoginForm = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

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
  const [networkError, setNetworkError] = useState(false);

  // Validation states
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  // Character limits
  const limits = {
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

  // Client-side form validation
  const validateForm = (): { isValid: boolean; errors: Errors } => {
    const newErrors: Errors = {};

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
    } else if (formData.password.length > limits.password) {
      newErrors.password = `Password must be less than ${limits.password} characters`;
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
      formData.email.trim() !== "" &&
      emailValid === true &&
      formData.password !== ""
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
        case "INVALID_CREDENTIALS":
          logClientInfo("Invalid credentials");
          break;
        case "ACCOUNT_LOCKED":
          logClientInfo("Account locked");
          break;
        case "ACCOUNT_NOT_VERIFIED":
          logClientInfo("Account not verified");
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
      hasEmail: !!formData.email.trim(),
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
      const response = await fetch("/api/auth/login", {
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
        logClientInfo("Login successful", {
          userId: data.user?.id,
          requestTime,
          attempt: attemptNumber,
        });

        setMessage(data.message || "Login successful!");

        // Optional: Redirect after success
        if (data.redirectTo) {
          setTimeout(() => {
            window.location.href = data.redirectTo;
          }, 1000);
        } else {
          // Default redirect to homepage
          setTimeout(() => {
            window.location.href = "/homepage";
          }, 1000);
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

  const handleForgotPassword = () => {
    logClientInfo("Forgot password clicked");
    // Redirect to forgot password page
    window.location.href = "/auth/forgot-password";
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
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-white text-xl font-semibold">Eventify</span>
            </div>

            <h1 className="text-white text-3xl lg:text-4xl font-bold mb-4 leading-tight">
              Discover tailored events.
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Sign in for personalized recommendations today!
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

            {/* Success/Error Messages */}
            {message && (
              <div
                className={`mb-4 p-3 rounded-md text-sm ${
                  message.includes("successful") || message.includes("Welcome")
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
                    placeholder="Enter your password"
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    autoComplete="current-password"
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
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-red-500 text-xs mt-1"
                    role="alert"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                >
                  Forgot password?
                </button>
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
                  href="/api/auth/login"
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
