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
import {
  formatDate,
  formatPrice,
  formatTime,
  isValidEmail,
  isValidPhone,
} from "@/lib/utils";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  soldCount?: number;
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
}

interface TicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

interface ticketDataItem {
  ticketTypeId: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
}

// Updated fee calculation to match backend payment-utils.ts
function calculatePaystackFee(amount: number): number {
  if (amount < 250000) {
    return Math.round(amount * 0.015);
  }
  const fee = Math.round(amount * 0.015) + 10000; // 1.5% + ₦100
  return Math.min(fee, 200000); // Cap at ₦2,000
}

// Platform breakdown calculation (matches backend)
function calculatePaymentBreakdown(ticketSubtotal: number) {
  const paystackFee = calculatePaystackFee(ticketSubtotal);

  // Platform takes 7% of ticket subtotal, organizer gets 93%
  const platformAmount = Math.round(ticketSubtotal * 0.07);
  const organizerAmount = ticketSubtotal - platformAmount;

  // Total amount customer pays = tickets + paystack fee
  const totalAmount = ticketSubtotal + paystackFee;

  return {
    ticketSubtotal,
    paystackFee,
    totalAmount,
    organizerAmount,
    platformAmount,
  };
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
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [confirmationIds, setConfirmationIds] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string>("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setTicketQuantities({});
      setAttendeeInfo({
        fullName: "",
        email: "",
        phone: "",
      });
      setErrors({});
      setApiError("");
      setIsProcessing(false);
      setBookingSuccess(false);
      setConfirmationIds([]);
    }
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const updateQuantity = (ticketId: string, change: number) => {
    const ticketType = event.ticketTypes.find((t) => t.id === ticketId);
    if (!ticketType) return;

    setTicketQuantities((prev) => {
      const currentQty = prev[ticketId] || 0;
      let newQuantity = Math.max(0, currentQty + change);

      // For free events, limit to 1 ticket per type
      if (event.eventType === "FREE" && newQuantity > 1) {
        newQuantity = 1;
      }

      // Check if we exceed available quantity (considering sold tickets)
      if (ticketType.quantity !== undefined) {
        const soldTickets = ticketType.soldCount || 0;
        const availableQuantity = Math.max(
          0,
          ticketType.quantity - soldTickets
        );

        if (newQuantity > availableQuantity) {
          return prev; // Don't allow quantity that exceeds available
        }
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

    // Name validation
    if (!attendeeInfo.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (attendeeInfo.fullName.trim().length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    } else if (attendeeInfo.fullName.trim().length > 100) {
      newErrors.fullName = "Name must be less than 100 characters";
    } else if (!/^[a-zA-Z\s'-]+$/.test(attendeeInfo.fullName.trim())) {
      newErrors.fullName =
        "Name can only contain letters, spaces, hyphens and apostrophes";
    }

    // Email validation
    if (!attendeeInfo.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(attendeeInfo.email)) {
      newErrors.email = "Please enter a valid email address";
    } else if (attendeeInfo.email.length > 255) {
      newErrors.email = "Email must be less than 255 characters";
    }

    // Phone validation (optional)
    if (attendeeInfo.phone && attendeeInfo.phone.trim() !== "") {
      if (!isValidPhone(attendeeInfo.phone)) {
        newErrors.phone = "Please enter a valid Nigerian phone number";
      }
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
    setApiError("");

    try {
      const ticketData = {
        eventId: event.id,
        tickets: Object.entries(ticketQuantities).map(
          ([ticketTypeId, quantity]) => {
            const ticketDataItem: ticketDataItem = {
              ticketTypeId,
              quantity,
              attendeeName: attendeeInfo.fullName.trim(),
              attendeeEmail: attendeeInfo.email.trim().toLowerCase(),
            };
            if (attendeeInfo.phone && attendeeInfo.phone.trim() !== "") {
              ticketDataItem.attendeePhone = attendeeInfo.phone.trim();
            }

            return ticketDataItem;
          }
        ),
      };

      const response = await fetch("/api/tickets/book-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setConfirmationIds(result.confirmationIds || []);
        setBookingSuccess(true);
        setCurrentStep(4);
      } else {
        setApiError(result.message || "Failed to book tickets");
      }
    } catch (error) {
      console.error("Error booking free tickets:", error);
      setApiError("Failed to book tickets. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayNow = async () => {
    setIsProcessing(true);
    setApiError("");

    try {
      const paymentBreakdown = calculatePaymentBreakdown(getSubTotal());

      const paymentData = {
        eventId: event.id,
        tickets: Object.entries(ticketQuantities).map(
          ([ticketTypeId, quantity]) => {
            const ticketDataItem: ticketDataItem = {
              ticketTypeId,
              quantity,
              attendeeName: attendeeInfo.fullName.trim(),
              attendeeEmail: attendeeInfo.email.trim().toLowerCase(),
            };
            if (attendeeInfo.phone && attendeeInfo.phone.trim() !== "") {
              ticketDataItem.attendeePhone = attendeeInfo.phone.trim();
            }

            return ticketDataItem;
          }
        ),
        amount: paymentBreakdown.totalAmount,
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
        setApiError(result.message || "Failed to initialize payment");
      }
    } catch (error) {
      console.error("Error initializing payment:", error);
      setApiError("Failed to initialize payment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const subTotal = getSubTotal();
  const paymentBreakdown = calculatePaymentBreakdown(subTotal);

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
                className="mr-3 p-1 hover:bg-gray-100 rounded-full cursor-pointer"
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
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
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

                {event.ticketTypes.map((ticket) => {
                  // Calculate available tickets
                  const soldTickets = ticket.soldCount || 0;
                  const totalTickets = ticket.quantity; // This can be undefined
                  const availableTickets =
                    totalTickets !== undefined
                      ? Math.max(0, totalTickets - soldTickets)
                      : undefined; // undefined means unlimited
                  const isOutOfStock = availableTickets === 0;

                  return (
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
                          {/* Updated availability display */}
                          {availableTickets !== undefined ? (
                            <p
                              className={`text-sm ${
                                isOutOfStock
                                  ? "text-red-500 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {isOutOfStock
                                ? "Sold out"
                                : `${availableTickets} available`}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Unlimited available
                            </p>
                          )}
                        </div>

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
                              isOutOfStock ||
                              (availableTickets !== undefined &&
                                (ticketQuantities[ticket.id] || 0) >=
                                  availableTickets) ||
                              (event.eventType === "FREE" &&
                                (ticketQuantities[ticket.id] || 0) >= 1)
                            }
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                      if (errors.phone)
                        setErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </div>
                  )}
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

              {/* API Error Display */}
              {apiError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                    <p className="text-red-800 text-sm">{apiError}</p>
                  </div>
                </div>
              )}

              {/* Pricing Breakdown for Paid Events */}
              {event.eventType === "PAID" && subTotal > 0 && (
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">Subtotal:</span>
                    <span className="font-bold">
                      {formatPrice(paymentBreakdown.ticketSubtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Platform Fee (7%):</span>
                    <span>{formatPrice(paymentBreakdown.platformAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Organizer Amount:</span>
                    <span>{formatPrice(paymentBreakdown.organizerAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium">
                      Processing Fee (Paystack):
                    </span>
                    <span className="font-bold">
                      {formatPrice(paymentBreakdown.paystackFee)}
                    </span>
                  </div>

                  <hr className="border-gray-300" />

                  <div className="flex justify-between items-center text-xl">
                    <span className="font-bold">Total Amount:</span>
                    <span className="font-bold text-green-600">
                      {formatPrice(paymentBreakdown.totalAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && bookingSuccess && (
            <div className="p-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {event.eventType === "FREE"
                  ? "Event Booked Successfully!"
                  : "Payment Successful!"}
              </h3>
              <p className="text-gray-600 mb-4">
                {event.eventType === "FREE"
                  ? "Your free tickets have been confirmed. Check your email for booking details and confirmation."
                  : "Your payment was successful. Check your email for tickets and confirmation details."}
              </p>
              {confirmationIds.length > 0 && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <strong>
                      Confirmation ID{confirmationIds.length > 1 ? "s" : ""}:
                    </strong>
                    <br />
                    {confirmationIds.join(", ")}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Present{" "}
                    {confirmationIds.length > 1 ? "these IDs" : "this ID"} at
                    the event entrance
                  </p>
                </div>
              )}
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
                  className="w-full cursor-pointer bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors flex items-center justify-center"
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
                  className="w-full cursor-pointer bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center"
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
                className={`w-full cursor-pointer text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center ${
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
                  <>🔒 Pay {formatPrice(paymentBreakdown.totalAmount)}</>
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
