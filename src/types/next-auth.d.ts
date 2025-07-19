// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role?: string;
      image?: string | null;
      emailVerified?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
    image?: string | null;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    emailVerified?: boolean;
  }
}


// ("use client");

// import React, { useState, useEffect, useCallback } from "react";
// import { useSession } from "next-auth/react";
// import {
//   Camera,
//   AlertCircle,
//   Eye,
//   EyeOff,
//   Check,
//   X,
//   User,
//   Menu,
//   Globe,
//   MapPin,
// } from "lucide-react";
// import { RiTwitterXLine } from "react-icons/ri";
// import { PiInstagramLogo } from "react-icons/pi";
// import { isValidUrl, getErrorMessage, debounce } from "@/lib/utils";

// interface ProfileData {
//   image: string;
//   name: string;
//   bio: string;
//   website: string;
//   location: string;
//   twitter: string;
//   instagram: string;
//   role: string;
// }

// interface Message {
//   type: "success" | "error" | "";
//   text: string;
// }

// interface PasswordData {
//   currentPassword: string;
//   newPassword: string;
//   confirmPassword: string;
// }

// interface ValidationErrors {
//   [key: string]: string;
// }

// const ProfileSettings: React.FC = () => {
//   const { data: session, status } = useSession();
//   const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false);
//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [profileMessage, setProfileMessage] = useState<Message>({
//     type: "",
//     text: "",
//   });
//   const [passwordMessage, setPasswordMessage] = useState<Message>({
//     type: "",
//     text: "",
//   });
//   const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
//     {}
//   );
//   const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

//   // Profile form state - initialize with default values
//   const [profileData, setProfileData] = useState<ProfileData>({
//     image: "",
//     name: "",
//     bio: "",
//     website: "",
//     location: "",
//     twitter: "",
//     instagram: "",
//     role: "USER",
//   });

//   // Password form state
//   const [passwordData, setPasswordData] = useState<PasswordData>({
//     currentPassword: "",
//     newPassword: "",
//     confirmPassword: "",
//   });

//   // Loading state for initial data fetch
//   const [initialLoading, setInitialLoading] = useState(true);

//   // Field limits
//   const limits = {
//     bio: 500,
//     website: 100,
//     location: 100,
//     twitter: 50,
//     instagram: 50,
//   };

//   // Validation functions
//   const validateProfileData = useCallback((): ValidationErrors => {
//     const errors: ValidationErrors = {};

//     // Name validation
//     if (!profileData.name.trim()) {
//       errors.name = "Name is required";
//     } else if (profileData.name.length < 2) {
//       errors.name = "Name must be at least 2 characters";
//     }

//     // Website validation
//     if (profileData.website && !isValidUrl(profileData.website)) {
//       errors.website = "Please enter a valid website URL";
//     }

//     // Bio validation
//     if (profileData.bio.length > limits.bio) {
//       errors.bio = `Bio must not exceed ${limits.bio} characters`;
//     }

//     // Location validation
//     if (profileData.location.length > limits.location) {
//       errors.location = `Location must not exceed ${limits.location} characters`;
//     }

//     // Twitter validation
//     if (profileData.twitter.length > limits.twitter) {
//       errors.twitter = `Twitter handle must not exceed ${limits.twitter} characters`;
//     }

//     // Instagram validation
//     if (profileData.instagram.length > limits.instagram) {
//       errors.instagram = `Instagram handle must not exceed ${limits.instagram} characters`;
//     }

//     return errors;
//   }, [profileData, limits]);

//   const validatePasswordData = useCallback((): ValidationErrors => {
//     const errors: ValidationErrors = {};

//     if (!passwordData.currentPassword) {
//       errors.currentPassword = "Current password is required";
//     }

//     if (!passwordData.newPassword) {
//       errors.newPassword = "New password is required";
//     } else if (passwordData.newPassword.length < 8) {
//       errors.newPassword = "New password must be at least 8 characters";
//     }

//     if (!passwordData.confirmPassword) {
//       errors.confirmPassword = "Please confirm your new password";
//     } else if (passwordData.newPassword !== passwordData.confirmPassword) {
//       errors.confirmPassword = "New passwords do not match";
//     }

//     return errors;
//   }, [passwordData]);

//   // Debounced validation
//   const debouncedValidateProfile = useCallback(
//     debounce(() => {
//       const errors = validateProfileData();
//       setValidationErrors(errors);
//     }, 300),
//     [validateProfileData]
//   );

//   // Fetch user profile data when session is available
//   useEffect(() => {
//     const fetchUserProfile = async () => {
//       if (!session?.user) return;

//       try {
//         setInitialLoading(true);
//         const response = await fetch("/api/profile");

//         if (!response.ok) {
//           throw new Error("Failed to fetch profile");
//         }

//         const data = await response.json();

//         if (data.success) {
//           setProfileData({
//             image: data.data.image || "",
//             name: data.data.name || session.user.name || "",
//             bio: data.data.bio || "",
//             website: data.data.website || "",
//             location: data.data.location || "",
//             twitter: data.data.twitter || "",
//             instagram: data.data.instagram || "",
//             role: data.data.role || session.user.role || "USER",
//           });
//         }
//       } catch (error) {
//         console.error("Error fetching profile:", error);
//         // Set default values from session if API fails
//         setProfileData({
//           image: "",
//           name: session.user.name || "",
//           bio: "",
//           website: "",
//           location: "",
//           twitter: "",
//           instagram: "",
//           role: session.user.role || "USER",
//         });
//       } finally {
//         setInitialLoading(false);
//       }
//     };

//     if (status === "authenticated") {
//       fetchUserProfile();
//     }
//   }, [session, status]);

//   // Trigger validation when profile data changes
//   useEffect(() => {
//     if (profileData.name || profileData.website || profileData.bio) {
//       debouncedValidateProfile();
//     }
//   }, [profileData, debouncedValidateProfile]);

//   // Show loading state while checking authentication
//   if (status === "loading" || initialLoading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-pulse space-y-4 w-full max-w-2xl mx-auto p-4">
//           <div className="bg-gray-200 h-8 rounded-lg w-48"></div>
//           <div className="bg-gray-200 h-32 rounded-lg"></div>
//           <div className="bg-gray-200 h-10 rounded-lg"></div>
//           <div className="bg-gray-200 h-10 rounded-lg"></div>
//         </div>
//       </div>
//     );
//   }

//   // Show error state if not authenticated
//   if (!session?.user) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//         <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 max-w-md w-full">
//           <h3 className="font-medium mb-2">Authentication Required</h3>
//           <p>Please log in to access your profile settings.</p>
//         </div>
//       </div>
//     );
//   }

//   // Check if user can save profile (for organizer role change)
//   const canSaveProfile = (): boolean => {
//     if (profileData.role === "ORGANIZER") {
//       const socialProofs = [
//         profileData.website,
//         profileData.twitter,
//         profileData.instagram,
//       ].filter(Boolean);
//       return socialProofs.length >= 2;
//     }
//     return Object.keys(validateProfileData()).length === 0;
//   };

//   const getSocialProofCount = (): number => {
//     return [
//       profileData.website,
//       profileData.twitter,
//       profileData.instagram,
//     ].filter(Boolean).length;
//   };

//   const handleProfileInputChange = (
//     field: keyof ProfileData,
//     value: string
//   ) => {
//     setProfileData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));

//     // Clear specific field error when user starts typing
//     if (validationErrors[field]) {
//       setValidationErrors((prev) => ({
//         ...prev,
//         [field]: "",
//       }));
//     }
//   };

//   const handlePasswordInputChange = (
//     field: keyof PasswordData,
//     value: string
//   ) => {
//     setPasswordData((prev) => ({
//       ...prev,
//       [field]: value,
//     }));

//     // Clear specific field error when user starts typing
//     if (validationErrors[field]) {
//       setValidationErrors((prev) => ({
//         ...prev,
//         [field]: "",
//       }));
//     }
//   };

//   const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     // Validate form
//     const errors = validateProfileData();
//     if (Object.keys(errors).length > 0) {
//       setValidationErrors(errors);
//       setProfileMessage({
//         type: "error",
//         text: "Please fix the errors below before submitting.",
//       });
//       return;
//     }

//     setIsLoading(true);
//     setProfileMessage({ type: "", text: "" });

//     try {
//       const response = await fetch("/api/profile", {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(profileData),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to update profile");
//       }

//       setProfileMessage({
//         type: "success",
//         text: data.message || "Profile updated successfully!",
//       });

//       // Update local state with returned data
//       setProfileData((prev) => ({
//         ...prev,
//         ...data.data,
//       }));

//       // Clear validation errors on success
//       setValidationErrors({});
//     } catch (error) {
//       setProfileMessage({
//         type: "error",
//         text: getErrorMessage(error),
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     // Validate form
//     const errors = validatePasswordData();
//     if (Object.keys(errors).length > 0) {
//       setValidationErrors(errors);
//       setPasswordMessage({
//         type: "error",
//         text: "Please fix the errors below before submitting.",
//       });
//       return;
//     }

//     setIsLoading(true);
//     setPasswordMessage({ type: "", text: "" });

//     try {
//       const response = await fetch("/api/profile/password", {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(passwordData),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to update password");
//       }

//       setPasswordMessage({
//         type: "success",
//         text: data.message || "Password updated successfully!",
//       });

//       setPasswordData({
//         currentPassword: "",
//         newPassword: "",
//         confirmPassword: "",
//       });

//       // Clear validation errors on success
//       setValidationErrors({});
//     } catch (error) {
//       setPasswordMessage({
//         type: "error",
//         text: getErrorMessage(error),
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files && e.target.files[0];
//     if (file) {
//       // Check file size (max 2MB)
//       if (file.size > 2 * 1024 * 1024) {
//         setProfileMessage({
//           type: "error",
//           text: "Image size must be less than 2MB",
//         });
//         return;
//       }

//       // Check file type
//       if (!file.type.startsWith("image/")) {
//         setProfileMessage({
//           type: "error",
//           text: "Please select a valid image file",
//         });
//         return;
//       }

//       const reader = new FileReader();
//       reader.onload = (e) => {
//         handleProfileInputChange("image", e.target?.result as string);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   const handleTabChange = (tab: "profile" | "password") => {
//     setActiveTab(tab);
//     setIsMobileMenuOpen(false);
//     // Clear messages and errors when switching tabs
//     setProfileMessage({ type: "", text: "" });
//     setPasswordMessage({ type: "", text: "" });
//     setValidationErrors({});
//   };

//   const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
//     switch (field) {
//       case "current":
//         setShowCurrentPassword(!showCurrentPassword);
//         break;
//       case "new":
//         setShowNewPassword(!showNewPassword);
//         break;
//       case "confirm":
//         setShowConfirmPassword(!showConfirmPassword);
//         break;
//     }
//   };

//   const renderFieldError = (field: string) => {
//     if (validationErrors[field]) {
//       return (
//         <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
//           <AlertCircle className="w-4 h-4" />
//           {validationErrors[field]}
//         </p>
//       );
//     }
//     return null;
//   };

//   const renderMessage = (message: Message) => {
//     if (!message.text) return null;

//     return (
//       <div
//         className={`p-4 rounded-lg flex items-center gap-2 ${
//           message.type === "success"
//             ? "bg-green-50 text-green-800 border border-green-200"
//             : "bg-red-50 text-red-800 border border-red-200"
//         }`}
//       >
//         {message.type === "success" ? (
//           <Check className="w-5 h-5 flex-shrink-0" />
//         ) : (
//           <X className="w-5 h-5 flex-shrink-0" />
//         )}
//         <span className="text-sm lg:text-base">{message.text}</span>
//       </div>
//     );
//   };

//   const renderInputWithIcon = (
//     type: string,
//     value: string,
//     onChange: (value: string) => void,
//     placeholder: string,
//     icon: React.ReactNode,
//     field: string,
//     maxLength?: number
//   ) => (
//     <div className="relative">
//       <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
//         {icon}
//       </div>
//       <input
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className={`w-full pl-10 pr-3 lg:pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//           validationErrors[field] ? "border-red-300" : "border-gray-300"
//         }`}
//         placeholder={placeholder}
//         maxLength={maxLength}
//       />
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 lg:bg-white">
//       <div className="max-w-6xl mx-auto">
//         {/* Mobile Header */}
//         <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
//           <div className="flex items-center justify-between">
//             <div>
//               <h1 className="text-xl font-bold text-gray-900">
//                 Account Settings
//               </h1>
//               <p className="text-sm text-gray-600">Manage your account</p>
//             </div>
//             <button
//               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
//               className="p-2 text-gray-600 hover:text-gray-900"
//               title="Toggle Menu"
//             >
//               <Menu className="w-6 h-6" />
//             </button>
//           </div>
//         </div>

//         {/* Desktop Header */}
//         <div className="hidden lg:block p-6 pb-0">
//           <div className="mb-8">
//             <h1 className="text-3xl font-bold text-gray-900 mb-2">
//               Account Settings
//             </h1>
//             <p className="text-gray-600">
//               Manage your account settings and preferences
//             </p>
//           </div>
//         </div>

//         {/* Mobile Menu Overlay */}
//         {isMobileMenuOpen && (
//           <div
//             className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
//             onClick={() => setIsMobileMenuOpen(false)}
//           />
//         )}

//         {/* Mobile Navigation */}
//         <div
//           className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ${
//             isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
//           }`}
//         >
//           <div className="p-4 border-b border-gray-200">
//             <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
//           </div>
//           <nav className="p-4 space-y-2">
//             <button
//               onClick={() => handleTabChange("profile")}
//               className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
//                 activeTab === "profile"
//                   ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
//                   : "text-gray-700 hover:bg-gray-50"
//               }`}
//             >
//               Account info
//             </button>
//             <button
//               onClick={() => handleTabChange("password")}
//               className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
//                 activeTab === "password"
//                   ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
//                   : "text-gray-700 hover:bg-gray-50"
//               }`}
//             >
//               Change Password
//             </button>
//           </nav>
//         </div>

//         <div className="lg:flex lg:gap-8 lg:p-6">
//           {/* Desktop Sidebar */}
//           <div className="hidden lg:block w-64 flex-shrink-0">
//             <nav className="space-y-2">
//               <button
//                 onClick={() => handleTabChange("profile")}
//                 className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
//                   activeTab === "profile"
//                     ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
//                     : "text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 Account info
//               </button>
//               <button
//                 onClick={() => handleTabChange("password")}
//                 className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
//                   activeTab === "password"
//                     ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
//                     : "text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 Change Password
//               </button>
//             </nav>
//           </div>

//           {/* Main Content */}
//           <div className="flex-1 p-4 lg:p-0">
//             {/* Profile Tab */}
//             {activeTab === "profile" && (
//               <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
//                 <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
//                   Profile Information
//                 </h2>
//                 <form
//                   onSubmit={handleProfileSubmit}
//                   className="space-y-4 lg:space-y-6"
//                 >
//                   {/* Profile Image */}
//                   <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
//                     <div className="relative flex-shrink-0">
//                       <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
//                         {profileData.image ? (
//                           <img
//                             src={profileData.image}
//                             alt="Profile"
//                             className="w-full h-full object-cover"
//                           />
//                         ) : (
//                           <User className="w-12 h-12 lg:w-14 lg:h-14 text-gray-500" />
//                         )}
//                       </div>
//                       <label className="absolute bottom-0 right-0 bg-transparent border border-gray-300 text-gray-600 p-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors shadow-md">
//                         <Camera className="w-4 h-4 lg:w-5 lg:h-5" />
//                         <input
//                           type="file"
//                           accept="image/*"
//                           onChange={handleImageUpload}
//                           className="hidden"
//                         />
//                       </label>
//                     </div>
//                     <div className="flex-1">
//                       <h3 className="font-medium text-gray-800 text-sm lg:text-base">
//                         Profile Photo
//                       </h3>
//                       <p className="text-xs lg:text-sm text-gray-500 mt-1">
//                         JPG, PNG or GIF. Max size 2MB.
//                       </p>
//                     </div>
//                   </div>

//                   {/* Name */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Name *
//                     </label>
//                     <input
//                       type="text"
//                       value={profileData.name}
//                       onChange={(e) =>
//                         handleProfileInputChange("name", e.target.value)
//                       }
//                       className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//                         validationErrors.name
//                           ? "border-red-300"
//                           : "border-gray-300"
//                       }`}
//                       placeholder="Enter your name"
//                       required
//                     />
//                     {renderFieldError("name")}
//                   </div>

//                   {/* Bio */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Bio
//                     </label>
//                     <div className="relative">
//                       <textarea
//                         value={profileData.bio}
//                         onChange={(e) => {
//                           const newValue = e.target.value;
//                           if (newValue.length <= limits.bio) {
//                             handleProfileInputChange("bio", newValue);
//                           }
//                         }}
//                         rows={4}
//                         className={`w-full px-3 lg:px-4 py-2 pb-6 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base resize-none ${
//                           validationErrors.bio
//                             ? "border-red-300"
//                             : "border-gray-300"
//                         }`}
//                         placeholder="Tell us about yourself"
//                         maxLength={limits.bio}
//                       />
//                       <div
//                         className={`absolute bottom-2 right-2 text-xs px-1 rounded ${
//                           profileData.bio.length > limits.bio * 0.9
//                             ? "text-red-500 bg-red-50"
//                             : "text-gray-500 bg-white"
//                         }`}
//                       >
//                         {profileData.bio.length}/{limits.bio}
//                       </div>
//                     </div>
//                     {renderFieldError("bio")}
//                   </div>

//                   {/* Website */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Website
//                     </label>
//                     {renderInputWithIcon(
//                       "url",
//                       profileData.website,
//                       (value) => handleProfileInputChange("website", value),
//                       "https://your-website.com",
//                       <Globe className="w-4 h-4" />,
//                       "website",
//                       limits.website
//                     )}
//                     {renderFieldError("website")}
//                   </div>

//                   {/* Location */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Address
//                     </label>
//                     {renderInputWithIcon(
//                       "text",
//                       profileData.location,
//                       (value) => handleProfileInputChange("location", value),
//                       "Your location",
//                       <MapPin className="w-4 h-4" />,
//                       "location",
//                       limits.location
//                     )}
//                     {renderFieldError("location")}
//                   </div>

//                   {/* Social Media */}
//                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
//                     {/* Twitter */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Twitter
//                       </label>
//                       {renderInputWithIcon(
//                         "text",
//                         profileData.twitter,
//                         (value) => handleProfileInputChange("twitter", value),
//                         "@yourusername",
//                         <RiTwitterXLine className="w-4 h-4" />,
//                         "twitter",
//                         limits.twitter
//                       )}
//                       {renderFieldError("twitter")}
//                     </div>

//                     {/* Instagram */}
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 mb-2">
//                         Instagram
//                       </label>
//                       {renderInputWithIcon(
//                         "text",
//                         profileData.instagram,
//                         (value) => handleProfileInputChange("instagram", value),
//                         "@yourusername",
//                         <PiInstagramLogo className="w-4 h-4" />,
//                         "instagram",
//                         limits.instagram
//                       )}
//                       {renderFieldError("instagram")}
//                     </div>
//                   </div>

//                   {/* Role */}
//                   <div>
//                     <label
//                       htmlFor="role-select"
//                       className="block text-sm font-medium text-gray-700 mb-2"
//                     >
//                       Role
//                     </label>
//                     <select
//                       id="role-select"
//                       value={profileData.role}
//                       onChange={(e) =>
//                         handleProfileInputChange("role", e.target.value)
//                       }
//                       disabled={
//                         profileData.role === "ORGANIZER" ||
//                         profileData.role === "ADMIN"
//                       }
//                       className={`w-full px-3 lg:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//                         profileData.role === "ORGANIZER" ||
//                         profileData.role === "ADMIN"
//                           ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
//                           : "border-gray-300"
//                       }`}
//                     >
//                       <option value="USER">User</option>
//                       <option value="ORGANIZER">Organizer</option>
//                     </select>

//                     {/* Social Proof Requirement Notice */}
//                     {profileData.role === "ORGANIZER" && (
//                       <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
//                         <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
//                         <div className="text-xs lg:text-sm">
//                           <p className="text-blue-800 font-medium">
//                             Organizer Social Proof Required
//                           </p>
//                           <p className="text-blue-700 mt-1">
//                             Please fill in at least 2 social proof fields
//                             (Website, Twitter, or Instagram) to become an
//                             organizer.
//                           </p>
//                           <p className="text-blue-600 mt-1">
//                             Current social proofs: {getSocialProofCount()}/2
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Profile Success/Error Messages */}
//                   {renderMessage(profileMessage)}

//                   {/* Save Button */}
//                   <div className="flex justify-end pt-4">
//                     <button
//                       type="submit"
//                       disabled={isLoading || !canSaveProfile()}
//                       className={`w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-all text-sm lg:text-base ${
//                         canSaveProfile() && !isLoading
//                           ? "bg-[#312c55] text-white hover:bg-black"
//                           : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
//                       }`}
//                     >
//                       {isLoading ? "Saving..." : "Save my Profile"}
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             )}

//             {/* Password Tab */}
//             {activeTab === "password" && (
//               <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
//                 <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
//                   Change Password
//                 </h2>
//                 <form
//                   onSubmit={handlePasswordSubmit}
//                   className="space-y-4 lg:space-y-6"
//                 >
//                   {/* Current Password */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Current Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         type={showCurrentPassword ? "text" : "password"}
//                         value={passwordData.currentPassword}
//                         onChange={(e) =>
//                           handlePasswordInputChange(
//                             "currentPassword",
//                             e.target.value
//                           )
//                         }
//                         className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//                           validationErrors.currentPassword
//                             ? "border-red-300"
//                             : "border-gray-300"
//                         }`}
//                         placeholder="Enter your current password"
//                         required
//                       />
//                       <button
//                         type="button"
//                         onClick={() => togglePasswordVisibility("current")}
//                         className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                       >
//                         {showCurrentPassword ? (
//                           <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
//                         ) : (
//                           <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
//                         )}
//                       </button>
//                     </div>
//                     {renderFieldError("currentPassword")}
//                   </div>

//                   {/* New Password */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       New Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         type={showNewPassword ? "text" : "password"}
//                         value={passwordData.newPassword}
//                         onChange={(e) =>
//                           handlePasswordInputChange(
//                             "newPassword",
//                             e.target.value
//                           )
//                         }
//                         className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//                           validationErrors.newPassword
//                             ? "border-red-300"
//                             : "border-gray-300"
//                         }`}
//                         placeholder="Enter your new password"
//                         required
//                       />
//                       <button
//                         type="button"
//                         onClick={() => togglePasswordVisibility("new")}
//                         className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                       >
//                         {showNewPassword ? (
//                           <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
//                         ) : (
//                           <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
//                         )}
//                       </button>
//                     </div>
//                     {renderFieldError("newPassword")}

//                     {/* Password Strength Indicator */}
//                     {passwordData.newPassword && (
//                       <div className="mt-2">
//                         <div className="flex items-center gap-2 text-xs">
//                           <div className="flex gap-1">
//                             {Array.from({ length: 4 }).map((_, i) => (
//                               <div
//                                 key={i}
//                                 className={`w-6 h-1 rounded-full ${
//                                   getPasswordStrength(
//                                     passwordData.newPassword
//                                   ) > i
//                                     ? getPasswordStrengthColor(
//                                         passwordData.newPassword
//                                       )
//                                     : "bg-gray-200"
//                                 }`}
//                               />
//                             ))}
//                           </div>
//                           <span
//                             className={`text-xs font-medium ${getPasswordStrengthTextColor(
//                               passwordData.newPassword
//                             )}`}
//                           >
//                             {getPasswordStrengthLabel(passwordData.newPassword)}
//                           </span>
//                         </div>
//                         <div className="mt-2 text-xs text-gray-500">
//                           Password must contain:
//                           <ul className="list-disc list-inside mt-1 space-y-1">
//                             <li
//                               className={
//                                 passwordData.newPassword.length >= 8
//                                   ? "text-green-600"
//                                   : "text-gray-500"
//                               }
//                             >
//                               At least 8 characters
//                             </li>
//                             <li
//                               className={
//                                 /[A-Z]/.test(passwordData.newPassword)
//                                   ? "text-green-600"
//                                   : "text-gray-500"
//                               }
//                             >
//                               One uppercase letter
//                             </li>
//                             <li
//                               className={
//                                 /[a-z]/.test(passwordData.newPassword)
//                                   ? "text-green-600"
//                                   : "text-gray-500"
//                               }
//                             >
//                               One lowercase letter
//                             </li>
//                             <li
//                               className={
//                                 /\d/.test(passwordData.newPassword)
//                                   ? "text-green-600"
//                                   : "text-gray-500"
//                               }
//                             >
//                               One number
//                             </li>
//                             <li
//                               className={
//                                 /[!@#$%^&*(),.?":{}|<>]/.test(
//                                   passwordData.newPassword
//                                 )
//                                   ? "text-green-600"
//                                   : "text-gray-500"
//                               }
//                             >
//                               One special character
//                             </li>
//                           </ul>
//                         </div>
//                       </div>
//                     )}
//                   </div>

//                   {/* Confirm New Password */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Confirm New Password *
//                     </label>
//                     <div className="relative">
//                       <input
//                         type={showConfirmPassword ? "text" : "password"}
//                         value={passwordData.confirmPassword}
//                         onChange={(e) =>
//                           handlePasswordInputChange(
//                             "confirmPassword",
//                             e.target.value
//                           )
//                         }
//                         className={`w-full px-3 lg:px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base ${
//                           validationErrors.confirmPassword
//                             ? "border-red-300"
//                             : "border-gray-300"
//                         }`}
//                         placeholder="Confirm your new password"
//                         required
//                       />
//                       <button
//                         type="button"
//                         onClick={() => togglePasswordVisibility("confirm")}
//                         className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                       >
//                         {showConfirmPassword ? (
//                           <EyeOff className="w-4 h-4 lg:w-5 lg:h-5" />
//                         ) : (
//                           <Eye className="w-4 h-4 lg:w-5 lg:h-5" />
//                         )}
//                       </button>
//                     </div>
//                     {renderFieldError("confirmPassword")}

//                     {/* Password Match Indicator */}
//                     {passwordData.confirmPassword && (
//                       <div className="mt-2 flex items-center gap-2">
//                         {passwordData.newPassword ===
//                         passwordData.confirmPassword ? (
//                           <>
//                             <Check className="w-4 h-4 text-green-600" />
//                             <span className="text-xs text-green-600">
//                               Passwords match
//                             </span>
//                           </>
//                         ) : (
//                           <>
//                             <X className="w-4 h-4 text-red-600" />
//                             <span className="text-xs text-red-600">
//                               Passwords don't match
//                             </span>
//                           </>
//                         )}
//                       </div>
//                     )}
//                   </div>

//                   {/* Security Tips */}
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                     <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
//                       <AlertCircle className="w-4 h-4" />
//                       Security Tips
//                     </h4>
//                     <ul className="text-sm text-blue-700 space-y-1">
//                       <li>
//                         • Use a unique password that you don't use elsewhere
//                       </li>
//                       <li>• Consider using a password manager</li>
//                       <li>
//                         • Avoid using personal information in your password
//                       </li>
//                       <li>• Change your password regularly</li>
//                     </ul>
//                   </div>

//                   {/* Password Success/Error Messages */}
//                   {renderMessage(passwordMessage)}

//                   {/* Save Button */}
//                   <div className="flex justify-end pt-4">
//                     <button
//                       type="submit"
//                       disabled={
//                         isLoading ||
//                         Object.keys(validatePasswordData()).length > 0 ||
//                         getPasswordStrength(passwordData.newPassword) < 3
//                       }
//                       className={`w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium transition-all text-sm lg:text-base ${
//                         Object.keys(validatePasswordData()).length === 0 &&
//                         !isLoading &&
//                         getPasswordStrength(passwordData.newPassword) >= 3
//                           ? "bg-[#312c55] text-white hover:bg-black"
//                           : "bg-gray-300 text-gray-500 cursor-not-allowed opacity-50"
//                       }`}
//                     >
//                       {isLoading ? "Updating..." : "Update Password"}
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             )}

//             {/* Account Verification Tab - Enhanced with email validation */}
//             {activeTab === "verification" && (
//               <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
//                 <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">
//                   Account Verification
//                 </h2>

//                 <div className="space-y-6">
//                   {/* Email Verification Status */}
//                   <div className="border border-gray-200 rounded-lg p-4">
//                     <div className="flex items-start gap-4">
//                       <div
//                         className={`p-2 rounded-full ${
//                           session?.user?.emailVerified
//                             ? "bg-green-100"
//                             : "bg-yellow-100"
//                         }`}
//                       >
//                         {session?.user?.emailVerified ? (
//                           <Check className="w-5 h-5 text-green-600" />
//                         ) : (
//                           <AlertCircle className="w-5 h-5 text-yellow-600" />
//                         )}
//                       </div>

//                       <div className="flex-1">
//                         <h3 className="font-medium text-gray-900">
//                           Email Verification
//                         </h3>
//                         <p className="text-sm text-gray-600 mt-1">
//                           {session?.user?.email || "No email provided"}
//                         </p>
//                         <p
//                           className={`text-sm mt-1 ${
//                             session?.user?.emailVerified
//                               ? "text-green-600"
//                               : "text-yellow-600"
//                           }`}
//                         >
//                           {session?.user?.emailVerified
//                             ? "Your email address has been verified"
//                             : "Your email address needs verification"}
//                         </p>

//                         {!session?.user?.emailVerified && (
//                           <button
//                             onClick={handleSendVerificationEmail}
//                             disabled={isLoading}
//                             className="mt-3 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                           >
//                             {isLoading
//                               ? "Sending..."
//                               : "Send Verification Email"}
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                   </div>

//                   {/* Account Data Summary - Using getUserById */}
//                   <div className="border border-gray-200 rounded-lg p-4">
//                     <h3 className="font-medium text-gray-900 mb-3">
//                       Account Information
//                     </h3>
//                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
//                       <div>
//                         <span className="text-gray-500">User ID:</span>
//                         <p className="font-mono text-xs text-gray-700 mt-1 break-all">
//                           {session?.user?.id}
//                         </p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Account Created:</span>
//                         <p className="text-gray-700 mt-1">
//                           {session?.user?.createdAt
//                             ? formatDate(session.user.createdAt)
//                             : "Unknown"}
//                         </p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Last Updated:</span>
//                         <p className="text-gray-700 mt-1">
//                           {session?.user?.updatedAt
//                             ? getRelativeTime(session.user.updatedAt)
//                             : "Unknown"}
//                         </p>
//                       </div>
//                       <div>
//                         <span className="text-gray-500">Account Status:</span>
//                         <span
//                           className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
//                             session?.user?.emailVerified
//                               ? "bg-green-100 text-green-800"
//                               : "bg-yellow-100 text-yellow-800"
//                           }`}
//                         >
//                           {session?.user?.emailVerified
//                             ? "Verified"
//                             : "Unverified"}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Delete Account Section */}
//                   <div className="border border-red-200 rounded-lg p-4 bg-red-50">
//                     <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
//                       <AlertCircle className="w-5 h-5" />
//                       Danger Zone
//                     </h3>
//                     <p className="text-sm text-red-700 mb-4">
//                       Once you delete your account, there is no going back. This
//                       action cannot be undone.
//                     </p>
//                     <button
//                       onClick={() => setShowDeleteConfirmation(true)}
//                       className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
//                     >
//                       Delete Account
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Delete Account Confirmation Modal */}
//         {showDeleteConfirmation && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//             <div className="bg-white rounded-lg p-6 max-w-md w-full">
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                 Delete Account
//               </h3>
//               <p className="text-gray-600 mb-4">
//                 Are you absolutely sure? This action cannot be undone and will
//                 permanently delete your account and all associated data.
//               </p>

//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Type "DELETE" to confirm:
//                 </label>
//                 <input
//                   type="text"
//                   value={deleteConfirmationText}
//                   onChange={(e) => setDeleteConfirmationText(e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
//                   placeholder="DELETE"
//                 />
//               </div>

//               <div className="flex gap-3 justify-end">
//                 <button
//                   onClick={() => {
//                     setShowDeleteConfirmation(false);
//                     setDeleteConfirmationText("");
//                   }}
//                   className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={handleDeleteAccount}
//                   disabled={deleteConfirmationText !== "DELETE" || isLoading}
//                   className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                 >
//                   {isLoading ? "Deleting..." : "Delete Account"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };





// // Helper functions for password strength
//   function getPasswordStrength(password: string): number {
//     let strength = 0;
//     if (password.length >= 8) strength++;
//     if (/[A-Z]/.test(password)) strength++;
//     if (/[a-z]/.test(password)) strength++;
//     if (/\d/.test(password)) strength++;
//     if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
//     return strength;
//   }

//   function getPasswordStrengthColor(password: string): string {
//     const strength = getPasswordStrength(password);
//     if (strength <= 2) return "bg-red-500";
//     if (strength <= 3) return "bg-yellow-500";
//     return "bg-green-500";
//   }

//   function getPasswordStrengthTextColor(password: string): string {
//     const strength = getPasswordStrength(password);
//     if (strength <= 2) return "text-red-600";
//     if (strength <= 3) return "text-yellow-600";
//     return "text-green-600";
//   }

//   function getPasswordStrengthLabel(password: string): string {
//     const strength = getPasswordStrength(password);
//     if (strength <= 2) return "Weak";
//     if (strength <= 3) return "Medium";
//     return "Strong";
//   }

//   // Email verification handler
//   const handleSendVerificationEmail = async () => {
//     if (!session?.user?.email || !isValidEmail(session.user.email)) {
//       setProfileMessage({
//         type: "error",
//         text: "Invalid email address. Please update your email first.",
//       });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await fetch("/api/auth/send-verification", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email: session.user.email }),
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to send verification email");
//       }

//       setProfileMessage({
//         type: "success",
//         text: "Verification email sent! Please check your inbox.",
//       });
//     } catch (error) {
//       setProfileMessage({
//         type: "error",
//         text: getErrorMessage(error),
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Delete account handler using getUserById
//   const handleDeleteAccount = async () => {
//     if (!session?.user?.id) return;

//     setIsLoading(true);
//     try {
//       // First verify the user exists using getUserById
//       const user = await getUserById(session.user.id);
//       if (!user) {
//         throw new Error("User not found");
//       }

//       const response = await fetch("/api/auth/delete-account", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.error || "Failed to delete account");
//       }

//       // Redirect to home page after successful deletion
//       window.location.href = "/";
//     } catch (error) {
//       setProfileMessage({
//         type: "error",
//         text: getErrorMessage(error),
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Enhanced validation with email validation
//   const validateProfileDataEnhanced = useCallback((): ValidationErrors => {
//     const errors: ValidationErrors = {};

//     // Name validation
//     if (!profileData.name.trim()) {
//       errors.name = "Name is required";
//     } else if (profileData.name.length < 2) {
//       errors.name = "Name must be at least 2 characters";
//     }

//     // Email validation using isValidEmail from utils
//     if (session?.user?.email && !isValidEmail(session.user.email)) {
//       errors.email = "Please provide a valid email address";
//     }

//     // Website validation using isValidUrl from utils
//     if (profileData.website && !isValidUrl(profileData.website)) {
//       errors.website = "Please enter a valid website URL";
//     }

//     // Bio validation with truncation helper
//     if (profileData.bio.length > limits.bio) {
//       errors.bio = `Bio must not exceed ${limits.bio} characters`;
//     }

//     // Location validation
//     if (profileData.location.length > limits.location) {
//       errors.location = `Location must not exceed ${limits.location} characters`;
//     }

//     // Twitter validation
//     if (profileData.twitter) {
//       if (profileData.twitter.length > limits.twitter) {
//         errors.twitter = `Twitter handle must not exceed ${limits.twitter} characters`;
//       }
//       // Remove @ if present and validate format
//       const twitterHandle = profileData.twitter.replace('@', '');
//       if (!/^[A-Za-z0-9_]{1,15}$/.test(twitterHandle)) {
//         errors.twitter = "Invalid Twitter handle format";
//       }
//     }

//     // Instagram validation
//     if (profileData.instagram) {
//       if (profileData.instagram.length > limits.instagram) {
//         errors.instagram = `Instagram handle must not exceed ${limits.instagram} characters`;
//       }
//       // Remove @ if present and validate format
//       const instagramHandle = profileData.instagram.replace('@', '');
//       if (!/^[A-Za-z0-9_.]{1,30}$/.test(instagramHandle)) {
//         errors.instagram = "Invalid Instagram handle format";
//       }
//     }

//     return errors;
//   }, [profileData, limits, session?.user?.email]);

//   // Additional state for new features
//   const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
//   const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

//   // Update the navigation to include verification tab
//   const handleTabChangeEnhanced = (tab: "profile" | "password" | "verification") => {
//     setActiveTab(tab);
//     setIsMobileMenuOpen(false);
//     // Clear messages and errors when switching tabs
//     setProfileMessage({ type: "", text: "" });
//     setPasswordMessage({ type: "", text: "" });
//     setValidationErrors({});
//   };
// };

