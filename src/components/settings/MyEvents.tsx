"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Header from "@/components/settings/myEvents-steps/Header";
import FilterBar from "@/components/settings/myEvents-steps/FilterBar";
import BookingCard from "@/components/settings/myEvents-steps/BookingCard";
import EventCard from "@/components/settings/myEvents-steps/EventCard";
import PaginationControls from "@/components/settings/myEvents-steps/PaginationControls";
import { Calendar, Users } from "lucide-react";

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
    const fetchData = async () => {
      const newPagination = { ...pagination, offset: 0 };
      setPagination(newPagination);

      if (tab === "myBookings") {
        await fetchMyBookings(newPagination);
      } else if (tab === "myEvents") {
        await fetchMyEvents(newPagination);
      }
    };

    fetchData();
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
