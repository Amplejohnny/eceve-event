import AllEventsPage from "@/components/event/AllEvents";
import { constructMetadata } from "@/lib/metadata";

export const metadata = constructMetadata({
  title: "Browse Events - Comforeve",
  description:
    "Explore a world of events and find what excites you. Browse concerts, workshops, conferences, networking events and more happening near you.",
  keywords: [
    "events",
    "browse events",
    "concerts",
    "workshops",
    "conferences",
    "networking",
    "Comforeve",
  ],
  url: "https://www.comforeve.com/events",
});

export default function EventsPage() {
  return <AllEventsPage />;
}
