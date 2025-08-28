import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EventSlugPage from "@/components/event/EventSlug";
import { getEvent } from "@/lib/server-utils";
import { getEventImageUrl } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Generate dynamic metadata based on the event
export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    return {
      title: "Event Not Found - Comforeve",
      description: "The event you're looking for could not be found.",
    };
  }

  const eventUrl = `https://www.comforeve.com/events/${slug}`;
  const imageUrl = event.imageUrl ? getEventImageUrl(event.imageUrl, true) : null;

  // Format date for description
  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Format time
  const eventTime = event.startTime
    ? (() => {
        const [hours, minutes] = event.startTime.split(":");
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      })()
    : "";

  // Create rich description for sharing
  const shareDescription = `${event.description.slice(
    0,
    150
  )}... | ${eventDate}${eventTime ? ` at ${eventTime}` : ""} | ${
    event.location || event.venue || "TBA"
  }`;

  return {
    title: `${event.title} - Comforeve`,
    description: shareDescription,
    keywords: [
      event.title,
      event.category,
      ...(event.tags || []),
      "event",
      "tickets",
      "Comforeve",
      event.location || "",
    ].filter(Boolean),

    // Open Graph metadata for social sharing
    openGraph: {
      title: event.title,
      description: shareDescription,
      url: eventUrl,
      siteName: "Comforeve",
      type: "website",
      locale: "en_US",
      ...(imageUrl && {
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: event.title,
          },
        ],
      }),
    },

    // Twitter Card metadata
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: shareDescription,
      ...(imageUrl && {
        images: [imageUrl],
      }),
    },

    // Additional metadata
    other: {
      "event:start_time": event.date ? new Date(event.date).toISOString() : "",
      "event:end_time": event.endDate
        ? new Date(event.endDate).toISOString()
        : event.date
        ? new Date(event.date).toISOString()
        : "",
      "event:location": event.location || event.venue || "",
      "event:organizer": event.organizer?.name || "",
      "event:category": event.category || "",
      "event:price":
        event.ticketTypes && event.ticketTypes.length > 0
          ? event.ticketTypes[0].price === 0
            ? "Free"
            : `₦${(event.ticketTypes[0].price / 100).toLocaleString()}`
          : "TBA",
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEvent(slug);

  if (!event) {
    notFound();
  }

  // Pass the server-fetched event data to the client component
  return <EventSlugPage initialEvent={event} />;
}
