import { Calendar, MapPin, Users, Eye, Share2, Edit } from "lucide-react";
import {
  formatDateBook,
  formatCurrency,
  getEventImageUrl,
  getErrorMessage,
  truncateText,
  getRelativeTime,
  isEventActive,
  isEventPast,
  getEventShareUrl,
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

const calculateRevenueBreakdown = (event: Event) => {
  const ticketSubtotal = event.ticketTypes.reduce((total, ticketType) => {
    const currentPrice = ticketType.currentPrice || ticketType.price;
    return total + ticketType.sold * currentPrice;
  }, 0);

  const platformFee = Math.round(ticketSubtotal * 0.07);
  const organizerRevenue = ticketSubtotal - platformFee;

  return {
    grossRevenue: ticketSubtotal,
    platformFee,
    netRevenue: organizerRevenue,
  };
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
  const revenue = calculateRevenueBreakdown(event);
  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          {/* Event Image */}
          <div className="w-full lg:w-20 h-32 sm:h-36 lg:h-20 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
            <Image
              src={getEventImageUrl(event.imageUrl)}
              alt={event.title}
              width={400}
              height={240}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              {/* Title and meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className="font-semibold text-sm sm:text-base text-gray-900 truncate"
                    title={event.title}
                  >
                    {truncateText(event.title, 50)}
                  </h2>
                  {/* Status Badge */}
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(
                      event.displayStatus
                    )}`}
                  >
                    {event.displayStatus.charAt(0).toUpperCase() +
                      event.displayStatus.slice(1)}
                  </span>
                </div>

                {/* Date and Location in one line */}
                <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-600 gap-x-3 gap-y-1 mb-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span
                      className={
                        isEventPast(event.date)
                          ? "text-red-600"
                          : isEventActive(event.date)
                          ? "text-green-600"
                          : ""
                      }
                    >
                      {formatDateBook(event.date, "MMM dd, yyyy")}
                    </span>
                  </div>
                  <span className="hidden sm:inline">•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px] sm:max-w-[200px]">
                      {event.venue || event.location}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:gap-4 text-[11px] sm:text-xs">
                  <div>
                    <span className="font-medium text-gray-900 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {event.totalTicketsSold} sold
                    </span>
                    <p className="text-gray-600">
                      {event.ticketTypes.length} type(s)
                    </p>
                  </div>
                  <div>
                    <div className="group relative">
                      <span className="font-medium text-gray-900 cursor-help">
                        {formatCurrency(revenue.netRevenue)}
                      </span>
                      {/* Tooltip showing breakdown on hover */}
                      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 whitespace-nowrap z-10 shadow-lg">
                        <div>Gross: {formatCurrency(revenue.grossRevenue)}</div>
                        <div>
                          Platform Fee: -{" "}{formatCurrency(revenue.platformFee)}
                        </div>
                        <div className="border-t border-gray-600 pt-1 mt-1">
                          Net: {formatCurrency(revenue.netRevenue)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      Created {getRelativeTime(event.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                aria-label={`View ${event.title}`}
                onClick={() => window.open(`/events/${event.slug}`, "_blank")}
                className="flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] sm:text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                aria-label={`Share ${event.title}`}
                onClick={() => handleShare(event)}
                className="flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] sm:text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
              <button
                aria-label={`Edit ${event.title}`}
                onClick={() =>
                  window.open(`/dashboard/events/${event.id}/edit`, "_blank")
                }
                className="flex cursor-pointer items-center gap-1 px-2 py-0.5 text-[11px] sm:text-xs text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Ticket Types */}
        {event.ticketTypes.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-900 mb-1">
              Ticket Types
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {event.ticketTypes.map((ticketType) => (
                <div key={ticketType.id} className="bg-gray-50 rounded p-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-xs text-gray-900">
                        {ticketType.name}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        {formatCurrency(ticketType.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-gray-600">
                        {getQuantityDisplay(
                          ticketType.quantity,
                          ticketType.sold
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {getAvailability(ticketType.quantity, ticketType.sold)}
                      </p>
                      {ticketType.quantity !== null && (
                        <div className="w-10 bg-gray-200 rounded-full h-1 mt-0.5">
                          <div
                            className="bg-blue-600 h-1 rounded-full"
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
