"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EventSuccessPage from "@/components/event/EventSuccessPage";
import { EventType, EventStatus } from "@/generated/prisma";

// Updated type to match API response exactly
type Event = {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  address?: string;
  tags: string[];
  imageUrl?: string;
  description: string;
  eventType: EventType;
  isPublic: boolean;
  status: EventStatus;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number | null; // Handle null from database
  }>;
  organizer?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
  updatedAt: string;
};

// Define the transformed event type for the component
type TransformedEvent = Omit<Event, "date" | "endDate" | "ticketTypes"> & {
  date: Date;
  endDate?: Date;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
};

// Transform API response to component props
const transformEventData = (apiEvent: Event): TransformedEvent => {
  return {
    ...apiEvent,
    date: new Date(apiEvent.date),
    endDate: apiEvent.endDate ? new Date(apiEvent.endDate) : undefined,
    ticketTypes: apiEvent.ticketTypes.map((ticket) => ({
      ...ticket,
      quantity: ticket.quantity ?? undefined,
    })),
  };
};

export default function EventSuccessPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [event, setEvent] = useState<TransformedEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventId = searchParams.get("eventId");

  useEffect(() => {
    if (!eventId) {
      router.push("/");
      return;
    }

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch event");
        }
        const eventData: Event = await response.json();
        setEvent(transformEventData(eventData));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          console.error("Error fetching event:", err);
        } else {
          setError("An unknown error occurred");
          console.error("Unexpected error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
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

  return <EventSuccessPage event={event} />;
}
