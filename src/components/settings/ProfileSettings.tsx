"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
  X,
  User,
  Menu,
} from "lucide-react";

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

interface ProfileSettingsProps {
  initialData: ProfileData;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ initialData }) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: "", text: "" });
  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Profile form state - initialize with the passed data
  const [profileData, setProfileData] = useState(initialData);

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Check if user can save profile (for organizer role change)
  const canSaveProfile = () => {
    if (profileData.role === "ORGANIZER") {
      const socialProofs = [
        profileData.website,
        profileData.twitter,
        profileData.instagram,
      ].filter(Boolean);
      return socialProofs.length >= 2;
    }
    return true;
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    } catch (error) {
      setProfileMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setPasswordMessage({ type: "", text: "" });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "New passwords do not match.",
      });
      setIsLoading(false);
      return;
    }

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
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileData((prev) => ({
          ...prev,
          image: e.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getSocialProofCount = () => {
    return [
      profileData.website,
      profileData.twitter,
      profileData.instagram,
    ].filter(Boolean).length;
  };

  const handleTabChange = (tab: "profile" | "password") => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    // Clear messages when switching tabs
    setProfileMessage({ type: "", text: "" });
    setPasswordMessage({ type: "", text: "" });
  };

  const limits = {
    bio: 500,
    website: 100,
    location: 100,
    twitter: 50,
    instagram: 50,
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
                onClick={() => setActiveTab("profile")}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === "profile"
                    ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Account info
              </button>
              <button
                onClick={() => setActiveTab("password")}
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
                  {/* Profile Image */}
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
                          <User className="w-12 h-12 lg:w-14 lg:h-14 text-gray-500" />
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
                      Name
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Enter your name"
                    />
                  </div>

                  {/* Bio */}
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
                            setProfileData((prev) => ({
                              ...prev,
                              bio: newValue,
                            }));
                          }
                        }}
                        rows={4}
                        className="w-full px-3 lg:px-4 py-2 pb-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base resize-none"
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
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="https://your-website.com"
                      maxLength={limits.website}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                      placeholder="Your location"
                      maxLength={limits.location}
                    />
                  </div>

                  {/* Social Media */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {/* Twitter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter
                      </label>
                      <input
                        type="text"
                        value={profileData.twitter}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            twitter: e.target.value,
                          }))
                        }
                        className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="@yourusername"
                        maxLength={limits.twitter}
                      />
                    </div>

                    {/* Instagram */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={profileData.instagram}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            instagram: e.target.value,
                          }))
                        }
                        className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="@yourusername"
                        maxLength={limits.instagram}
                      />
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
                        setProfileData((prev) => ({
                          ...prev,
                          role: e.target.value,
                        }))
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
                  {profileMessage.text && (
                    <div
                      className={`p-4 rounded-lg flex items-center gap-2 ${
                        profileMessage.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {profileMessage.type === "success" ? (
                        <Check className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span className="text-sm lg:text-base">
                        {profileMessage.text}
                      </span>
                    </div>
                  )}

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
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            currentPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3 lg:px-4 py-2 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            newPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3 lg:px-4 py-2 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData((prev) => ({
                            ...prev,
                            confirmPassword: e.target.value,
                          }))
                        }
                        className="w-full px-3 lg:px-4 py-2 pr-10 lg:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
                        placeholder="Confirm new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
                        ) : (
                          <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Success/Error Messages */}
                  {passwordMessage.text && (
                    <div
                      className={`p-4 rounded-lg flex items-center gap-2 ${
                        passwordMessage.type === "success"
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {passwordMessage.type === "success" ? (
                        <Check className="w-5 h-5 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 flex-shrink-0" />
                      )}
                      <span className="text-sm lg:text-base">
                        {passwordMessage.text}
                      </span>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-colors text-sm lg:text-base ${
                        !isLoading
                          ? "bg-[#312c55] text-white hover:bg-black"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
