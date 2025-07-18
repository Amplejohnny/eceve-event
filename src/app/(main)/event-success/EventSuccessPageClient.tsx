"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EventSuccessPage from "@/components/event/EventSuccessPage";
import { useEventStore } from "@/store/eventStore";

export default function EventSuccessPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loadEvent, formData, isLoading } = useEventStore();
  const [error, setError] = useState<string | null>(null);

  const eventId = searchParams.get("eventId");

  useEffect(() => {
    if (!eventId) {
      router.push("/");
      return;
    }

    const fetchEvent = async () => {
      try {
        setError(null);
        await loadEvent(eventId);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          console.error("Error fetching event:", err);
        } else {
          setError("An unknown error occurred");
          console.error("Unexpected error:", err);
        }
      }
    };

    fetchEvent();
  }, [eventId, router, loadEvent]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !formData.title) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Event not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Transform the store formData to match EventSuccessPage props
  const eventForDisplay = {
    id: eventId!,
    slug: formData.slug,
    title: formData.title,
    category: formData.category,
    date: formData.date!,
    endDate: formData.endDate || undefined,
    startTime: formData.startTime,
    endTime: formData.endTime || undefined,
    location: formData.location,
    venue: formData.venue || undefined,
    address: formData.address || undefined,
    tags: formData.tags,
    imageUrl: formData.imageUrl || undefined,
    description: formData.description,
    eventType: formData.eventType,
    ticketTypes: formData.ticketTypes,
  };

  return <EventSuccessPage event={eventForDisplay} />;
}
