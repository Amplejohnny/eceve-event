"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/settings/myEvents-steps/Header";
import FilterBar from "@/components/settings/myEvents-steps/FilterBar";
import BookingCard from "@/components/settings/myEvents-steps/BookingCard";
import EventCard from "@/components/settings/myEvents-steps/EventCard";
import PaginationControls from "@/components/settings/myEvents-steps/PaginationControls";
import { Calendar, Users } from "lucide-react";
import Link from "next/link";

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

  if (!session?.user) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center px-4 py-4 md:py-25">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 text-center">
            {/* Lock Icon */}
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Authentication Required
            </h2>

            {/* Message */}
            <p className="text-gray-600 mb-5 leading-relaxed text-sm">
              You need to be logged in to create an event. Please sign in to
              your account to continue.
            </p>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <Link href="/auth/login">Sign In</Link>
              </button>
              <button className="w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
                <Link href="/">Back to Home</Link>
              </button>
            </div>

            {/* Additional Help */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
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
    const fetchData = async () => {
      const newPagination = { ...pagination, offset: 0 };
      setPagination(newPagination);

      if (tab === "myBookings") {
        await fetchMyBookings(newPagination);
      } else if (tab === "myEvents") {
        await fetchMyEvents(newPagination);
      }
    };

    // Debounce the fetch operation
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 300);

    // Cleanup function to cancel the timeout if dependencies change
    return () => {
      clearTimeout(timeoutId);
    };
  }, [tab, filterStatus]);

  useEffect(() => {
    if (pagination.offset > 0) {
      if (tab === "myBookings") {
        fetchMyBookings(pagination);
      } else if (tab === "myEvents") {
        fetchMyEvents(pagination);
      }
    }
  }, [pagination.offset]);

  const fetchMyBookings = async (paginationData = pagination) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/my-bookings", window.location.origin);
      if (filterStatus !== "all") {
        url.searchParams.set("status", filterStatus);
      }
      url.searchParams.set("limit", paginationData.limit.toString());
      url.searchParams.set("offset", paginationData.offset.toString());

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

  const fetchMyEvents = async (paginationData = pagination) => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL("/api/my-events", window.location.origin);
      if (filterStatus !== "all") {
        url.searchParams.set("status", filterStatus);
      }
      url.searchParams.set("limit", paginationData.limit.toString());
      url.searchParams.set("offset", paginationData.offset.toString());

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

  const sortedBookings = [...tickets].sort((a, b) => {
    if (sortBy === "date") {
      return (
        new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
      );
    }
    return 0;
  });

  const sortedEvents = [...events].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return 0;
  });

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
            onClick={() => {
              if (tab === "myBookings") {
                fetchMyBookings();
              } else {
                fetchMyEvents();
              }
            }}
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
        <Header tab={tab} setTab={setTab} userRole={userRole} />
        <FilterBar
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          tab={tab}
          pagination={pagination}
        />
        <div className="space-y-4">
          {tab === "myBookings" ? (
            sortedBookings.length === 0 ? (
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
              sortedBookings.map((ticket) => (
                <BookingCard key={ticket.id} ticket={ticket} />
              ))
            )
          ) : userRole === "ORGANIZER" || userRole === "ADMIN" ? (
            sortedEvents.length === 0 ? (
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
              sortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
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
        {pagination.total > pagination.limit && (
          <PaginationControls
            pagination={pagination}
            setPagination={setPagination}
          />
        )}
      </div>
    </div>
  );
}
