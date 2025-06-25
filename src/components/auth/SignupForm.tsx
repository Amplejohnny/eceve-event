import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Moon, Sun, Check, X, AlertCircle } from "lucide-react";

const SignupForm = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Character limits (enforced but not shown in UI)
  const limits = {
    name: 100,
    email: 255,
    password: 128,
  };

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string) => {
    const criteria = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(criteria).filter(Boolean).length;

    return { score, criteria };
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      formData.name.trim() !== "" &&
      formData.email.trim() !== "" &&
      emailValid === true &&
      formData.password !== "" &&
      passwordStrength.score >= 3 && // At least "Fair" password strength
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

  const getPasswordStrengthText = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "Very Weak";
      case 2:
        return "Weak";
      case 3:
        return "Fair";
      case 4:
        return "Good";
      case 5:
        return "Strong";
      default:
        return "Very Weak";
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "bg-red-500";
      case 2:
        return "bg-orange-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-blue-500";
      case 5:
        return "bg-green-500";
      default:
        return "bg-gray-300";
    }
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
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setMessage("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setFormData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        if (data.fieldErrors) {
          setErrors(data.fieldErrors);
        } else {
          setMessage(data.error || "Something went wrong. Please try again.");
        }
      }
    } catch (error) {
      console.error("Network error:", error);
      setMessage("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
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
          {/* Dark mode toggle button - now scrollable */}
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
          {/* Dark mode toggle for mobile/right side */}
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

            <div className="space-y-4">
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                        )}${
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
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
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
                <a
                  href="/auth/login"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;
