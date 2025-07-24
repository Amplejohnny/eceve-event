"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEventStore } from "../../store/eventStore";
import { EventType } from "@/generated/prisma";
import {
  ChevronLeft,
  Upload,
  Plus,
  X,
  MapPin,
  Calendar,
  Clock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    removeTicketType,
    updateTicketType,
    validateCurrentStep,
    canGoNext,
    canGoPrev,
    nextStep,
    prevStep,
    createEvent,
    resetForm,
    clearError,
  } = useEventStore();

  const [submitError, setSubmitError] = useState("");
  const [tagInput, setTagInput] = useState("");

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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    try {
      setSubmitError("");
      const result = await createEvent();
      // Pass event ID via URL parameter
      router.push(`/event-success?eventId=${result.id}`);
      resetForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create event. Please try again."
      );
    }
  };

  const handleAddCustomTag = () => {
    if (tagInput.trim()) {
      addTag(tagInput.trim());
      setTagInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustomTag();
    }
  };

  const renderError = (field: string) => {
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
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ChevronLeft
              className="w-6 h-6 text-gray-600 mr-2 cursor-pointer"
              onClick={() => router.back()}
            />
            <h1 className="text-2xl font-bold text-gray-900">
              Create a New Event
            </h1>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mb-8">
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
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {item.step}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      currentStep >= item.step
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-0.5 ${
                      currentStep > item.step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Step 1: Edit */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Event Details</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        updateFormData({ title: e.target.value });
                        clearError("title");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter event title"
                    />
                    {renderError("title")}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Category *
                    </label>
                    <select
                      title="category"
                      value={formData.category}
                      onChange={(e) => {
                        updateFormData({ category: e.target.value });
                        clearError("category");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Please select one</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {renderError("category")}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => {
                        updateFormData({ description: e.target.value });
                        clearError("description");
                      }}
                      rows={4}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                <h2 className="text-lg font-semibold mb-4">Date & Time</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      value={
                        formData.date
                          ? formData.date.toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => {
                        updateFormData({ date: new Date(e.target.value) });
                        clearError("date");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {renderError("date")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => {
                        updateFormData({ startTime: e.target.value });
                        clearError("startTime");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.startTime ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {renderError("startTime")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => {
                        updateFormData({ endTime: e.target.value });
                        clearError("endTime");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.endTime ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {renderError("endTime")}
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location/City *
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => {
                        updateFormData({ location: e.target.value });
                        clearError("location");
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.location ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter city or location"
                    />
                    {renderError("location")}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Venue (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={(e) =>
                        updateFormData({ venue: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter venue name"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      updateFormData({ address: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full address"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Tags *</h2>
                <div className="space-y-4">
                  {/* Selected Tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                          <button
                            title="removeTag"
                            onClick={() => removeTag(tag)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
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
                          onClick={() => addTag(tag)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
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
                        onKeyPress={handleKeyPress}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter custom tag"
                      />
                      <button
                        onClick={handleAddCustomTag}
                        disabled={!tagInput.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {renderError("tags")}
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
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    errors.bannerImage ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  {formData.imageUrl ? (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt="Event banner"
                        className="max-w-full h-48 object-cover mx-auto rounded-lg"
                      />
                      <button
                        title="delete EventBanner"
                        onClick={() => {
                          updateFormData({ bannerImage: null, imageUrl: "" });
                          clearError("bannerImage");
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Choose file</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Upload images must be at least 1792 pixels wide by 1024
                        pixels high. Valid file formats: JPG, PNG, WebP.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateFormData({ bannerImage: file });
                            const url = URL.createObjectURL(file);
                            updateFormData({ imageUrl: url });
                            clearError("bannerImage");
                          }
                        }}
                        className="block mx-auto"
                      />
                    </div>
                  )}
                </div>
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
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
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
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
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
                    {formData.ticketTypes.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className={`border rounded-lg p-4 ${
                          errors[`ticket_${ticket.id}_name`] ||
                          errors[`ticket_${ticket.id}_price`] ||
                          errors[`ticket_${ticket.id}_quantity`]
                            ? "border-red-500"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., General Admission"
                            />
                            {renderError(`ticket_${ticket.id}_name`)}
                          </div>

                          {formData.eventType === EventType.PAID && (
                            <div className="w-32">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price *
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">
                                  ₦
                                </span>
                                <input
                                  type="number"
                                  value={ticket.price}
                                  onChange={(e) => {
                                    updateTicketType(ticket.id, {
                                      price: Number(e.target.value),
                                    });
                                    clearError(`ticket_${ticket.id}_price`);
                                  }}
                                  className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="0.00"
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              {renderError(`ticket_${ticket.id}_price`)}
                            </div>
                          )}

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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Unlimited"
                              min="1"
                            />
                            {renderError(`ticket_${ticket.id}_quantity`)}
                          </div>

                          {formData.ticketTypes.length > 1 && (
                            <button
                              title="ticketQuantity"
                              onClick={() => removeTicketType(ticket.id)}
                              className="mt-6 text-red-500 hover:text-red-700"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addTicketType}
                      className="flex items-center text-blue-600 hover:text-blue-800"
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

                <div className="bg-gray-50 rounded-lg p-6">
                  {/* Event Banner */}
                  {formData.imageUrl && (
                    <div className="mb-6">
                      <img
                        src={formData.imageUrl}
                        alt="Event banner"
                        className="w-full h-48 object-cover rounded-lg"
                      />
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

                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formData.date?.toLocaleDateString()}</span>
                      {formData.startTime && (
                        <>
                          <Clock className="w-4 h-4 ml-4 mr-2" />
                          <span>{formData.startTime}</span>
                          {formData.endTime && (
                            <span> - {formData.endTime}</span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{formData.location}</span>
                      {formData.venue && <span> • {formData.venue}</span>}
                    </div>

                    {formData.tags.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
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
                                : `₦${ticket.price.toLocaleString()}`}
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
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={!canGoPrev() || isLoading}
            className={`px-4 py-2 rounded-md ${
              canGoPrev() && !isLoading
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Go back
          </button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={nextStep}
                disabled={!canGoNext() || isLoading}
                className={`px-6 py-2 rounded-md font-medium ${
                  canGoNext() && !isLoading
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Save & Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canGoNext() || isLoading}
                className={`px-6 py-2 rounded-md font-medium ${
                  canGoNext() && !isLoading
                    ? "bg-blue-600 text-white hover:bg-blue-700"
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
  );
};

export default CreateEvent;
