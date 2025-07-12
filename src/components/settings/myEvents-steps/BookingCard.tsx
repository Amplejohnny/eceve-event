import { Calendar, Download, MapPin, QrCode, Share2 } from "lucide-react";
import {
  formatDate,
  formatCurrency,
  getEventImageUrl,
  getEventShareUrl,
  getErrorMessage,
  truncateText,
  getRelativeTime,
} from "@/lib/utils";

interface Ticket {
  id: string;
  eventId: string;
  ticketType: {
    id: string;
    name: string;
    currentPrice: number;
  };
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  confirmationId: string;
  qrCode?: string;
  notes?: string;
  status: "ACTIVE" | "CANCELLED" | "USED" | "REFUNDED";
  displayStatus: string;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    venue?: string;
    imageUrl?: string;
    status: string;
    slug: string;
  };
  payment: {
    id: string;
    paystackRef: string;
    status: string;
    paidAt: string | null;
  } | null;
}

interface BookingCardProps {
  ticket: Ticket;
}

const getStatusColor = (status: string) => {
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

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "success":
    case "paid":
      return "text-green-600 bg-green-50";
    case "pending":
      return "text-yellow-600 bg-yellow-50";
    case "failed":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

const handleShare = async (ticket: Ticket) => {
  const shareData = {
    title: ticket.event.title,
    text: `Check out this event: ${ticket.event.title}`,
    url: getEventShareUrl(ticket.event.slug),
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

const handleDownloadPDF = (ticketId: string) => {
  const link = document.createElement("a");
  link.href = `/api/tickets/${ticketId}/pdf`;
  link.download = `ticket-${ticketId}.pdf`;
  link.click();
};

export default function BookingCard({ ticket }: BookingCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="w-full lg:w-24 h-48 lg:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            <img
              src={getEventImageUrl(ticket.event.imageUrl)}
              alt={ticket.event.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h2
                  className="font-semibold text-lg sm:text-xl text-gray-900 mb-2"
                  title={ticket.event.title}
                >
                  {truncateText(ticket.event.title, 60)}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(ticket.event.date, "MMM dd, yyyy")}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {ticket.event.venue || ticket.event.location}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">
                      {ticket.ticketType.name}
                    </span>
                    <p className="text-gray-600">
                      {formatCurrency(ticket.price)} × {ticket.quantity}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Total: {formatCurrency(ticket.price * ticket.quantity)}
                    </span>
                    <p className="text-gray-600">
                      Booked {getRelativeTime(ticket.createdAt)}
                    </p>
                  </div>
                </div>
                {ticket.payment && (
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(
                        ticket.payment.status
                      )}`}
                    >
                      Payment: {ticket.payment.status}
                    </span>
                  </div>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  ticket.displayStatus
                )}`}
              >
                {ticket.displayStatus.charAt(0).toUpperCase() +
                  ticket.displayStatus.slice(1)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                aria-label={`Download PDF for ${ticket.event.title}`}
                onClick={() => handleDownloadPDF(ticket.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
              <button
                aria-label={`Share ${ticket.event.title}`}
                onClick={() => handleShare(ticket)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {ticket.qrCode && (
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
