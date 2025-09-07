"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEventStore } from "@/store/eventStore";
import { EventType } from "@/generated/prisma";
import {
  ChevronLeft,
  Upload,
  Plus,
  X,
  CalendarDays,
  MapPin,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Listbox, ListboxButton, ListboxOptions } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { toKobo, fromKobo } from "@/lib/utils";

const CATEGORIES = [
  "Entertainment",
  "Educational & Business",
  "Cultural & Arts",
  "Sports & Fitness",
  "Technology & Innovation",
  "Travel & Adventure",
];

const PREDEFINED_TAGS = [
  "Conference",
  "Workshop",
  "Networking",
  "Music",
  "Comedy",
  "Art",
  "Sports",
  "Food",
  "Business",
  "Technology",
  "Education",
  "Health",
  "Family",
  "Online",
  "Outdoor",
  "Indoor",
  "Free",
  "Premium",
  "Beginner",
  "Advanced",
];

const timeStringToMinutes = (timeString: string): number => {
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

interface CreateEventResult {
  id: string;
}

const CreateEvent: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const {
    currentStep,
    formData,
    errors,
    isLoading,
    updateFormData,
    addTag,
    removeTag,
    addTicketType,
    // removeTicketType,
    updateTicketType,
    validateCurrentStep,
    // canGoNext,
    canGoPrev,
    canPublish,
    nextStep,
    prevStep,
    createEvent,
    resetForm,
    clearError,
    setError,
  } = useEventStore();

  const [submitError, setSubmitError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isNavigatingToSuccess, setIsNavigatingToSuccess] = useState(false);

  if (status === "loading") {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (
    session?.user &&
    !["ORGANIZER", "ADMIN"].includes(session.user.role as string)
  ) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-4 md:py-25">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 text-center">
            {/* Lock Icon */}
            <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-yellow-600"
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
              Organizer Access Required
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-5 leading-relaxed text-sm">
              You need to have an organizer account to create events. Please
              upgrade your account to start creating amazing events.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-yellow-500 text-black py-2.5 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2">
                <Link href="/profile-settings">Upgrade to Organizer</Link>
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                <Link href="/">Back to Home</Link>
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need help?{" "}
                <Link
                  href="/contact"
                  className="text-yellow-600 hover:text-yellow-800 font-medium"
                >
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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
              You need to be logged in to create an event. Please sign in to
              your account to continue.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:ring-offset-2">
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

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    setImageUploadError("");

    try {
      // Validate file on frontend first
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Only JPEG, PNG, and WebP are allowed."
        );
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error("File size too large. Maximum size is 5MB.");
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("image", file);

      // console.log("Uploading image...", {
      //   name: file.name,
      //   size: file.size,
      //   type: file.type,
      // });

      // Upload to server
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const result = await response.json();
      // console.log("Image upload successful:", result);

      if (!result.imageUrl) {
        throw new Error("No image URL returned from server");
      }

      // Update form data with the server URL
      updateFormData({
        bannerImage: file,
        imageUrl: result.imageUrl,
      });

      // Clear any previous errors
      clearError("bannerImage");

      // Return the URL for use in handleSubmit
      return result.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload image";
      setImageUploadError(errorMessage);

      updateFormData({
        bannerImage: null,
        imageUrl: "",
      });

      throw error; // Re-throw so handleSubmit can catch it
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageUrl = await handleImageUpload(file);
      // Make sure both bannerImage and imageUrl are set
      updateFormData({
        bannerImage: file,
        imageUrl: imageUrl,
      });
    } catch (error) {
      console.error("Failed to upload image:", error);
    }

    event.target.value = "";
  };

  const handleInputChange = (field: string, value: any) => {
    // Update the form data
    updateFormData({ [field]: value });

    // Clear any existing error for this field
    clearError(field);

    // Optional: Add real-time validation
    if (field === "title" && (!value || value.trim() === "")) {
      setError("title", "Event title is required");
    }
    if (field === "category" && (!value || value.trim() === "")) {
      setError("category", "Event category is required");
    }
    if (field === "description" && (!value || value.trim() === "")) {
      setError("description", "Event description is required");
    }
    if (field === "location" && (!value || value.trim() === "")) {
      setError("location", "Event location is required");
    }
    if (field === "startTime" && (!value || value.trim() === "")) {
      setError("startTime", "Start time is required");
    }
    if (field === "date" && !value) {
      setError("date", "Event date is required");
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      setSubmitError("");

      // Only upload if we have a banner image but no imageUrl
      if (formData.bannerImage && !formData.imageUrl) {
        console.log("Uploading banner image before creating event...");
        const finalImageUrl = await handleImageUpload(formData.bannerImage);
        updateFormData({ imageUrl: finalImageUrl });
      }

      // console.log("Creating event with data:", {
      //   title: formData.title,
      //   category: formData.category,
      //   hasImage: !!formData.imageUrl,
      //   imageUrl: formData.imageUrl || "NOT_SET",
      //   ticketTypes: formData.ticketTypes.length,
      // });

      const result = (await createEvent()) as CreateEventResult;
      // console.log("Event created successfully:", result);

      setIsNavigatingToSuccess(true);

      // Navigate to success page
      router.push(`/event-success?eventId=${result.id}`);
      resetForm();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create event. Please try again."
      );
      setIsNavigatingToSuccess(false);
    }
  };

  const handleAddCustomTag = (): void => {
    if (tagInput.trim()) {
      addTag(tagInput.trim());
      setTagInput("");
      // Clear tag errors when adding a tag
      clearError("tags");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  const renderError = (field: string): React.JSX.Element | null => {
    if (errors[field]) {
      return (
        <div className="flex items-center mt-1 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 mr-1" />
          {errors[field]}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-yellow-50 py-6 px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 lg:pb-24">
      <div className="max-w-4xl mx-auto">
        {/* LOADING OVERLAY */}
        {isNavigatingToSuccess && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-4">
              {/* Spinner */}
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-200"></div>
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-yellow-500 absolute top-0 left-0"></div>
              </div>

              {/* Simple loading message */}
              <div className="space-y-2">
                <p className="text-gray-600">Loading...</p>
              </div>

              {/* Optional: Progress dots */}
              <div className="flex justify-center space-x-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ChevronLeft
              className="w-6 h-6 text-gray-600 mr-2 cursor-pointer"
              onClick={() => router.push("/")}
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Create a New Event
            </h1>
          </div>

          {/* Progress Steps - Mobile Responsive */}
          <div className="mb-8">
            {/* Mobile: Show only current step */}
            <div className="block sm:hidden">
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
                <span className="text-sm text-gray-600">
                  Step {currentStep} of 4
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                    {currentStep}
                  </div>
                  <span className="text-sm font-medium text-yellow-600">
                    {
                      [
                        { step: 1, label: "Edit" },
                        { step: 2, label: "Banner" },
                        { step: 3, label: "Ticketing" },
                        { step: 4, label: "Review" },
                      ].find((item) => item.step === currentStep)?.label
                    }
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Desktop: Show all steps */}
            <div className="hidden sm:flex items-center space-x-2 lg:space-x-4">
              {[
                { step: 1, label: "Edit" },
                { step: 2, label: "Banner" },
                { step: 3, label: "Ticketing" },
                { step: 4, label: "Review" },
              ].map((item, index) => (
                <React.Fragment key={item.step}>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= item.step
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {item.step}
                    </div>
                    <span
                      className={`ml-2 text-xs sm:text-sm font-medium ${
                        currentStep >= item.step
                          ? "text-yellow-600 font-semibold"
                          : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      className={`flex-1 h-0.5 min-w-[20px] sm:min-w-[40px] ${
                        currentStep > item.step
                          ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                          : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-6 mb-8 sm:mb-12 lg:mb-16">
          {/* Step 1: Edit */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Event Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        handleInputChange("title", e.target.value)
                      }
                      onBlur={() => {
                        // Validate on blur for better UX
                        if (!formData.title.trim()) {
                          setError("title", "Event title is required");
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter event title"
                    />
                    {renderError("title")}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Category <span className="text-red-500">*</span>
                    </label>
                    <Listbox
                      value={formData.category}
                      onChange={(val) => handleInputChange("category", val)}
                    >
                      <div className="relative">
                        <ListboxButton
                          className={`w-full rounded-md border bg-white py-2.5 pl-4 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm ${
                            errors.category
                              ? "border-red-500"
                              : "border-gray-300 hover:border-yellow-300"
                          }`}
                        >
                          <span className="block truncate">
                            {formData.category || "Please select one"}
                          </span>
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                            <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
                          </span>
                        </ListboxButton>

                        <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {CATEGORIES.map((category) => (
                            <Listbox.Option
                              key={category}
                              value={category}
                              className={({ active }) =>
                                `cursor-pointer select-none px-4 py-2 ${
                                  active
                                    ? "bg-blue-100 text-blue-900"
                                    : "text-gray-900"
                                }`
                              }
                            >
                              {({ selected }) => (
                                <div className="flex justify-between items-center">
                                  <span className="truncate">{category}</span>
                                  {selected && (
                                    <CheckIcon className="h-4 w-4 text-blue-600" />
                                  )}
                                </div>
                              )}
                            </Listbox.Option>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                    {renderError("category")}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        handleInputChange("description", e.target.value)
                      }
                      onBlur={() => {
                        if (!formData.description.trim()) {
                          setError(
                            "description",
                            "Event description is required"
                          );
                        }
                      }}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                        errors.description
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Provide a detailed description of your event..."
                    />
                    {renderError("description")}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Date & Time
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Event Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={
                          formData.date
                            ? formData.date.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          handleInputChange("date", newDate);

                          // Validate date is not in the past
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const eventDate = new Date(newDate);
                          eventDate.setHours(0, 0, 0, 0);

                          if (eventDate < today) {
                            setError(
                              "date",
                              "Event date cannot be in the past"
                            );
                          }
                        }}
                        className={`w-full appearance-none pl-10 pr-4 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          errors.date ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                    {renderError("date")}
                  </div>

                  {/* Event End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event End Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={
                          formData.endDate
                            ? formData.endDate.toISOString().split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          updateFormData({
                            endDate: e.target.value
                              ? new Date(e.target.value)
                              : null,
                          })
                        }
                        min={
                          formData.date
                            ? formData.date.toISOString().split("T")[0]
                            : ""
                        }
                        className={`w-full appearance-none pl-10 pr-4 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          errors.endDate ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                    {renderError("endDate")}
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          handleInputChange("startTime", e.target.value)
                        }
                        onBlur={() => {
                          if (!formData.startTime.trim()) {
                            setError("startTime", "Start time is required");
                          }
                        }}
                        className={`w-full appearance-none pl-10 pr-4 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          errors.startTime
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                    {renderError("startTime")}
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => {
                          const endTime = e.target.value;
                          handleInputChange("endTime", endTime);

                          // Validate end time vs start time if both are provided
                          if (endTime && formData.startTime) {
                            const startMinutes = timeStringToMinutes(
                              formData.startTime
                            );
                            const endMinutes = timeStringToMinutes(endTime);

                            if (endMinutes <= startMinutes) {
                              setError(
                                "endTime",
                                "End time must be after start time"
                              );
                            }
                          }
                        }}
                        className={`w-full appearance-none pl-10 pr-4 py-2 rounded-lg border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          errors.endTime ? "border-red-500" : "border-gray-300"
                        }`}
                      />
                      <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
                    </div>
                    {renderError("endTime")}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location/City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      onBlur={() => {
                        if (!formData.location.trim()) {
                          setError("location", "Event location is required");
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                        errors.location ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter city or location"
                    />
                    {renderError("location")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={(e) =>
                        updateFormData({ venue: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder="Enter venue name"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      updateFormData({ address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Tags *</h2>
                <div className="space-y-4">
                  {/* Show error if no tags - This one works correctly */}
                  {formData.tags.length === 0 && errors.tags && (
                    <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                      {errors.tags}
                    </div>
                  )}

                  {/* Selected Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800 border border-yellow-200"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                          <button
                            title="removeTag"
                            onClick={() => {
                              removeTag(tag);
                              // Clear error when removing tags if no tags will remain
                              if (formData.tags.length === 1) {
                                setError(
                                  "tags",
                                  "At least one tag is required"
                                );
                              } else {
                                clearError("tags");
                              }
                            }}
                            className="ml-2 text-yellow-600 hover:text-yellow-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Predefined Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Popular Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_TAGS.filter(
                        (tag) => !formData.tags.includes(tag)
                      ).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            addTag(tag);
                            // Clear any tag errors when adding a tag
                            clearError("tags");
                          }}
                          className="inline-flex cursor-pointer items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-200 border border-transparent transition-all duration-200"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Tag Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Add Custom Tag
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Enter custom tag"
                      />
                      <button
                        onClick={() => {
                          handleAddCustomTag();
                          // Clear any tag errors when adding a custom tag
                          if (tagInput.trim()) {
                            clearError("tags");
                          }
                        }}
                        disabled={!tagInput.trim()}
                        className="px-4 py-2 cursor-pointer bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-md hover:from-yellow-500 hover:to-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Banner */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Event Banner</h2>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                    imageUploadError
                      ? "border-red-500 bg-red-50/30"
                      : formData.imageUrl
                      ? "border-green-500 bg-green-50/30"
                      : "border-gray-300 hover:border-yellow-400 hover:bg-yellow-50/30 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isUploadingImage) {
                      document.getElementById("banner-upload-input")?.click();
                    }
                  }}
                >
                  {isUploadingImage ? (
                    <div className="space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
                      <p className="text-yellow-600 font-medium">
                        Uploading image...
                      </p>
                    </div>
                  ) : formData.imageUrl ? (
                    <div className="relative">
                      <Image
                        src={formData.imageUrl}
                        alt="Event banner"
                        className="max-w-full h-48 object-cover mx-auto rounded-lg shadow-md"
                        width={800}
                        height={240}
                        onError={(_e) => {
                          console.error(
                            "Failed to load uploaded image:",
                            formData.imageUrl
                          );
                          setImageUploadError(
                            "Failed to load uploaded image. Please try uploading again."
                          );
                          updateFormData({ imageUrl: "", bannerImage: null });
                        }}
                      />
                      <button
                        title="Remove Event Banner"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFormData({ bannerImage: null, imageUrl: "" });
                          setImageUploadError("");
                          clearError("bannerImage");
                        }}
                        className="absolute cursor-pointer top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            document
                              .getElementById("banner-upload-input")
                              ?.click();
                          }}
                          className="text-yellow-600 hover:text-yellow-800 font-medium text-sm"
                        >
                          Replace Image
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Click to choose file</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload images must be at least 1792 pixels wide by 1024
                        pixels high. Valid file formats: JPG, PNG, WebP. Max
                        size: 5MB.
                      </p>
                    </div>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  id="banner-upload-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isUploadingImage}
                  className="hidden"
                />

                {/* Error Display */}
                {imageUploadError && (
                  <div className="mt-4 flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {imageUploadError}
                  </div>
                )}

                {/* Success message */}
                {formData.imageUrl && !imageUploadError && (
                  <div className="mt-4 flex items-center text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
                    <CheckIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    Image uploaded successfully!
                  </div>
                )}

                {renderError("bannerImage")}
              </div>
            </div>
          )}

          {/* Step 3: Ticketing */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  What type of event are you running?
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.eventType === EventType.PAID
                        ? "border-yellow-500 bg-yellow-50 shadow-md"
                        : "border-gray-300 hover:border-yellow-300 hover:bg-yellow-50/30"
                    }`}
                    onClick={() =>
                      updateFormData({ eventType: EventType.PAID })
                    }
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🎟️</div>
                      <h3 className="font-semibold">Paid Event</h3>
                      <p className="text-sm text-gray-600">
                        My event requires payment for entry
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.eventType === EventType.FREE
                        ? "border-yellow-500 bg-yellow-50 shadow-md"
                        : "border-gray-300 hover:border-yellow-300 hover:bg-yellow-50/30"
                    }`}
                    onClick={() =>
                      updateFormData({ eventType: EventType.FREE })
                    }
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🆓</div>
                      <h3 className="font-semibold">Free Event</h3>
                      <p className="text-sm text-gray-600">
                        I'm running a free event
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Ticket Types</h3>

                  <div className="space-y-4">
                    {formData.ticketTypes.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`border rounded-lg p-4 ${
                          errors[`ticket_${ticket.id}_name`] ||
                          errors[`ticket_${ticket.id}_price`] ||
                          errors[`ticket_${ticket.id}_quantity`]
                            ? "border-red-500 bg-red-50/30"
                            : "border-gray-300"
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ticket Name *
                            </label>
                            <input
                              type="text"
                              value={ticket.name}
                              onChange={(e) => {
                                updateTicketType(ticket.id, {
                                  name: e.target.value,
                                });
                                clearError(`ticket_${ticket.id}_name`);
                              }}
                              onBlur={() => {
                                if (!ticket.name.trim()) {
                                  setError(
                                    `ticket_${ticket.id}_name`,
                                    "Ticket name is required"
                                  );
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                                errors[`ticket_${ticket.id}_name`]
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="e.g., Standard"
                            />
                            {renderError(`ticket_${ticket.id}_name`)}
                          </div>

                          {/* Price input with validation */}
                          {formData.eventType === EventType.PAID && (
                            <div className="w-32">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                  ₦
                                </span>
                                <input
                                  type="number"
                                  value={
                                    ticket.price === 0
                                      ? ""
                                      : fromKobo(ticket.price)
                                  } // Display in Naira
                                  onChange={(e) => {
                                    const nairaValue =
                                      e.target.value === ""
                                        ? 0
                                        : Number(e.target.value);
                                    const koboValue =
                                      nairaValue === 0 ? 0 : toKobo(nairaValue); // Convert to kobo for storage
                                    updateTicketType(ticket.id, {
                                      price: koboValue, // Store in kobo
                                    });
                                    clearError(`ticket_${ticket.id}_price`);
                                  }}
                                  onBlur={() => {
                                    if (
                                      formData.eventType === EventType.PAID &&
                                      ticket.price <= 0
                                    ) {
                                      setError(
                                        `ticket_${ticket.id}_price`,
                                        "Price must be greater than 0 for paid events"
                                      );
                                    }
                                  }}
                                  className={`w-full pl-6 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                                    errors[`ticket_${ticket.id}_price`]
                                      ? "border-red-500"
                                      : "border-gray-300"
                                  }`}
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              {renderError(`ticket_${ticket.id}_price`)}
                            </div>
                          )}

                          {/* Quantity input with validation */}
                          <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={ticket.quantity || ""}
                              onChange={(e) => {
                                const value =
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value);
                                updateTicketType(ticket.id, {
                                  quantity: value,
                                });
                                clearError(`ticket_${ticket.id}_quantity`);
                              }}
                              onBlur={() => {
                                if (
                                  ticket.quantity !== undefined &&
                                  ticket.quantity <= 0
                                ) {
                                  setError(
                                    `ticket_${ticket.id}_quantity`,
                                    "Quantity must be greater than 0"
                                  );
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                                errors[`ticket_${ticket.id}_quantity`]
                                  ? "border-red-500"
                                  : "border-gray-300"
                              }`}
                              placeholder="Unlimited"
                              min="1"
                            />
                            {renderError(`ticket_${ticket.id}_quantity`)}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addTicketType}
                      className="flex items-center text-yellow-600 hover:text-yellow-800 font-medium transition-colors duration-200"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add another ticket type
                    </button>
                  </div>
                  {renderError("ticketTypes")}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Review Your Event
                </h2>

                <div className="bg-gradient-to-br from-gray-50 to-yellow-50/30 rounded-lg p-6 border border-gray-200">
                  {/* Event Banner */}
                  {formData.imageUrl && (
                    <div className="mb-6">
                      <Image
                        src={formData.imageUrl}
                        alt="Event banner"
                        className="w-full h-48 object-cover rounded-lg"
                        width={800}
                        height={240}
                        onError={(_e) => {
                          console.error(
                            "Failed to load image in review:",
                            formData.imageUrl
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* Show placeholder if no image */}
                  {!formData.imageUrl && (
                    <div className="mb-6 bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">No banner image uploaded</p>
                      </div>
                    </div>
                  )}

                  {/* Event Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {formData.title}
                      </h3>
                      <p className="text-gray-600">{formData.category}</p>
                    </div>

                    {/* Date & Time */}
                    <div className="flex flex-wrap items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formData.date?.toLocaleDateString()}</span>
                      {formData.endDate && <span className="mx-2">-</span>}
                      {formData.endDate && (
                        <span>{formData.endDate.toLocaleDateString()}</span>
                      )}

                      {formData.startTime && (
                        <>
                          <Clock className="w-4 h-4 ml-4 mr-2" />
                          <span>{formData.startTime}</span>
                          {formData.endTime && (
                            <>
                              <span className="mx-2">-</span>
                              <span>{formData.endTime}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Location */}
                    <div className="flex flex-wrap items-center text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{formData.location}</span>
                      {formData.venue && (
                        <>
                          <span className="mx-2">-</span>
                          <span>{formData.venue}</span>
                        </>
                      )}
                    </div>

                    {formData.tags.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 border border-yellow-200"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.description && (
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {formData.description}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">Ticket Information</h4>
                      <div className="space-y-2">
                        {formData.ticketTypes.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="flex justify-between items-center bg-white p-3 rounded border"
                          >
                            <div>
                              <span className="font-medium">{ticket.name}</span>
                              {ticket.quantity && (
                                <span className="text-sm text-gray-500 ml-2">
                                  (Qty: {ticket.quantity})
                                </span>
                              )}
                            </div>
                            <span className="font-medium">
                              {formData.eventType === EventType.FREE
                                ? "Free"
                                : `₦${fromKobo(ticket.price).toLocaleString()}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700">{submitError}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 sm:mt-8 lg:mt-12 mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            {/* Go back / Cancel button */}
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                disabled={!canGoPrev() || isLoading}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium ${
                  canGoPrev() && !isLoading
                    ? "bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 cursor-pointer border border-gray-300 hover:border-yellow-300"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Go back
              </button>
            ) : (
              <button
                onClick={() => router.push("/")}
                disabled={isLoading}
                className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium ${
                  !isLoading
                    ? "bg-white text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 cursor-pointer border border-gray-300 hover:border-yellow-300"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Cancel
              </button>
            )}

            {/* Continue / Publish button */}
            <div className="flex space-x-3 w-full sm:w-auto">
              {currentStep < 4 ? (
                <button
                  onClick={() => {
                    // Force validation before trying to proceed
                    if (validateCurrentStep()) {
                      nextStep();
                    } else {
                      // Validation failed, errors should now be visible
                      console.log("Validation failed, errors:", errors);
                    }
                  }}
                  disabled={isLoading}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-md text-sm font-medium ${
                    !isLoading
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 cursor-pointer font-medium shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Save & Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canPublish() || isLoading}
                  className={`w-full sm:w-auto px-4 sm:px-6 py-2 rounded-md text-sm font-medium ${
                    canPublish() && !isLoading
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-600 cursor-pointer font-medium shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? "Publishing..." : "Publish Event"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
