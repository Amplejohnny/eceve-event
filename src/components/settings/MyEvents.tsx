"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Share2,
  Download,
  QrCode,
  Calendar,
  MapPin,
  Users,
  Eye,
  Edit,
} from "lucide-react";

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
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
  ticketTypes: TicketType[];
  totalTicketsSold: number;
  createdAt: string;
  updatedAt: string;
}

interface Payment {
  id: string;
  paystackRef: string;
  status: string;
  paidAt: string | null;
}

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
  payment: Payment | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: {
    tickets?: T[];
    events?: T[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export default function MyEvents() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date">("date");
  const [tab, setTab] = useState<"myBookings" | "myEvents">("myBookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  // Show loading while session is loading
  if (status === "loading") {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  //to satisfy TypeScript, we need to check if session is defined
  if (!session?.user) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="font-medium mb-2">Authentication Required</h3>
          <p>Please log in to view your events and bookings.</p>
        </div>
      </div>
    );
  }

  const userRole = session.user.role as
    | "VISITOR"
    | "USER"
    | "ORGANIZER"
    | "ADMIN";

  useEffect(() => {
    if (tab === "myBookings") {
      fetchMyBookings();
    } else if (tab === "myEvents") {
      fetchMyEvents();
    }
  }, [tab, filterStatus]);

  useEffect(() => {
    if (tab === "myBookings") {
      fetchMyBookings();
    } else if (tab === "myEvents") {
      fetchMyEvents();
    }
  }, [tab, filterStatus, pagination.offset]);

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/my-bookings", window.location.origin);
      if (filterStatus !== "all") {
        url.searchParams.set("status", filterStatus);
      }
      url.searchParams.set("limit", pagination.limit.toString());
      url.searchParams.set("offset", pagination.offset.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: ApiResponse<Ticket> = await response.json();

      if (data.success) {
        setTickets(data.data.tickets || []);
        setPagination(data.data.pagination);
      } else {
        throw new Error("Failed to fetch bookings");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/my-events", window.location.origin);
      if (filterStatus !== "all") {
        url.searchParams.set("status", filterStatus);
      }
      url.searchParams.set("limit", pagination.limit.toString());
      url.searchParams.set("offset", pagination.offset.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: ApiResponse<Event> = await response.json();

      if (data.success) {
        setEvents(data.data.events || []);
        setPagination(data.data.pagination);
      } else {
        throw new Error("Failed to fetch events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const getBookingStatusForDisplay = (ticket: Ticket) => {
    const eventDate = new Date(ticket.event.date);
    const now = new Date();

    if (ticket.status === "CANCELLED") return "cancelled";
    if (ticket.status === "REFUNDED") return "refunded";
    if (ticket.status === "USED") return "completed";
    if (eventDate < now) return "completed";
    return "upcoming";
  };

  const getEventStatusForDisplay = (event: Event) => {
    const eventDate = new Date(event.date);
    const now = new Date();

    if (event.status === "CANCELLED") return "cancelled";
    if (event.status === "COMPLETED") return "completed";
    if (event.status === "SUSPENDED") return "suspended";
    if (event.status === "DRAFT") return "draft";
    if (eventDate < now) return "completed";
    return "active";
  };

  const filteredBookings = tickets
    .filter((ticket) => {
      const displayStatus = getBookingStatusForDisplay(ticket);
      return filterStatus === "all" || displayStatus === filterStatus;
    })
    .sort(
      (a, b) =>
        new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
    );

  const filteredEvents = events
    .filter((event) => {
      const displayStatus = getEventStatusForDisplay(event);
      return filterStatus === "all" || displayStatus === filterStatus;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleShare = async (item: Event | Ticket) => {
    const isEvent = "title" in item;
    const title = isEvent ? item.title : item.event.title;
    const slug = isEvent ? item.slug : item.event.slug;

    const shareData = {
      title: title,
      text: `Check out this event: ${title}`,
      url: `${window.location.origin}/event/${slug}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Event link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleDownloadPDF = (ticketId: string) => {
    const link = document.createElement("a");
    link.href = `/api/tickets/${ticketId}/pdf`;
    link.download = `ticket-${ticketId}.pdf`;
    link.click();
  };

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

  const formatPrice = (priceInKobo: number) => {
    return (priceInKobo / 100).toFixed(2);
  };

  const calculateRevenue = (event: Event) => {
    return event.ticketTypes.reduce((total, ticketType) => {
      return total + ticketType.sold * ticketType.price;
    }, 0);
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

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <h3 className="font-medium mb-2">Error loading data</h3>
          <p>{error}</p>
          <button
            onClick={() =>
              tab === "myBookings" ? fetchMyBookings() : fetchMyEvents()
            }
            className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">History</h1>
            <p className="text-gray-600 mt-1">
              {tab === "myBookings"
                ? "Manage your event bookings and tickets"
                : "Manage your events and track performance"}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Account: {userRole.toLowerCase().replace("_", " ")}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setTab("myBookings")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "myBookings"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Bookings
            </button>
            {(userRole === "ORGANIZER" || userRole === "ADMIN") && (
              <button
                onClick={() => setTab("myEvents")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === "myEvents"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Events
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            <select
              title="Filter by Status"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              {tab === "myBookings" && (
                <option value="refunded">Refunded</option>
              )}
              {tab === "myEvents" && (
                <>
                  <option value="draft">Draft</option>
                  <option value="suspended">Suspended</option>
                </>
              )}
            </select>
            <select
              title="Sort by Date"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Sort by Date</option>
            </select>
          </div>

          {/* Pagination Info */}
          <div className="flex items-center text-sm text-gray-600">
            Showing {pagination.offset + 1} -{" "}
            {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
            of {pagination.total} results
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tab === "myBookings" ? (
            // My Bookings Content
            filteredBookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No bookings found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Book your first event to get started"}
                </p>
              </div>
            ) : (
              filteredBookings.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Event Image */}
                      <div className="w-full lg:w-24 h-48 lg:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {ticket.event.imageUrl ? (
                          <img
                            src={ticket.event.imageUrl}
                            alt={ticket.event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-blue-300" />
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h2 className="font-semibold text-lg sm:text-xl text-gray-900 mb-2">
                              {ticket.event.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(
                                  new Date(ticket.event.date),
                                  "MMM dd, yyyy"
                                )}
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
                                  ₦{formatPrice(ticket.price)} ×{" "}
                                  {ticket.quantity}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium text-gray-900">
                                  Total: ₦
                                  {formatPrice(ticket.price * ticket.quantity)}
                                </span>
                                <p className="text-gray-600">
                                  ID: {ticket.confirmationId}
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

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              getBookingStatusForDisplay(ticket)
                            )}`}
                          >
                            {getBookingStatusForDisplay(ticket)
                              .charAt(0)
                              .toUpperCase() +
                              getBookingStatusForDisplay(ticket).slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(ticket.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            PDF
                          </button>
                          <button
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
              ))
            )
          ) : // My Events Content (Only for Organizers)
          userRole === "ORGANIZER" || userRole === "ADMIN" ? (
            filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No events found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {filterStatus !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first event to get started"}
                </p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Event Image */}
                      <div className="w-full lg:w-24 h-48 lg:h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-blue-300" />
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h2 className="font-semibold text-lg sm:text-xl text-gray-900 mb-2">
                              {event.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(event.date), "MMM dd, yyyy")}
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
                                  Revenue: ₦
                                  {formatPrice(calculateRevenue(event))}
                                </span>
                                <p className="text-gray-600">
                                  Created:{" "}
                                  {format(
                                    new Date(event.createdAt),
                                    "MMM dd, yyyy"
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              getEventStatusForDisplay(event)
                            )}`}
                          >
                            {getEventStatusForDisplay(event)
                              .charAt(0)
                              .toUpperCase() +
                              getEventStatusForDisplay(event).slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              window.open(`/event/${event.slug}`, "_blank")
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          <button
                            onClick={() => handleShare(event)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                `/dashboard/events/${event.id}/edit`,
                                "_blank"
                              )
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Types Summary */}
                    {event.ticketTypes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Ticket Types
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {event.ticketTypes.map((ticketType) => (
                            <div
                              key={ticketType.id}
                              className="bg-gray-50 rounded-lg p-3"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">
                                    {ticketType.name}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    ₦{formatPrice(ticketType.price)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-600">
                                    {ticketType.sold}/{ticketType.quantity}
                                  </p>
                                  <div className="w-12 bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full"
                                      style={{
                                        width: `${
                                          (ticketType.sold /
                                            ticketType.quantity) *
                                          100
                                        }%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Access Restricted</p>
              <p className="text-gray-400 text-sm mt-2">
                Only organizers can view this section
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                const newOffset = Math.max(
                  0,
                  pagination.offset - pagination.limit
                );
                setPagination((prev) => ({ ...prev, offset: newOffset }));
              }}
              disabled={pagination.offset === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {Math.floor(pagination.offset / pagination.limit) + 1} of{" "}
              {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => {
                const newOffset = pagination.offset + pagination.limit;
                setPagination((prev) => ({ ...prev, offset: newOffset }));
              }}
              disabled={!pagination.hasMore}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
