"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PaymentStatus {
  status: "loading" | "success" | "failed" | "cancelled";
  reference?: string;
  message?: string;
  eventTitle?: string;
  confirmationIds?: string[];
}

// Loading component for Suspense fallback
function PaymentCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading Payment Status...
        </h2>
        <p className="text-gray-600">
          Please wait while we load your payment information
        </p>
      </div>
    </div>
  );
}

// Separate component that uses useSearchParams
function PaymentCallbackContent() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: "loading",
  });
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reference = searchParams.get("reference");
    const status = searchParams.get("status");

    if (!reference) {
      setPaymentStatus({
        status: "failed",
        message: "Payment reference not found",
      });
      return;
    }

    if (status === "cancelled") {
      setPaymentStatus({
        status: "cancelled",
        reference,
        message: "Payment was cancelled",
      });
      return;
    }

    // Verify payment status
    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(
        `/api/payments/verify?reference=${reference}`
      );
      const result = await response.json();

      if (result.success) {
        setPaymentStatus({
          status: "success",
          reference,
          eventTitle: result.eventTitle,
          confirmationIds: result.confirmationIds,
          message: "Payment successful! Check your email for ticket details.",
        });
      } else {
        setPaymentStatus({
          status: "failed",
          reference,
          message: result.message || "Payment verification failed",
        });
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentStatus({
        status: "failed",
        reference,
        message: "Failed to verify payment",
      });
    }
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoToEvents = () => {
    router.push("/events");
  };

  if (paymentStatus.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Payment...
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          {paymentStatus.status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-4">
                Your tickets have been confirmed for{" "}
                <strong>{paymentStatus.eventTitle}</strong>
              </p>

              {paymentStatus.confirmationIds && (
                <div className="bg-green-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-green-900 mb-2">
                    Confirmation IDs:
                  </h3>
                  <div className="space-y-1">
                    {paymentStatus.confirmationIds.map((id, index) => (
                      <p
                        key={index}
                        className="text-green-800 font-mono text-sm"
                      >
                        {id}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-6">
                Check your email for detailed ticket information and QR codes
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleGoToEvents}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Browse More Events
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </>
          )}

          {paymentStatus.status === "failed" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-6">{paymentStatus.message}</p>

              <div className="space-y-3">
                <button
                  onClick={() => router.back()}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </>
          )}

          {paymentStatus.status === "cancelled" && (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Cancelled
              </h2>
              <p className="text-gray-600 mb-6">
                You cancelled the payment process. No charges were made.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.back()}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </>
          )}

          {paymentStatus.reference && (
            <p className="text-xs text-gray-400 mt-4">
              Reference: {paymentStatus.reference}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallback() {
  return (
    <Suspense fallback={<PaymentCallbackLoading />}>
      <PaymentCallbackContent />
    </Suspense>
  );
}
