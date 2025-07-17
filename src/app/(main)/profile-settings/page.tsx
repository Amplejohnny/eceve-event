"use client";

import { useState, useEffect } from "react";
import ProfileSettings from "@/components/settings/ProfileSettings";
import ProfileSettingsSkeleton from "@/components/settings/ProfileSettingsSkeleton";

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

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (response.ok) {
          setProfileData(data.data);
        } else {
          setError(data.error || "Failed to load profile data");
        }
      } catch (error) {
        console.error("Error loading profile data:", error);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, []);

  if (isLoading) {
    return <ProfileSettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 lg:bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Profile
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // This should never happen, but adding for type safety
  if (!profileData) {
    return <ProfileSettingsSkeleton />;
  }

  return <ProfileSettings />;
}
