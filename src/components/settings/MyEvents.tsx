"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Share2, Download, QrCode } from "lucide-react";

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  venue?: string;
  imageUrl?: string;
  status: "DRAFT" | "ACTIVE" | "CANCELLED" | "COMPLETED" | "SUSPENDED";
  ticketTypes: any[];
  slug: string;
}

interface Ticket {
  id: string;
  eventId: string;
  ticketType: string;
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  confirmationId: string;
  status: "ACTIVE" | "CANCELLED" | "USED" | "REFUNDED";
  createdAt: string;
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    venue?: string;
    imageUrl?: string;
    status: string;
  };
}

interface User {
  id: string;
  role: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
}

export default function MyEvents() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date">("date");
  const [tab, setTab] = useState<"myBookings" | "myEvents">("myBookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (tab === "myBookings") {
      fetchMyBookings();
    } else if (tab === "myEvents" && user?.role === "ORGANIZER") {
      fetchMyEvents();
    }
  }, [tab, user]);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/my-bookings");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/my-events");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEvents(data.events || []);
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
    if (ticket.status === "USED") return "completed";
    if (eventDate < now) return "completed";
    return "upcoming";
  };

  const getEventStatusForDisplay = (event: Event) => {
    const eventDate = new Date(event.date);
    const now = new Date();

    if (event.status === "CANCELLED") return "cancelled";
    if (event.status === "COMPLETED") return "completed";
    if (eventDate < now) return "completed";
    return "upcoming";
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
    const id = isEvent ? item.id : item.event.id;
    const slug = isEvent ? item.slug : item.event.id;

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
        return "text-green-600 bg-green-50";
      case "completed":
        return "text-blue-600 bg-blue-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatPrice = (priceInKobo: number) => {
    return (priceInKobo / 100).toFixed(2);
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
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => setTab("myBookings")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "myBookings"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Bookings
            </button>
            {user?.role === "ORGANIZER" && (
              <button
                onClick={() => setTab("myEvents")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === "myEvents"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                My Events
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <select
              title="Filter by Status"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
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
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tab === "myBookings" ? (
            // My Bookings Content
            filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No bookings found</p>
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
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h2 className="font-semibold text-lg sm:text-xl text-gray-900 mb-1">
                              {ticket.event.title}
                            </h2>
                            <p className="text-gray-600 mb-2">
                              {format(
                                new Date(ticket.event.date),
                                "MMM dd, yyyy"
                              )}
                            </p>
                            <p className="text-sm text-gray-500 mb-3">
                              📍 {ticket.event.venue || ticket.event.location}
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {ticket.ticketType} - ₦
                                {formatPrice(ticket.price)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Booking ID: {ticket.confirmationId}
                              </p>
                              <p className="text-xs text-gray-500">
                                Quantity: {ticket.quantity}
                              </p>
                            </div>
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
                            Download PDF
                          </button>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : // My Events Content (Only for Organizers)
          user?.role === "ORGANIZER" ? (
            filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No events found</p>
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
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">
                              No Image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h2 className="font-semibold text-lg sm:text-xl text-gray-900 mb-1">
                              {event.title}
                            </h2>
                            <p className="text-gray-600 mb-2">
                              {format(new Date(event.date), "MMM dd, yyyy")}
                            </p>
                            <p className="text-sm text-gray-500 mb-3">
                              📍 {event.venue || event.location}
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                {event.ticketTypes.length} ticket type(s)
                              </p>
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
                            onClick={() => handleShare(event)}
                            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Only organizers can view this section
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
