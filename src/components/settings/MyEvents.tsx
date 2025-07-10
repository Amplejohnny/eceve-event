"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Share2, Download, UserPlus, X, QrCode } from "lucide-react";

interface Booking {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  ticketPrice?: number;
  convenienceFee?: number;
  status: "upcoming" | "completed" | "cancelled";
  organizer?: string;
  eventImage?: string;
}

export default function MyEvents() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date">("date");
  const [tab, setTab] = useState<"myBookings" | "myEvents">("myBookings");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/my-events");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings
    .filter((event) => filterStatus === "all" || event.status === filterStatus)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleShare = async (event: Booking) => {
    const shareData = {
      title: event.name,
      text: `Check out this event: ${event.name}`,
      url: `${window.location.origin}/event/${event.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(shareData.url);
        alert("Event link copied to clipboard!");
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  const handleDownloadPDF = (bookingId: string) => {
    // Create a download link for the PDF
    const link = document.createElement("a");
    link.href = `/api/bookings/${bookingId}/pdf`;
    link.download = `booking-${bookingId}.pdf`;
    link.click();
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      try {
        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
          method: "POST",
        });

        if (response.ok) {
          // Refresh the bookings list
          fetchEvents();
        } else {
          alert("Failed to cancel booking");
        }
      } catch (err) {
        alert("Error canceling booking");
      }
    }
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
    <div className="min-h-screen bg-pink-50">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setTab("myBookings")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "myBookings"
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Bookings
            </button>
            <button
              onClick={() => setTab("myEvents")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === "myEvents"
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Events
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <select
              title="Filter by Status"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="date">Sort by Date</option>
            </select>
          </div>
        </div>

        {/* Events Grid */}
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {tab === "myBookings" ? "No bookings found" : "No events found"}
              </p>
            </div>
          ) : (
            filtered.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Event Image */}
                    <div className="w-full lg:w-24 h-48 lg:h-24 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                      {event.eventImage ? (
                        <img
                          src={event.eventImage}
                          alt={event.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
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
                            {event.name}
                          </h2>
                          <p className="text-gray-600 mb-2">
                            {format(new Date(event.date), "MMM dd, yyyy")} —{" "}
                            {event.time}
                          </p>
                          <p className="text-sm text-gray-500 mb-3">
                            📍 {event.location}
                          </p>

                          {tab === "myBookings" && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                Ticket Price: ${event.ticketPrice}
                              </p>
                              {event.convenienceFee && (
                                <p className="text-sm text-gray-600">
                                  Convenience Fee: ${event.convenienceFee}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Booking ID: {event.id}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            event.status
                          )}`}
                        >
                          {event.status.charAt(0).toUpperCase() +
                            event.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-shrink-0">
                      {tab === "myBookings" ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadPDF(event.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <QrCode className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors">
                              <UserPlus className="w-4 h-4" />
                              Follow Organizer
                            </button>
                            <button
                              onClick={() => handleCancelBooking(event.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel Booking
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleShare(event)}
                            className="flex items-center gap-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                          >
                            <Share2 className="w-4 h-4" />
                            Share
                          </button>
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <QrCode className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
