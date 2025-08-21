import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Minus,
  ArrowLeft,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { formatPrice } from "@/lib/payment-utils";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  eventType: "FREE" | "PAID";
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  address?: string;
  ticketTypes: TicketType[];
  organizer?: {
    name?: string;
    email?: string;
  };
}

interface TicketQuantity {
  [ticketId: string]: number;
}

interface AttendeeInfo {
  fullName: string;
  email: string;
  phone?: string;
  confirmationId: string;
}

interface TicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

// Utility functions
export function generateConfirmationId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function calculatePaystackFee(amount: number): number {
  if (amount < 250000) {
    return Math.round(amount * 0.015);
  }
  const fee = Math.round(amount * 0.015) + 10000;
  return Math.min(fee, 200000);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const TicketPurchaseModal: React.FC<TicketPurchaseModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [ticketQuantities, setTicketQuantities] = useState<TicketQuantity>({});
  const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo>({
    fullName: "",
    email: "",
    phone: "",
    confirmationId: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setTicketQuantities({});
      setAttendeeInfo({
        fullName: "",
        email: "",
        phone: "",
        confirmationId: "",
      });
      setErrors({});
      setIsProcessing(false);
      setBookingSuccess(false);
    }
  }, [isOpen]);

  // Generate confirmation ID when moving to step 2
  useEffect(() => {
    if (currentStep === 2 && !attendeeInfo.confirmationId) {
      setAttendeeInfo((prev) => ({
        ...prev,
        confirmationId: generateConfirmationId(),
      }));
    }
  }, [currentStep, attendeeInfo.confirmationId]);

  if (!isOpen || !event) return null;

  const updateQuantity = (ticketId: string, change: number) => {
    const ticketType = event.ticketTypes.find((t) => t.id === ticketId);
    if (!ticketType) return;

    setTicketQuantities((prev) => {
      const currentQty = prev[ticketId] || 0;
      const newQuantity = Math.max(0, currentQty + change);

      // Check if we exceed available quantity
      if (ticketType.quantity && newQuantity > ticketType.quantity) {
        return prev;
      }

      if (newQuantity === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newQuantity };
    });
  };

  const getTotalQuantity = (): number => {
    return Object.values(ticketQuantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getSubTotal = (): number => {
    return Object.entries(ticketQuantities).reduce((sum, [ticketId, qty]) => {
      const ticket = event.ticketTypes.find((t) => t.id === ticketId);
      return sum + (ticket ? ticket.price * qty : 0);
    }, 0);
  };

  const validateAttendeeInfo = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!attendeeInfo.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!attendeeInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(attendeeInfo.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToCheckout = () => {
    if (getTotalQuantity() === 0) return;
    setCurrentStep(2);
  };

  const handleContinueToSummary = () => {
    if (validateAttendeeInfo()) {
      setCurrentStep(3);
    }
  };

  const handleBookFreeEvent = async () => {
    setIsProcessing(true);

    try {
      // Create ticket booking for free event
      const ticketData = {
        eventId: event.id,
        tickets: Object.entries(ticketQuantities).map(
          ([ticketTypeId, quantity]) => ({
            ticketTypeId,
            quantity,
            attendeeName: attendeeInfo.fullName,
            attendeeEmail: attendeeInfo.email,
            attendeePhone: attendeeInfo.phone,
          })
        ),
      };

      const response = await fetch("/api/tickets/book-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      if (response.ok) {
        setBookingSuccess(true);
        setCurrentStep(4); // Success step
      } else {
        throw new Error("Failed to book tickets");
      }
    } catch (error) {
      console.error("Error booking free tickets:", error);
      alert("Failed to book tickets. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayNow = async () => {
    setIsProcessing(true);

    try {
      // Initialize Paystack payment
      const paymentData = {
        eventId: event.id,
        tickets: Object.entries(ticketQuantities).map(
          ([ticketTypeId, quantity]) => ({
            ticketTypeId,
            quantity,
            attendeeName: attendeeInfo.fullName,
            attendeeEmail: attendeeInfo.email,
            attendeePhone: attendeeInfo.phone,
          })
        ),
        amount: getSubTotal() + calculatePaystackFee(getSubTotal()),
        customerEmail: attendeeInfo.email,
      };

      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (result.success) {
        // Redirect to Paystack payment page
        window.location.href = result.authorization_url;
      } else {
        throw new Error(result.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("Error initializing payment:", error);
      alert("Failed to initialize payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const subTotal = getSubTotal();
  const tax = event.eventType === "PAID" ? calculatePaystackFee(subTotal) : 0;
  const orderTotal = subTotal + tax;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            {currentStep > 1 && currentStep !== 4 && (
              <button
                title="Go back"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="mr-3 p-1 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {currentStep === 1 && "Select Tickets"}
              {currentStep === 2 && "Attendee Details"}
              {currentStep === 3 && "Order Summary"}
              {currentStep === 4 && "Booking Confirmed"}
            </h2>
          </div>
          <button
            title="Close modal"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Select Tickets */}
          {currentStep === 1 && (
            <div className="p-4">
              {/* Event Info */}
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {event.title}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(event.date)}
                  {event.endDate && ` - ${formatDate(event.endDate)}`}
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {event.venue || event.location}
                </div>
              </div>

              {/* Ticket Types */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-gray-700 border-b pb-2">
                  <span>Ticket Types</span>
                  <span>Quantity</span>
                </div>

                {event.ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {ticket.name}
                        </h4>
                        <p className="text-lg font-bold text-gray-900">
                          {ticket.price === 0
                            ? "Free"
                            : formatPrice(ticket.price)}
                        </p>
                        {ticket.quantity && (
                          <p className="text-sm text-gray-500">
                            {ticket.quantity} available
                          </p>
                        )}
                      </div>

                      {/* For free events, users get 1 ticket max per type */}
                      {event.eventType === "FREE" ? (
                        <div className="flex items-center space-x-3">
                          <button
                            title="Remove ticket"
                            onClick={() => updateQuantity(ticket.id, -1)}
                            disabled={!ticketQuantities[ticket.id]}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="text-2xl font-bold text-gray-900 min-w-[2rem] text-center">
                            {Math.min(ticketQuantities[ticket.id] || 0, 1)}
                          </span>

                          <button
                            title="Add ticket"
                            onClick={() => updateQuantity(ticket.id, 1)}
                            disabled={(ticketQuantities[ticket.id] || 0) >= 1}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <button
                            title="Decrease quantity"
                            onClick={() => updateQuantity(ticket.id, -1)}
                            disabled={!ticketQuantities[ticket.id]}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="text-2xl font-bold text-gray-900 min-w-[2rem] text-center">
                            {ticketQuantities[ticket.id] || 0}
                          </span>

                          <button
                            title="Increase quantity"
                            onClick={() => updateQuantity(ticket.id, 1)}
                            disabled={
                              !!ticket.quantity &&
                              (ticketQuantities[ticket.id] || 0) >= ticket.quantity
                            }
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Attendee Details */}
          {currentStep === 2 && (
            <div className="p-4">
              {/* Event Info */}
              <div className="mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {event.title}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(event.date)}
                </div>

                {/* Selected Tickets */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Selected Tickets:
                  </h4>
                  {Object.entries(ticketQuantities).map(([ticketId, qty]) => {
                    const ticket = event.ticketTypes.find(
                      (t) => t.id === ticketId
                    );
                    if (!ticket) return null;
                    return (
                      <div
                        key={ticketId}
                        className="flex justify-between text-sm text-blue-800"
                      >
                        <span>
                          {ticket.name} × {qty}
                        </span>
                        <span>
                          {ticket.price === 0
                            ? "Free"
                            : formatPrice(ticket.price * qty)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Confirmation ID */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">
                      Confirmation ID: {attendeeInfo.confirmationId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={attendeeInfo.fullName}
                    onChange={(e) => {
                      setAttendeeInfo((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }));
                      if (errors.fullName)
                        setErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.fullName ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter attendee's full name"
                  />
                  {errors.fullName && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.fullName}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={attendeeInfo.email}
                    onChange={(e) => {
                      setAttendeeInfo((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }));
                      if (errors.email)
                        setErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your email"
                  />
                  {errors.email && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={attendeeInfo.phone}
                    onChange={(e) => {
                      setAttendeeInfo((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="pt-4">
                  <p className="text-center text-sm text-gray-600">
                    I accept the{" "}
                    <a href="#" className="text-blue-600 hover:underline">
                      Terms of Service
                    </a>{" "}
                    and have read the{" "}
                    <a href="#" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Order Summary */}
          {currentStep === 3 && (
            <div className="p-4">
              {/* Ticket Summary */}
              <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">
                    {event.title}
                  </h3>
                  <div className="text-left space-y-2">
                    <p className="font-medium text-gray-900">
                      {attendeeInfo.fullName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {attendeeInfo.email}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(event.date)} at {formatTime(event.startTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Tickets */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  Selected Tickets
                </h4>
                {Object.entries(ticketQuantities).map(([ticketId, qty]) => {
                  const ticket = event.ticketTypes.find(
                    (t) => t.id === ticketId
                  );
                  if (!ticket) return null;
                  return (
                    <div
                      key={ticketId}
                      className="flex justify-between items-center py-2 border-b border-gray-100"
                    >
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        <p className="text-sm text-gray-600">Quantity: {qty}</p>
                      </div>
                      <p className="font-semibold">
                        {ticket.price === 0
                          ? "Free"
                          : formatPrice(ticket.price * qty)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Pricing Breakdown for Paid Events */}
              {event.eventType === "PAID" && (
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">{formatPrice(subTotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">Processing Fee:</span>
                    <span className="font-bold">{formatPrice(tax)}</span>
                  </div>

                  <hr className="border-gray-300" />

                  <div className="flex justify-between items-center text-xl">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-green-600">
                      {formatPrice(orderTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success for Free Events */}
          {currentStep === 4 && bookingSuccess && (
            <div className="p-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Event Booked Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Your tickets have been confirmed. Check your email for booking
                details and confirmation.
              </p>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>Confirmation ID:</strong>{" "}
                  {attendeeInfo.confirmationId}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Present this ID at the event entrance
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentStep < 4 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            {currentStep === 1 && (
              <>
                <div className="flex justify-between items-center mb-4 text-lg font-semibold">
                  <span>
                    Qty:{" "}
                    <span className="text-green-600">{getTotalQuantity()}</span>
                  </span>
                  <span>
                    Total:{" "}
                    <span className="text-green-600">
                      {subTotal === 0 ? "Free" : formatPrice(subTotal)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={handleContinueToCheckout}
                  disabled={getTotalQuantity() === 0}
                  className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors flex items-center justify-center"
                >
                  Continue
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </button>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="flex justify-between items-center mb-4 text-lg font-semibold">
                  <span>
                    Qty:{" "}
                    <span className="text-green-600">{getTotalQuantity()}</span>
                  </span>
                  <span>
                    Total:{" "}
                    <span className="text-green-600">
                      {subTotal === 0 ? "Free" : formatPrice(subTotal)}
                    </span>
                  </span>
                </div>
                <button
                  onClick={handleContinueToSummary}
                  className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center"
                >
                  Continue to Summary
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </button>
              </>
            )}

            {currentStep === 3 && (
              <button
                onClick={
                  event.eventType === "FREE"
                    ? handleBookFreeEvent
                    : handlePayNow
                }
                disabled={isProcessing}
                className={`w-full text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center ${
                  event.eventType === "FREE"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : event.eventType === "FREE" ? (
                  "Book Free Tickets"
                ) : (
                  <>🔒 Pay Now</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketPurchaseModal;
