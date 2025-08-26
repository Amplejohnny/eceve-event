"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EventSuccessPage from "@/components/event/EventSuccessPage";
import { useEventStore } from "@/store/eventStore";

export default function EventSuccessPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loadEvent, currentEvent, isLoading, eventError, clearAllErrors } = useEventStore();
  const [localError, setLocalError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const eventId = searchParams.get("eventId");

  useEffect(() => {
    // Clear any previous errors when component mounts
    clearAllErrors();
    setLocalError(null);

    if (!eventId) {
      setLocalError("No event ID provided");
      // Delay redirect to show error briefly
      const timer = setTimeout(() => {
        router.push("/");
      }, 2000);
      return () => clearTimeout(timer);
    }

    const fetchEvent = async () => {
      try {
        setLocalError(null);
        setIsInitialized(false);
        
        await loadEvent(eventId);
        setIsInitialized(true);
      } catch (err) {
        console.error("Error fetching event:", err);
        if (err instanceof Error) {
          setLocalError(err.message);
        } else {
          setLocalError("An unexpected error occurred while loading the event");
        }
        setIsInitialized(true);
      }
    };

    fetchEvent();
  }, [eventId, router, loadEvent, clearAllErrors]);

  // Show loading state
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your event...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (localError || eventError || !currentEvent) {
    const displayError = localError || eventError || "Event not found or could not be loaded";
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Unable to Load Event
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            {displayError}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => router.push("/")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go Home
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
          
          {eventId && (
            <p className="text-xs text-gray-400 mt-4">
              Event ID: {eventId}
            </p>
          )}
        </div>
      </div>
    );
  }

//   console.log("Event image data:", {
//   originalImageUrl: currentEvent.imageUrl,
//   hasImage: !!currentEvent.imageUrl,
//   eventId: currentEvent.id
// });

  // Transform the currentEvent to match EventSuccessPage props
  const eventForDisplay = {
    id: currentEvent.id,
    slug: currentEvent.slug,
    title: currentEvent.title,
    category: currentEvent.category,
    date: new Date(currentEvent.date),
    endDate: currentEvent.endDate ? new Date(currentEvent.endDate) : undefined,
    startTime: currentEvent.startTime,
    endTime: currentEvent.endTime || undefined,
    location: currentEvent.location,
    venue: currentEvent.venue || undefined,
    address: currentEvent.address || undefined,
    tags: currentEvent.tags || [],
    imageUrl: currentEvent.imageUrl || undefined,
    description: currentEvent.description || "",
    eventType: currentEvent.eventType as "FREE" | "PAID",
    ticketTypes: currentEvent.ticketTypes || [],
  };

  return <EventSuccessPage event={eventForDisplay} />;
}