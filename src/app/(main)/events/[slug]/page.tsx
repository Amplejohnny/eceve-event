import EventSlugPage from "@/components/event/EventSlug";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Event Details",
  description: "View details about the event",
  keywords: ["event details", "event information", "event page", "Comforeve"],
  url: "https://www.comforeve.com/events/[slug]",
});

export default function EventPage() {
  return <EventSlugPage />;
}
