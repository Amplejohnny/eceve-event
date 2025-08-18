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
} from "lucide-react";

// Mock data - replace with your actual props
const mockEvent = {
  id: "event123",
  title: "Sound Of Christmas 2023",
  date: "2023-12-02T00:00:00.000Z",
  location: "Lagos, Nigeria",
  venue: "Eko Convention Centre",
  eventType: "PAID",
  ticketTypes: [
    {
      id: "ticket1",
      name: "Standard Ticket",
      price: 20000, // in kobo (₦200)
      quantity: 100,
    },
    {
      id: "ticket2",
      name: "VIP Ticket",
      price: 50000, // in kobo (₦500)
      quantity: 50,
    },
    {
      id: "ticket3",
      name: "VVIP Ticket",
      price: 100000, // in kobo (₦1000)
      quantity: 25,
    },
  ],
};

// Utility function
export function generateConfirmationId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Paystack fee calculation
function calculatePaystackFee(amount: number): number {
  // amount is in kobo
  if (amount < 250000) {
    // Less than ₦2,500
    return Math.round(amount * 0.015); // 1.5% only, waive ₦100 fee
  }

  const fee = Math.round(amount * 0.015) + 10000; // 1.5% + ₦100
  return Math.min(fee, 200000); // Cap at ₦2,000
}

function formatPrice(priceInKobo: number): string {
  return `₦${(priceInKobo / 100).toLocaleString()}`;
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

interface TicketQuantity {
  [ticketId: string]: number;
}

interface AttendeeInfo {
  fullName: string;
  email: string;
  confirmationId: string;
}

const TicketPurchaseModal = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1: Select, 2: Details, 3: Summary
  const [ticketQuantities, setTicketQuantities] = useState<TicketQuantity>({});
  const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo>({
    fullName: "",
    email: "",
    confirmationId: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate confirmation ID when moving to step 2
  useEffect(() => {
    if (currentStep === 2 && !attendeeInfo.confirmationId) {
      setAttendeeInfo((prev) => ({
        ...prev,
        confirmationId: generateConfirmationId(),
      }));
    }
  }, [currentStep, attendeeInfo.confirmationId]);

  const updateQuantity = (ticketId: string, change: number) => {
    setTicketQuantities((prev) => {
      const newQuantity = Math.max(0, (prev[ticketId] || 0) + change);
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
      const ticket = mockEvent.ticketTypes.find((t) => t.id === ticketId);
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

  const handlePayNow = async () => {
    setIsProcessing(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      // Here you would integrate with Paystack
      alert("Payment processing would be handled here with Paystack!");
    }, 2000);
  };

  const subTotal = getSubTotal();
  const tax = calculatePaystackFee(subTotal);
  const orderTotal = subTotal + tax;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            {currentStep > 1 && (
              <button
                title="go back"
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
            </h2>
          </div>
          <button
            title="cancel modal"
            onClick={() => setIsOpen(false)}
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
                  {mockEvent.title}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(mockEvent.date)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  {mockEvent.venue}, {mockEvent.location}
                </div>
              </div>

              {/* Ticket Types */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-medium text-gray-700 border-b pb-2">
                  <span>Ticket Types</span>
                  <span>Quantity</span>
                </div>

                {mockEvent.ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {ticket.name}
                        </h4>
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(ticket.price)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          title="minus quantity"
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
                          title="plus quantity"
                          onClick={() => updateQuantity(ticket.id, 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
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
                  {mockEvent.title}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  {formatDate(mockEvent.date)}
                </div>

                {/* Selected Tickets */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Selected Tickets:
                  </h4>
                  {Object.entries(ticketQuantities).map(([ticketId, qty]) => {
                    const ticket = mockEvent.ticketTypes.find(
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
                        <span>{formatPrice(ticket.price * qty)}</span>
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
                    placeholder="Enter Attendee's full name"
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
                    E-mail <span className="text-red-500">*</span>
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
                    placeholder="Enter your e-mail"
                  />
                  {errors.email && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
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
              {/* Ticket Card */}
              <div className="bg-white border-2 border-dashed border-blue-300 rounded-lg p-4 mb-6 relative">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">
                    Standard Ticket
                  </h3>
                  <div className="text-left space-y-1">
                    <p className="font-medium text-gray-900">
                      {attendeeInfo.fullName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {attendeeInfo.email}
                    </p>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {formatPrice(mockEvent.ticketTypes[0].price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Sub Total:</span>
                  <span className="font-bold">{formatPrice(subTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Tax:</span>
                  <span className="font-bold">{formatPrice(tax)}</span>
                </div>

                <hr className="border-gray-300" />

                <div className="flex justify-between items-center text-xl">
                  <span className="font-bold">Order Total:</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(orderTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
                    {formatPrice(subTotal)}
                  </span>
                </span>
              </div>
              <button
                onClick={handleContinueToCheckout}
                disabled={getTotalQuantity() === 0}
                className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors flex items-center justify-center"
              >
                Proceed
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
                    {formatPrice(subTotal)}
                  </span>
                </span>
              </div>
              <button
                onClick={handleContinueToSummary}
                className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center"
              >
                Continue to Checkout
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </button>
            </>
          )}

          {currentStep === 3 && (
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>🔒 Pay Now</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketPurchaseModal;
