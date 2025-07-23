"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Camera,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  Menu,
  Globe,
  MapPin,
} from "lucide-react";
import { RiTwitterXLine } from "react-icons/ri";
import { PiInstagramLogo } from "react-icons/pi";
import {
  isValidUrl,
  getErrorMessage,
  debounce,
  truncateText,
  getUserAvatarUrl,
} from "@/lib/utils";
import Link from "next/link";

interface ProfileData {
  image: string;
  name: string;
  bio: string;
  website: string;
  location: string;
  twitter: string;
  instagram: string;
  role: string;
}

interface Message {
  type: "success" | "error" | "";
  text: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const ProfileSettings: React.FC = () => {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<Message>({
    type: "",
    text: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<Message>({
    type: "",
    text: "",
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile form state - initialize with default values
  const [profileData, setProfileData] = useState<ProfileData>({
    image: "",
    name: "",
    bio: "",
    website: "",
    location: "",
    twitter: "",
    instagram: "",
    role: "USER",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Loading state for initial data fetch
  const [initialLoading, setInitialLoading] = useState(true);

  // Field limits
  const limits = {
    bio: 500,
    website: 100,
    location: 100,
    twitter: 50,
    instagram: 50,
  };

  // Enhanced validation functions using utils
  const validateProfileData = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!profileData.name.trim()) {
      errors.name = "Name is required";
    } else if (profileData.name.length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Website validation using isValidUrl from utils
    if (profileData.website && !isValidUrl(profileData.website)) {
      errors.website = "Please enter a valid website URL";
    }

    // Bio validation with truncation helper
    if (profileData.bio.length > limits.bio) {
      errors.bio = `Bio must not exceed ${limits.bio} characters`;
    }

    // Location validation
    if (profileData.location.length > limits.location) {
      errors.location = `Location must not exceed ${limits.location} characters`;
    }

    // Twitter validation
    if (profileData.twitter.length > limits.twitter) {
      errors.twitter = `Twitter handle must not exceed ${limits.twitter} characters`;
    }

    // Instagram validation
    if (profileData.instagram.length > limits.instagram) {
      errors.instagram = `Instagram handle must not exceed ${limits.instagram} characters`;
    }

    return errors;
  }, [profileData, limits]);

  const validatePasswordData = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "New passwords do not match";
    }

    return errors;
  }, [passwordData]);

  // Debounced validation using debounce from utils
  const debouncedValidateProfile = useCallback(
    debounce(() => {
      const errors = validateProfileData();
      setValidationErrors(errors);
    }, 300),
    [validateProfileData]
  );

  // Fetch user profile data when session is available
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user) return;

      try {
        setInitialLoading(true);
        const response = await fetch("/api/profile");

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();

        if (data.success) {
          setProfileData({
            image:
              data.data.image ||
              getUserAvatarUrl(undefined, session.user.email || ""),
            name: data.data.name || session.user.name || "",
            bio: data.data.bio || "",
            website: data.data.website || "",
            location: data.data.location || "",
            twitter: data.data.twitter || "",
            instagram: data.data.instagram || "",
            role: data.data.role || session.user.role || "USER",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        // Set default values from session if API fails - using getUserAvatarUrl
        setProfileData({
          image: getUserAvatarUrl(undefined, session.user.email || ""),
          name: session.user.name || "",
          bio: "",
          website: "",
          location: "",
          twitter: "",
          instagram: "",
          role: session.user.role || "USER",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [session, status]);

  // Trigger validation when profile data changes
  useEffect(() => {
    if (profileData.name || profileData.website || profileData.bio) {
      debouncedValidateProfile();
    }
  }, [profileData, debouncedValidateProfile]);

  // Show loading state while checking authentication
  if (status === "loading" || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl mx-auto p-4">
          <div className="bg-gray-200 h-8 rounded-lg w-48"></div>
          <div className="bg-gray-200 h-32 rounded-lg"></div>
          <div className="bg-gray-200 h-10 rounded-lg"></div>
          <div className="bg-gray-200 h-10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Show error state if not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            {/* Lock Icon */}
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Authentication Required
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
              You need to be logged in to create an event. Please sign in to
              your account to continue.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <Link href="/auth/login">Sign In</Link>
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                <Link href="/">Back to Home</Link>
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user can save profile (for organizer role change)
  const canSaveProfile = (): boolean => {
    if (profileData.role === "ORGANIZER") {
      const socialProofs = [
        profileData.website,
        profileData.twitter,
        profileData.instagram,
      ].filter(Boolean);
      return socialProofs.length >= 2;
    }
    return Object.keys(validateProfileData()).length === 0;
  };

  const getSocialProofCount = (): number => {
    return [
      profileData.website,
      profileData.twitter,
      profileData.instagram,
    ].filter(Boolean).length;
  };

  const handleProfileInputChange = (
    field: keyof ProfileData,
    value: string
  ) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handlePasswordInputChange = (
    field: keyof PasswordData,
    value: string
  ) => {
    setPasswordData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear specific field error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const errors = validateProfileData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setProfileMessage({
        type: "error",
        text: "Please fix the errors below before submitting.",
      });
      return;
    }

    setIsLoading(true);
    setProfileMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setProfileMessage({
        type: "success",
        text: data.message || "Profile updated successfully!",
      });

      // Update local state with returned data
      setProfileData((prev) => ({
        ...prev,
        ...data.data,
      }));

      // Clear validation errors on success
      setValidationErrors({});
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error), // Using getErrorMessage from utils
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate form
    const errors = validatePasswordData();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setPasswordMessage({
        type: "error",
        text: "Please fix the errors below before submitting.",
      });
      return;
    }

    setIsLoading(true);
    setPasswordMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setPasswordMessage({
        type: "success",
        text: data.message || "Password updated successfully!",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Clear validation errors on success
      setValidationErrors({});
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: getErrorMessage(error), // Using getErrorMessage from utils
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setProfileMessage({
          type: "error",
          text: "Image size must be less than 2MB",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setProfileMessage({
          type: "error",
          text: "Please select a valid image file",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        handleProfileInputChange("image", e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabChange = (tab: "profile" | "password") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    // Clear messages and errors when switching tabs
    setProfileMessage({ type: "", text: "" });
    setPasswordMessage({ type: "", text: "" });
    setValidationErrors({});
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    switch (field) {
      case "current":
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case "new":
        setShowNewPassword(!showNewPassword);
        break;
      case "confirm":
        setShowConfirmPassword(!showConfirmPassword);
        break;
    }
  };

  const renderFieldError = (field: string) => {
    if (validationErrors[field]) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {validationErrors[field]}
        </p>
      );
    }
    return null;
  };

  const renderMessage = (message: Message) => {
    if (!message.text) return null;

    return (
      <div
        className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}
      >
        {message.type === "success" ? (
          <Check className="w-5 h-5 flex-shrink-0" />
        ) : (
          <X className="w-5 h-5 flex-shrink-0" />
        )}
        <span className="text-sm lg:text-base">{message.text}</span>
      </div>
    );
  };

  const renderInputWithIcon = (
    type: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    field: string,
    maxLength?: number
  ) => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full pl-10 pr-3 lg:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
          validationErrors[field] ? "border-red-300" : "border-gray-300"
        }`}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );

  // Enhanced bio display with truncation for preview
  const renderBioPreview = () => {
    if (!profileData.bio) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
        <strong>Preview:</strong> {truncateText(profileData.bio, 100)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Account Settings
              </h1>
              <p className="text-sm text-gray-600">Manage your account</p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
              title="Toggle Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-6 pb-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Account Settings
            </h1>
            <p className="text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation */}
        <div
          className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => handleTabChange("profile")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "profile"
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Account info
            </button>
            <button
              onClick={() => handleTabChange("password")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                activeTab === "password"
                  ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        <div className="lg:flex lg:gap-8 lg:p-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => handleTabChange("profile")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Account info
              </button>
              <button
                onClick={() => handleTabChange("password")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "password"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Change Password
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 lg:p-0">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
                  Profile Information
                </h2>
                <form
                  onSubmit={handleProfileSubmit}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* Profile Image - Enhanced with getUserAvatarUrl fallback */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        {profileData.image ? (
                          <img
                            src={profileData.image}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getUserAvatarUrl(
                              undefined,
                              session?.user?.email || ""
                            )}
                            alt="Default Avatar"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-transparent border border-gray-300 text-gray-600 p-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors shadow-md">
                        <Camera className="w-4 h-4 lg:w-5 lg:h-5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 text-sm lg:text-base">
                        Profile Photo
                      </h3>
                      <p className="text-xs lg:text-sm text-gray-500 mt-1">
                        JPG, PNG or GIF. Max size 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        handleProfileInputChange("name", e.target.value)
                      }
                      className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                        validationErrors.name
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                      placeholder="Enter your name"
                      required
                    />
                    {renderFieldError("name")}
                  </div>

                  {/* Bio - Enhanced with preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <div className="relative">
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (newValue.length <= limits.bio) {
                            handleProfileInputChange("bio", newValue);
                          }
                        }}
                        rows={4}
                        className={`w-full px-3 lg:px-4 py-2 pb-6 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base resize-none ${
                          validationErrors.bio
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Tell us about yourself"
                        maxLength={limits.bio}
                      />
                      <div
                        className={`absolute bottom-2 right-2 text-xs px-1 rounded ${
                          profileData.bio.length > limits.bio * 0.9
                            ? "text-red-500 bg-red-50"
                            : "text-gray-500 bg-white"
                        }`}
                      >
                        {profileData.bio.length}/{limits.bio}
                      </div>
                    </div>
                    {renderFieldError("bio")}
                    {renderBioPreview()}
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    {renderInputWithIcon(
                      "url",
                      profileData.website,
                      (value) => handleProfileInputChange("website", value),
                      "https://your-website.com",
                      <Globe className="w-4 h-4" />,
                      "website",
                      limits.website
                    )}
                    {renderFieldError("website")}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    {renderInputWithIcon(
                      "text",
                      profileData.location,
                      (value) => handleProfileInputChange("location", value),
                      "Your location",
                      <MapPin className="w-4 h-4" />,
                      "location",
                      limits.location
                    )}
                    {renderFieldError("location")}
                  </div>

                  {/* Social Media */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Twitter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter
                      </label>
                      {renderInputWithIcon(
                        "text",
                        profileData.twitter,
                        (value) => handleProfileInputChange("twitter", value),
                        "@yourusername",
                        <RiTwitterXLine className="w-4 h-4" />,
                        "twitter",
                        limits.twitter
                      )}
                      {renderFieldError("twitter")}
                    </div>

                    {/* Instagram */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram
                      </label>
                      {renderInputWithIcon(
                        "text",
                        profileData.instagram,
                        (value) => handleProfileInputChange("instagram", value),
                        "@yourusername",
                        <PiInstagramLogo className="w-4 h-4" />,
                        "instagram",
                        limits.instagram
                      )}
                      {renderFieldError("instagram")}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label
                      htmlFor="role-select"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Role
                    </label>
                    <select
                      id="role-select"
                      value={profileData.role}
                      onChange={(e) =>
                        handleProfileInputChange("role", e.target.value)
                      }
                      disabled={
                        profileData.role === "ORGANIZER" ||
                        profileData.role === "ADMIN"
                      }
                      className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                        profileData.role === "ORGANIZER" ||
                        profileData.role === "ADMIN"
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="USER">User</option>
                      <option value="ORGANIZER">Organizer</option>
                    </select>

                    {/* Social Proof Requirement Notice */}
                    {profileData.role === "ORGANIZER" && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs lg:text-sm">
                          <p className="text-blue-800 font-medium">
                            Organizer Social Proof Required
                          </p>
                          <p className="text-blue-700 mt-1">
                            Please fill in at least 2 social proof fields
                            (Website, Twitter, or Instagram) to become an
                            organizer.
                          </p>
                          <p className="text-blue-600 mt-1">
                            Current social proofs: {getSocialProofCount()}/2
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile Success/Error Messages */}
                  {renderMessage(profileMessage)}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || !canSaveProfile()}
                      className={`w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-all text-sm lg:text-base ${
                        canSaveProfile() && !isLoading
                          ? "bg-[#312c55] text-white hover:bg-black"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {isLoading ? "Saving..." : "Save my Profile"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
                  Change Password
                </h2>
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-4 lg:space-y-6"
                >
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          handlePasswordInputChange(
                            "currentPassword",
                            e.target.value
                          )
                        }
                        className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                          validationErrors.currentPassword
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter your current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("current")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                    {renderFieldError("currentPassword")}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          handlePasswordInputChange(
                            "newPassword",
                            e.target.value
                          )
                        }
                        className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                          validationErrors.newPassword
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Enter your new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("new")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                    {renderFieldError("newPassword")}
                    <div className="mt-2 text-xs lg:text-sm text-gray-500">
                      Password must be at least 8 characters long
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          handlePasswordInputChange(
                            "confirmPassword",
                            e.target.value
                          )
                        }
                        className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
                          validationErrors.confirmPassword
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                        placeholder="Confirm your new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility("confirm")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                    {renderFieldError("confirmPassword")}
                  </div>

                  {/* Password Success/Error Messages */}
                  {renderMessage(passwordMessage)}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        Object.keys(validatePasswordData()).length > 0
                      }
                      className={`w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-all text-sm lg:text-base ${
                        Object.keys(validatePasswordData()).length === 0 &&
                        !isLoading
                          ? "bg-[#312c55] text-white hover:bg-black"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {isLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
