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
  Globe,
  MapPin,
  User,
} from "lucide-react";
import { FaXTwitter, FaLinkedinIn } from "react-icons/fa6";
import { PiInstagramLogo } from "react-icons/pi";
import {
  isValidUrl,
  getErrorMessage,
  debounce,
  truncateText,
} from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import ProfileSettingsSkeleton from "./ProfileSettingsSkeleton";

interface ProfileData {
  image: string;
  name: string;
  bio: string;
  website: string;
  linkedin: string;
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

// Field limits
const limits = {
  bio: 500,
  website: 100,
  linkedin: 100,
  location: 100,
  twitter: 50,
  instagram: 50,
};

interface ProfileSettingsProps {
  initialData?: ProfileData | null;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ initialData }) => {
  const { data: session, status, update } = useSession();
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
  const [originalRole, setOriginalRole] = useState<string>(
    () => initialData?.role || session?.user?.role || "USER"
  );

  // Profile form state - initialize with default values
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    if (initialData) {
      return {
        image: initialData.image || "",
        name: initialData.name || session?.user?.name || "",
        bio: initialData.bio || "",
        website: initialData.website || "",
        linkedin: initialData.linkedin || "",
        location: initialData.location || "",
        twitter: initialData.twitter || "",
        instagram: initialData.instagram || "",
        role: initialData.role || "USER",
      };
    }
    return {
      image: "",
      name: session?.user?.name || "",
      bio: "",
      website: "",
      linkedin: "",
      location: "",
      twitter: "",
      instagram: "",
      role: "USER",
    };
  });

  // Password form state
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Loading state for initial data fetch
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
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  const isDataLoaded = Boolean(
    session?.user && (profileData.name || session.user.name) && profileData.role
  );

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

    //LinkedIn validation using isValidUrl from utils
    if (profileData.linkedin && !isValidUrl(profileData.linkedin)) {
      errors.linkedin = "Please enter a valid LinkedIn URL";
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
  }, [profileData]);

  // Add this enhanced password strength calculation function
  const calculatePasswordStrength = useCallback(
    (
      password: string
    ): {
      score: number;
      criteria: {
        length: boolean;
        lowercase: boolean;
        uppercase: boolean;
        number: boolean;
        special: boolean;
      };
    } => {
      const criteria = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      const score = Object.values(criteria).filter(Boolean).length;
      return { score, criteria };
    },
    []
  );

  // Add these utility functions for password strength display
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

  // Add these useEffect hooks for real-time validation
  useEffect(() => {
    if (passwordData.newPassword) {
      setPasswordStrength(calculatePasswordStrength(passwordData.newPassword));
    }
  }, [passwordData.newPassword, calculatePasswordStrength]);

  useEffect(() => {
    if (passwordData.newPassword && passwordData.confirmPassword) {
      setPasswordsMatch(
        passwordData.newPassword === passwordData.confirmPassword
      );
    } else {
      setPasswordsMatch(null);
    }
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  // Update the validatePasswordData function
  const validatePasswordData = useCallback((): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "New password must be at least 8 characters";
    } else if (passwordData.newPassword.length > 128) {
      errors.newPassword = "Password must be less than 128 characters";
    } else if (passwordStrength.score < 3) {
      errors.newPassword =
        "Password is too weak. Please meet more requirements.";
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "New passwords do not match";
    }

    return errors;
  }, [passwordData, passwordStrength.score]);

  // Debounced validation using debounce from utils
  const debouncedValidateProfile = debounce(() => {
    const errors = validateProfileData();
    setValidationErrors(errors);
  }, 300);

  // Fetch user profile data when session is available
  useEffect(() => {
    const fetchUserProfile = async (): Promise<void> => {};

    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [session, status]);

  // Trigger validation when profile data changes
  useEffect(() => {
    if (
      profileData.name ||
      profileData.website ||
      profileData.bio ||
      profileData.location ||
      profileData.twitter ||
      profileData.instagram ||
      profileData.linkedin
    ) {
      debouncedValidateProfile();
    }
  }, [profileData, debouncedValidateProfile]);

  useEffect(() => {
    if (session?.user && !initialData) {
      setProfileData((prev) => ({
        ...prev,
        name: prev.name || session.user.name || "",
        role: prev.role || session.user.role || "USER",
      }));
      setOriginalRole(session.user.role || "USER");
    }
  }, [session, initialData]);

  if (status === "loading" || !isDataLoaded) {
    return <ProfileSettingsSkeleton />;
  }

  // Show error state if not authenticated
  if (!session?.user) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-4 md:py-25">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 text-center">
            {/* Lock Icon */}
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
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
            <p className="text-gray-600 mb-5 leading-relaxed text-sm">
              You need to be logged in to access your profile. Please sign in to
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
            <div className="mt-3 pt-3 border-t border-gray-200">
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
        profileData.linkedin,
        profileData.twitter,
        profileData.instagram,
      ].filter(Boolean);
      return socialProofs.length >= 1;
    }
    return Object.keys(validateProfileData()).length === 0;
  };

  const getSocialProofCount = (): number => {
    return [
      profileData.website,
      profileData.linkedin,
      profileData.twitter,
      profileData.instagram,
    ].filter(Boolean).length;
  };

  const handleProfileInputChange = (
    field: keyof ProfileData,
    value: string
  ): void => {
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
  ): void => {
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

  const handleProfileSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
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
      // IMPORTANT: Refresh the session if role was updated
      if (data.data.role && data.data.role !== session?.user?.role) {
        try {
          // Force session refresh by calling update
          await update();

          // Show success message for role change
          setProfileMessage({
            type: "success",
            text: `Profile updated successfully! Your role has been changed to ${data.data.role}. The page will refresh to apply changes.`,
          });

          // Force page refresh after 2 seconds to ensure navbar updates
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error) {
          console.error("Session update failed:", error);
          // Still show success but mention refresh needed
          setProfileMessage({
            type: "success",
            text: `Profile updated successfully! Please refresh the page to see your new role.`,
          });
        }
      }
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
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
      reader.onload = (e): void => {
        handleProfileInputChange("image", e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTabChange = (tab: "profile" | "password"): void => {
    setActiveTab(tab);
    // Clear messages and errors when switching tabs
    setProfileMessage({ type: "", text: "" });
    setPasswordMessage({ type: "", text: "" });
    setValidationErrors({});
  };

  const togglePasswordVisibility = (
    field: "current" | "new" | "confirm"
  ): void => {
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

  const renderFieldError = (field: string): React.JSX.Element | null => {
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

  const renderMessage = (message: Message): React.JSX.Element | null => {
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
  ): React.JSX.Element => (
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
  const renderBioPreview = (): React.JSX.Element | null => {
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Account Settings
            </h1>
            <p className="text-sm text-gray-600">Manage your account</p>
          </div>
        </div>

        {/* Mobile Inline Tabs */}
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => handleTabChange("profile")}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Account Info
            </button>
            <button
              onClick={() => handleTabChange("password")}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "password"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Change Password
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

        <div className="lg:flex lg:gap-8 lg:p-6">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-2">
              <button
                onClick={() => handleTabChange("profile")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
                  activeTab === "profile"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Account info
              </button>
              <button
                onClick={() => handleTabChange("password")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium cursor-pointer transition-colors ${
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
                  {/* Profile Image */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
                    <div className="relative flex-shrink-0 self-start sm:self-auto">
                      <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                        {profileData.image ? (
                          <Image
                            src={profileData.image}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            width={112}
                            height={112}
                          />
                        ) : (
                          <User className="w-12 h-12 lg:w-14 lg:h-14 text-gray-500" />
                        )}
                      </div>
                      <label className="absolute -bottom-0.5 -right-0.5 w-8 h-8 lg:w-9 lg:h-9 bg-white border-2 border-gray-300 text-gray-600 rounded-full cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-lg flex items-center justify-center group z-10">
                        <Camera className="w-4 h-4 group-hover:text-gray-700 transition-colors" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          aria-label="Upload profile photo"
                        />

                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-20">
                          Change photo
                          <div className="absolute top-full right-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
                        </div>
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
                    {/* LinkedIn */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LinkedIn
                      </label>
                      {renderInputWithIcon(
                        "url",
                        profileData.linkedin,
                        (value) => handleProfileInputChange("linkedin", value),
                        "https://www.linkedin.com/in/yourusername",
                        <FaLinkedinIn className="w-4 h-4" />,
                        "linkedin",
                        limits.linkedin
                      )}
                      {renderFieldError("linkedin")}
                    </div>

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
                        <FaXTwitter className="w-4 h-4" />,
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Account Role
                    </label>

                    {/* Role Cards */}
                    <div className="space-y-3">
                      {/* User Role Card */}
                      <div
                        className={`relative p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          profileData.role === "USER"
                            ? "border-blue-500 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        } ${
                          // Only disable if the original role is ORGANIZER or ADMIN
                          originalRole === "ORGANIZER" ||
                          originalRole === "ADMIN"
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }`}
                        onClick={() => {
                          // Only allow role change if original role is USER
                          if (originalRole === "USER") {
                            handleProfileInputChange("role", "USER");
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              profileData.role === "USER"
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {profileData.role === "USER" && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-gray-600" />
                              <h3 className="font-semibold text-gray-900">
                                User
                              </h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Browse and attend events, manage your profile, and
                              discover amazing experiences in your area.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Browse Events
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Join Events
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Manage Profile
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Locked state indicator - only show if original role is ORGANIZER or ADMIN */}
                        {(originalRole === "ORGANIZER" ||
                          originalRole === "ADMIN") && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Organizer Role Card */}
                      <div
                        className={`relative p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          profileData.role === "ORGANIZER"
                            ? "border-purple-500 bg-purple-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        } ${
                          // Only disable if the original role is ORGANIZER or ADMIN
                          originalRole === "ORGANIZER" ||
                          originalRole === "ADMIN"
                            ? "cursor-not-allowed opacity-60"
                            : ""
                        }`}
                        onClick={() => {
                          // Only allow role change if original role is USER
                          if (originalRole === "USER") {
                            handleProfileInputChange("role", "ORGANIZER");
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              profileData.role === "ORGANIZER"
                                ? "border-purple-500 bg-purple-500"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {profileData.role === "ORGANIZER" && (
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-4 h-4 text-gray-600">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </div>
                              <h3 className="font-semibold text-gray-900">
                                Event Organizer
                              </h3>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                Premium
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Create and manage events, build your community,
                              and grow your audience with advanced organizer
                              tools.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Create Events
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Analytics
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                Promotion Tools
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Locked state indicator - only show if original role is ORGANIZER or ADMIN */}
                        {(originalRole === "ORGANIZER" ||
                          originalRole === "ADMIN") && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hidden select for form submission */}
                    <select
                      title="Select Role"
                      id="role-select"
                      value={profileData.role}
                      onChange={(e) =>
                        handleProfileInputChange("role", e.target.value)
                      }
                      className="sr-only"
                      tabIndex={-1}
                    >
                      <option value="USER">User</option>
                      <option value="ORGANIZER">Organizer</option>
                    </select>

                    {/* Social Proof Requirement Notice */}
                    {profileData.role === "ORGANIZER" && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">
                              Organizer Verification Required
                            </h4>
                            <p className="text-sm text-blue-800 mb-3 leading-relaxed">
                              To maintain event quality and trust, organizers
                              must provide at least one social proof
                              verification from the options below.
                            </p>

                            {/* Progress indicator */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-blue-700">
                                  Verification Progress
                                </span>
                                <span className="text-xs font-medium text-blue-700">
                                  {getSocialProofCount()}/4
                                </span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    getSocialProofCount() >= 1
                                      ? "bg-green-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      (getSocialProofCount() / 1) * 100,
                                      100
                                    )}%`,
                                  }}
                                ></div>
                              </div>
                            </div>

                            {/* Social proof checklist */}
                            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                              <div
                                className={`flex items-center gap-2 text-xs ${
                                  profileData.website
                                    ? "text-green-700"
                                    : "text-blue-600"
                                }`}
                              >
                                {profileData.website ? (
                                  <Check className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <div className="w-3 h-3 border border-current rounded-sm flex-shrink-0"></div>
                                )}
                                <span className="truncate">Website URL</span>
                              </div>
                              <div
                                className={`flex items-center gap-2 text-xs ${
                                  profileData.linkedin
                                    ? "text-green-700"
                                    : "text-blue-600"
                                }`}
                              >
                                {profileData.linkedin ? (
                                  <Check className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <div className="w-3 h-3 border border-current rounded-sm flex-shrink-0"></div>
                                )}
                                <span className="truncate">LinkedIn URL</span>
                              </div>
                              <div
                                className={`flex items-center gap-2 text-xs ${
                                  profileData.twitter
                                    ? "text-green-700"
                                    : "text-blue-600"
                                }`}
                              >
                                {profileData.twitter ? (
                                  <Check className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <div className="w-3 h-3 border border-current rounded-sm flex-shrink-0"></div>
                                )}
                                <span className="truncate">
                                  Twitter Profile
                                </span>
                              </div>
                              <div
                                className={`flex items-center gap-2 text-xs ${
                                  profileData.instagram
                                    ? "text-green-700"
                                    : "text-blue-600"
                                }`}
                              >
                                {profileData.instagram ? (
                                  <Check className="w-3 h-3 flex-shrink-0" />
                                ) : (
                                  <div className="w-3 h-3 border border-current rounded-sm flex-shrink-0"></div>
                                )}
                                <span className="truncate">
                                  Instagram Profile
                                </span>
                              </div>
                            </div>

                            {getSocialProofCount() >= 2 && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 sm:px-3 py-2 rounded-lg">
                                <Check className="w-3 h-3 flex-shrink-0" />
                                <span className="font-medium">
                                  Verification requirements met!
                                </span>
                              </div>
                            )}
                          </div>
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
                          ? "bg-[#312c55] text-white cursor-pointer hover:bg-black"
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
                        maxLength={128}
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

                    {/* Password strength indicator */}
                    {passwordData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">
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
                        <div className="text-xs space-y-1">
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
                                    met ? "text-green-500" : "text-gray-500"
                                  }`}
                                >
                                  {key === "length" && "At least 8 characters"}
                                  {key === "lowercase" &&
                                    "One lowercase letter"}
                                  {key === "uppercase" &&
                                    "One uppercase letter"}
                                  {key === "number" && "One number"}
                                  {key === "special" && "One special character"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {renderFieldError("newPassword")}
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
                            : passwordsMatch === false
                            ? "border-orange-500"
                            : passwordsMatch === true
                            ? "border-green-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Confirm your new password"
                        required
                      />
                      <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                        {passwordData.confirmPassword &&
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

                    {passwordData.confirmPassword &&
                      passwordsMatch === false && (
                        <p
                          className="text-orange-500 text-xs mt-1"
                          role="alert"
                        >
                          Passwords don't match
                        </p>
                      )}

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
