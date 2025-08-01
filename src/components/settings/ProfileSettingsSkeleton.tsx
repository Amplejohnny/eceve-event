import React from "react";
import { Menu } from "lucide-react";

// Skeleton utility components
const SkeletonLine = ({
  className = "",
  width = "w-full",
}): React.JSX.Element => (
  <div
    className={`${width} h-4 bg-gray-200 rounded animate-pulse ${className}`}
  />
);

const SkeletonCircle = ({ size = "w-24 h-24" }): React.JSX.Element => (
  <div className={`${size} bg-gray-200 rounded-full animate-pulse`} />
);

const SkeletonInput = ({ className = "" }): React.JSX.Element => (
  <div
    className={`w-full h-10 bg-gray-200 rounded-lg animate-pulse ${className}`}
  />
);

const SkeletonTextarea = ({ className = "" }): React.JSX.Element => (
  <div
    className={`w-full h-24 bg-gray-200 rounded-lg animate-pulse ${className}`}
  />
);

const SkeletonButton = ({ className = "" }): React.JSX.Element => (
  <div
    className={`w-32 h-10 bg-gray-200 rounded-lg animate-pulse ${className}`}
  />
);

const ProfileSkeleton = (): React.JSX.Element => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
    <div className="mb-4 lg:mb-6">
      <SkeletonLine width="w-48" className="h-6" />
    </div>

    <div className="space-y-4 lg:space-y-6">
      {/* Profile Image Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
        <div className="relative flex-shrink-0">
          <SkeletonCircle size="w-24 h-24 lg:w-28 lg:h-28" />
        </div>
        <div className="flex-1">
          <SkeletonLine width="w-32" className="mb-2" />
          <SkeletonLine width="w-48" className="h-3" />
        </div>
      </div>

      {/* Name Skeleton */}
      <div>
        <SkeletonLine width="w-16" className="mb-2" />
        <SkeletonInput />
      </div>

      {/* Bio Skeleton */}
      <div>
        <SkeletonLine width="w-12" className="mb-2" />
        <SkeletonTextarea />
      </div>

      {/* Website Skeleton */}
      <div>
        <SkeletonLine width="w-20" className="mb-2" />
        <SkeletonInput />
      </div>

      {/* Location Skeleton */}
      <div>
        <SkeletonLine width="w-20" className="mb-2" />
        <SkeletonInput />
      </div>

      {/* Social Media Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <SkeletonLine width="w-16" className="mb-2" />
          <SkeletonInput />
        </div>
        <div>
          <SkeletonLine width="w-20" className="mb-2" />
          <SkeletonInput />
        </div>
      </div>

      {/* Role Skeleton */}
      <div>
        <SkeletonLine width="w-12" className="mb-2" />
        <SkeletonInput />
      </div>

      {/* Save Button Skeleton */}
      <div className="flex justify-end pt-4">
        <SkeletonButton />
      </div>
    </div>
  </div>
);

const ProfileSettingsSkeleton = (): React.JSX.Element => {
  return (
    <div className="min-h-screen bg-gray-50 lg:bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Mobile Header Skeleton */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <SkeletonLine width="w-40" className="h-6 mb-1" />
              <SkeletonLine width="w-32" className="h-4" />
            </div>
            <div className="p-2 text-gray-300">
              <Menu className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Desktop Header Skeleton */}
        <div className="hidden lg:block p-6 pb-0">
          <div className="mb-8">
            <SkeletonLine width="w-64" className="h-8 mb-2" />
            <SkeletonLine width="w-80" className="h-5" />
          </div>
        </div>

        <div className="lg:flex lg:gap-8 lg:p-6">
          {/* Desktop Sidebar Skeleton */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-2">
              <div className="px-4 py-3 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                <SkeletonLine width="w-24" />
              </div>
              <div className="px-4 py-3 rounded-lg">
                <SkeletonLine width="w-32" />
              </div>
            </nav>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 p-4 lg:p-0">
            <ProfileSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsSkeleton;
