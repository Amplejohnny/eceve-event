import { Calendar, MapPin, Users, Eye, Share2, Edit } from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getEventImageUrl,
  getErrorMessage,
  truncateText,
  getRelativeTime,
  isEventActive,
  isEventPast,
  getEventShareUrl
} from "@/lib/utils";
import Image from "next/image";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  sold: number;
  currentPrice?: number;
}

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  venue?: string;
  imageUrl?: string;
  status: "DRAFT" | "ACTIVE" | "CANCELLED" | "COMPLETED" | "SUSPENDED";
  slug: string;
  displayStatus: string;
  ticketTypes: TicketType[];
  totalTicketsSold: number;
  createdAt: string;
  updatedAt: string;
}

interface EventCardProps {
  event: Event;
}

const getStatusColor = (
  status: string
):
  | "text-green-600 bg-green-50"
  | "text-blue-600 bg-blue-50"
  | "text-red-600 bg-red-50"
  | "text-orange-600 bg-orange-50"
  | "text-yellow-600 bg-yellow-50"
  | "text-gray-600 bg-gray-50" => {
  switch (status) {
    case "upcoming":
    case "active":
      return "text-green-600 bg-green-50";
    case "completed":
      return "text-blue-600 bg-blue-50";
    case "cancelled":
      return "text-red-600 bg-red-50";
    case "refunded":
      return "text-orange-600 bg-orange-50";
    case "suspended":
      return "text-yellow-600 bg-yellow-50";
    case "draft":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

const calculateRevenue = (event: Event): number => {
  return event.ticketTypes.reduce((total, ticketType) => {
    return total + ticketType.sold * ticketType.price;
  }, 0);
};

const getQuantityDisplay = (quantity: number | null, sold: number): string => {
  if (quantity === null) {
    return `${sold} sold (Unlimited)`;
  }
  return `${sold} / ${quantity} sold`;
};

// Replace availability calculation
const getAvailability = (quantity: number | null, sold: number): string => {
  if (quantity === null) {
    return "Available"; // or "Unlimited available"
  }
  const available = quantity - sold;
  return available > 0 ? `${available} available` : "Sold out";
};

// Replace progress bar calculation
const getProgressPercentage = (
  quantity: number | null,
  sold: number
): number => {
  if (quantity === null) {
    return 0; // Don't show progress bar for unlimited
  }
  return (sold / quantity) * 100;
};

const handleShare = async (event: Event): Promise<void> => {
  const shareData = {
    title: event.title,
    text: `Check out this event: ${event.title}`,
    url: getEventShareUrl(event.slug),
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      alert("Event link copied to clipboard!");
    }
  } catch (err) {
    console.error("Error sharing:", getErrorMessage(err));
  }
};

export default function EventCard({
  event,
}: EventCardProps): React.JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="w-full lg:w-24 h-48 lg:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            <Image
              src={getEventImageUrl(event.imageUrl)}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h2
                  className="font-semibold text-lg sm:text-xl text-gray-900 mb-2"
                  title={event.title}
                >
                  {truncateText(event.title, 60)}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span
                      className={
                        isEventPast(event.date)
                          ? "text-red-600"
                          : isEventActive(event.date)
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {formatDate(event.date, "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {event.venue || event.location}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {event.totalTicketsSold} sold
                    </span>
                    <p className="text-gray-600">
                      {event.ticketTypes.length} ticket type(s)
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Revenue: {formatCurrency(calculateRevenue(event))}
                    </span>
                    <p className="text-gray-600">
                      Created {getRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  event.displayStatus
                )}`}
              >
                {event.displayStatus.charAt(0).toUpperCase() +
                  event.displayStatus.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                aria-label={`View ${event.title}`}
                onClick={() => window.open(`/event/${event.slug}`, "_blank")}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                aria-label={`Share ${event.title}`}
                onClick={() => handleShare(event)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                aria-label={`Edit ${event.title}`}
                onClick={() =>
                  window.open(`/dashboard/events/${event.id}/edit`, "_blank")
                }
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
        {event.ticketTypes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Ticket Types
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {event.ticketTypes.map((ticketType) => (
                <div key={ticketType.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {ticketType.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(ticketType.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">
                        {getQuantityDisplay(
                          ticketType.quantity,
                          ticketType.sold
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getAvailability(ticketType.quantity, ticketType.sold)}
                      </p>
                      {/* Only show progress bar if quantity is not null */}
                      {ticketType.quantity !== null && (
                        <div className="w-12 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{
                              width: `${getProgressPercentage(
                                ticketType.quantity,
                                ticketType.sold
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
