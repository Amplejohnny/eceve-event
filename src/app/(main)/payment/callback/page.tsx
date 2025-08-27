"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
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

  const verifyPayment = useCallback(
    async (reference: string, retryCount: number = 0) => {
      const maxRetries = 5;

      try {
        // console.log(
        //   `Verifying payment for reference: ${reference} (attempt ${
        //     retryCount + 1
        //   }/${maxRetries + 1})`
        // );

        const response = await fetch(
          `/api/payments/verify?reference=${reference}`,
          {
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(30000), // 30 second timeout
          }
        );
        const result = await response.json();

        // console.log("Verification result:", result);

        if (result.success) {
          setPaymentStatus({
            status: "success",
            reference,
            eventTitle: result.eventTitle,
            confirmationIds: result.confirmationIds,
            message: "Payment successful! Check your email for ticket details.",
          });
          return;
        }

        // Handle different failure scenarios
        if (result.message?.includes("being processed")) {
          if (retryCount < maxRetries) {
            setPaymentStatus({
              status: "loading",
              reference,
              message: `Creating your tickets... (${retryCount + 1}/${
                maxRetries + 1
              })`,
            });

            // Exponential backoff with jitter
            const baseDelay = 2000; // 2 seconds base
            const exponentialDelay = baseDelay * Math.pow(1.5, retryCount);
            const jitter = Math.random() * 1000; // Add up to 1 second random delay
            const delay = Math.min(exponentialDelay + jitter, 15000); // Cap at 15 seconds

            setTimeout(() => {
              verifyPayment(reference, retryCount + 1);
            }, delay);
            return;
          }
        }

        // Handle specific error cases
        if (result.message?.includes("not found")) {
          setPaymentStatus({
            status: "failed",
            reference,
            message:
              "Payment record not found. Please contact support with your reference number.",
          });
          return;
        }

        if (result.message?.includes("not successful")) {
          setPaymentStatus({
            status: "failed",
            reference,
            message:
              "Payment was not completed successfully. Please try again.",
          });
          return;
        }

        // Final failure after all retries
        if (retryCount >= maxRetries) {
          setPaymentStatus({
            status: "failed",
            reference,
            message:
              "We're still processing your payment. Please check back in a few minutes or contact support if the issue persists.",
          });
          return;
        }

        // Generic failure
        setPaymentStatus({
          status: "failed",
          reference,
          message:
            result.message ||
            "Payment verification failed. Please contact support.",
        });
      } catch (error) {
        console.error("Payment verification error:", error);

        // Type guard for error checking
        const isError = error instanceof Error;
        const errorMessage = isError ? error.message : String(error);
        const errorName = isError ? error.name : "";

        // Handle network errors with retry
        if (
          retryCount < 2 &&
          (errorName === "AbortError" ||
            errorMessage.includes("fetch") ||
            errorMessage.includes("network"))
        ) {
          // console.log(
          //   `Network error, retrying... (${retryCount + 1}/${maxRetries + 1})`
          // );

          setPaymentStatus({
            status: "loading",
            reference,
            message: "Connection issue, retrying...",
          });

          setTimeout(() => {
            verifyPayment(reference, retryCount + 1);
          }, 3000);
          return;
        }

        setPaymentStatus({
          status: "failed",
          reference,
          message:
            "Failed to verify payment due to connection issues. Please refresh the page.",
        });
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    if (paymentStatus.reference) {
      setPaymentStatus({
        status: "loading",
        reference: paymentStatus.reference,
      });
      verifyPayment(paymentStatus.reference, 0);
    }
  }, [paymentStatus.reference, verifyPayment]);

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
  }, [searchParams, verifyPayment]);

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoToEvents = () => {
    router.push("/events");
  };

  if (paymentStatus.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {paymentStatus.message || "Verifying Payment..."}
          </h2>
          <p className="text-gray-600 mb-4">
            {paymentStatus.message?.includes("Creating")
              ? "Your tickets are being generated. This process may take up to 30 seconds."
              : paymentStatus.message?.includes("Connection")
              ? "Reconnecting to verify your payment..."
              : "Please wait while we confirm your payment"}
          </p>

          {paymentStatus.reference && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-600 font-mono">
                Reference: {paymentStatus.reference}
              </p>
            </div>
          )}

          {/* Add a cancel button for long waits */}
          <button
            onClick={handleGoHome}
            className="text-gray-500 text-sm hover:text-gray-700 underline"
          >
            Go Home (check email for updates)
          </button>
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
                  className="w-full cursor-pointer bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Browse More Events
                </button>
                <button
                  onClick={handleGoHome}
                  className="w-full cursor-pointer bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
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
                {paymentStatus.message?.includes("still processing")
                  ? "Processing Payment"
                  : "Payment Issue"}
              </h2>
              <p className="text-gray-600 mb-6">{paymentStatus.message}</p>

              <div className="space-y-3">
                {/* Show refresh button if it might be a processing issue */}
                {(paymentStatus.message?.includes("still processing") ||
                  paymentStatus.message?.includes("connection")) && (
                  <button
                    onClick={handleRefresh}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    Check Status Again
                  </button>
                )}

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

                {/* Contact support button for persistent issues */}
                {paymentStatus.message?.includes("contact support") && (
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent(
                        "Payment Issue - " + paymentStatus.reference
                      );
                      const body = encodeURIComponent(
                        `Hi, I'm having an issue with my payment.\n\nReference: ${paymentStatus.reference}\nIssue: ${paymentStatus.message}\n\nPlease help.`
                      );
                      window.open(
                        `mailto:support@yourapp.com?subject=${subject}&body=${body}`
                      );
                    }}
                    className="w-full bg-gray-800 text-white py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
                  >
                    Contact Support
                  </button>
                )}
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
