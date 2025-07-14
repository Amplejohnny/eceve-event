import React, { useState } from "react";
import { useEventStore } from "../../store/eventStore";
import {
  ChevronLeft,
  Upload,
  Plus,
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
} from "lucide-react";

const CATEGORIES = [
  "Entertainment",
  "Educational & Business",
  "Cultural & Arts",
  "Sports & Fitness",
  "Technology & Innovation",
  "Travel & Adventure",
];

const CreateEvent: React.FC = () => {
  const {
    currentStep,
    formData,
    setCurrentStep,
    updateFormData,
    addTicketType,
    removeTicketType,
    updateTicketType,
    resetForm,
  } = useEventStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formDataToSend = new FormData();

      // Add basic event data
      formDataToSend.append("eventName", formData.eventName);
      formDataToSend.append("eventCategory", formData.eventCategory);
      formDataToSend.append("eventType", formData.eventType);
      formDataToSend.append("location", formData.location);
      formDataToSend.append("eventDescription", formData.eventDescription);
      formDataToSend.append("ticketingType", formData.ticketingType);

      // Add sessions
      formDataToSend.append("sessions", JSON.stringify(formData.sessions));

      // Add tickets
      formDataToSend.append(
        "ticketTypes",
        JSON.stringify(formData.ticketTypes)
      );

      // Add banner image if exists
      if (formData.bannerImage) {
        formDataToSend.append("bannerImage", formData.bannerImage);
      }

      const response = await fetch("/api/events/create", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error("Failed to create event");
      }

      // Reset form and redirect or show success message
      resetForm();
      // You might want to redirect to event dashboard or show success message
    } catch (error) {
      setSubmitError("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.eventName && formData.eventCategory && formData.location
        );
      case 2:
        return true; // Banner is optional
      case 3:
        return formData.ticketTypes.every(
          (ticket) => ticket.name.trim() !== ""
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <ChevronLeft className="w-6 h-6 text-gray-600 mr-2" />
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
                      Event Name *
                    </label>
                    <input
                      type="text"
                      value={formData.eventName}
                      onChange={(e) =>
                        updateFormData({ eventName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter event name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Category *
                    </label>
                    <select
                      value={formData.eventCategory}
                      onChange={(e) =>
                        updateFormData({ eventCategory: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Please select one</option>
                      {CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Date & Time</h2>

                <div className="flex items-center space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="eventType"
                      value="single"
                      checked={formData.eventType === "single"}
                      onChange={(e) =>
                        updateFormData({
                          eventType: e.target.value as "single" | "recurring",
                        })
                      }
                      className="mr-2"
                    />
                    Single Event
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="eventType"
                      value="recurring"
                      checked={formData.eventType === "recurring"}
                      onChange={(e) =>
                        updateFormData({
                          eventType: e.target.value as "single" | "recurring",
                        })
                      }
                      className="mr-2"
                    />
                    Recurring Event
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.sessions[0]?.startDate || ""}
                      onChange={(e) => {
                        const newSessions = [...formData.sessions];
                        newSessions[0] = {
                          ...newSessions[0],
                          startDate: e.target.value,
                        };
                        updateFormData({ sessions: newSessions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={formData.sessions[0]?.startTime || ""}
                      onChange={(e) => {
                        const newSessions = [...formData.sessions];
                        newSessions[0] = {
                          ...newSessions[0],
                          startTime: e.target.value,
                        };
                        updateFormData({ sessions: newSessions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.sessions[0]?.endTime || ""}
                      onChange={(e) => {
                        const newSessions = [...formData.sessions];
                        newSessions[0] = {
                          ...newSessions[0],
                          endTime: e.target.value,
                        };
                        updateFormData({ sessions: newSessions });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Location</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Where will your event take place? *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      updateFormData({ location: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">
                  Additional Information
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Description
                  </label>
                  <textarea
                    value={formData.eventDescription}
                    onChange={(e) =>
                      updateFormData({ eventDescription: e.target.value })
                    }
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide a detailed description of your event, including important details..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Banner */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Upload Image</h2>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {formData.bannerImageUrl ? (
                    <div className="relative">
                      <img
                        src={formData.bannerImageUrl}
                        alt="Event banner"
                        className="max-w-full h-48 object-cover mx-auto rounded-lg"
                      />
                      <button
                        onClick={() =>
                          updateFormData({
                            bannerImage: null,
                            bannerImageUrl: "",
                          })
                        }
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">Choose file</p>
                      <p className="text-sm text-gray-500">
                        Upload images must be at least 1792 pixels wide by 1024
                        pixels high. Valid file formats: JPG, GIF, PNG.
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateFormData({ bannerImage: file });
                            const url = URL.createObjectURL(file);
                            updateFormData({ bannerImageUrl: url });
                          }
                        }}
                        className="mt-4"
                      />
                    </div>
                  )}
                </div>
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
                    className={`border-2 rounded-lg p-4 cursor-pointer ${
                      formData.ticketingType === "paid"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      updateFormData({ ticketingType: "paid" });
                      // Update existing tickets to have non-zero prices
                      const updatedTickets = formData.ticketTypes.map(
                        (ticket) => ({
                          ...ticket,
                          price: ticket.price === 0 ? 10 : ticket.price,
                        })
                      );
                      updateFormData({ ticketTypes: updatedTickets });
                    }}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🎟️</div>
                      <h3 className="font-semibold">Ticketed Event</h3>
                      <p className="text-sm text-gray-600">
                        My event requires tickets for entry
                      </p>
                    </div>
                  </div>

                  <div
                    className={`border-2 rounded-lg p-4 cursor-pointer ${
                      formData.ticketingType === "free"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                    onClick={() => {
                      updateFormData({ ticketingType: "free" });
                      // Update existing tickets to have zero prices
                      const updatedTickets = formData.ticketTypes.map(
                        (ticket) => ({
                          ...ticket,
                          price: 0,
                        })
                      );
                      updateFormData({ ticketTypes: updatedTickets });
                    }}
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
                  <h3 className="font-semibold mb-4">
                    What tickets are you selling?
                  </h3>

                  <div className="space-y-4">
                    {formData.ticketTypes.map((ticket, index) => (
                      <div
                        key={ticket.id}
                        className="flex items-center space-x-4"
                      >
                        <div className="flex-1">
                          <input
                            type="text"
                            value={ticket.name}
                            onChange={(e) =>
                              updateTicketType(ticket.id, {
                                name: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ticket Name (e.g. General Admission)"
                          />
                        </div>

                        {formData.ticketingType === "paid" && (
                          <div className="w-32">
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">
                                $
                              </span>
                              <input
                                type="number"
                                value={ticket.price}
                                onChange={(e) =>
                                  updateTicketType(ticket.id, {
                                    price: Number(e.target.value),
                                  })
                                }
                                className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        )}

                        {formData.ticketTypes.length > 1 && (
                          <button
                            onClick={() => removeTicketType(ticket.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
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
                  {formData.bannerImageUrl && (
                    <div className="mb-6">
                      <img
                        src={formData.bannerImageUrl}
                        alt="Event banner"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  {/* Event Details */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {formData.eventName}
                      </h3>
                      <p className="text-gray-600">{formData.eventCategory}</p>
                    </div>

                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{formData.sessions[0]?.startDate}</span>
                      {formData.sessions[0]?.startTime && (
                        <>
                          <Clock className="w-4 h-4 ml-4 mr-2" />
                          <span>{formData.sessions[0].startTime}</span>
                          {formData.sessions[0].endTime && (
                            <span> - {formData.sessions[0].endTime}</span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{formData.location}</span>
                    </div>

                    {formData.eventDescription && (
                      <div>
                        <h4 className="font-semibold mb-2">
                          Event Description
                        </h4>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {formData.eventDescription}
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
                            <span>{ticket.name}</span>
                            <span className="font-medium">
                              {formData.ticketingType === "free"
                                ? "Free"
                                : `$${ticket.price.toFixed(2)}`}
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
                  <p className="text-red-700">{submitError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className={`px-4 py-2 rounded-md ${
              currentStep === 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Go back
          </button>

          <div className="flex space-x-3">
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className={`px-6 py-2 rounded-md font-medium ${
                  canProceed()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Save & Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed()}
                className={`px-6 py-2 rounded-md font-medium ${
                  canProceed() && !isSubmitting
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? "Publishing..." : "Publish Event"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
