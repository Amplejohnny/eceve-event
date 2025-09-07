"use client";

import { useState, useEffect } from "react";
import {
  UsersIcon,
  TicketIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface Event {
  id: string;
  title: string;
  date: Date;
  slug: string;
  attendeeCount: number;
  totalRevenue: number;
}

interface EventAnalyticsSectionProps {
  attendeesData: any;
  onExportAttendees: (eventId?: string) => void;
  onRefresh: () => void;
}

export default function EventAnalyticsSection({
  attendeesData,
  onExportAttendees,
  onRefresh,
}: EventAnalyticsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [exportingEventId, setExportingEventId] = useState<string | null>(null);
  const [selectedEventFilter, setSelectedEventFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // Fetch organizer's events
  const fetchEvents = async () => {
    try {
      setIsLoadingEvents(true);
      const response = await fetch("/api/organizer/events");

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        toast.error("Failed to load events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const applyFilters = async (
    search: string,
    status: string,
    eventId: string
  ) => {
    try {
      setIsSearching(true);

      const params = new URLSearchParams({
        page: "1",
        limit: "50",
      });

      if (search.trim()) params.append("search", search);
      if (status) params.append("status", status);
      if (eventId) params.append("eventId", eventId);

      const response = await fetch(`/api/organizer/attendees?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (search.trim() || status || eventId) {
          setSearchResults(data);
        } else {
          setSearchResults(null);
          // Trigger refresh of main attendees data
          onRefresh();
        }
      } else {
        toast.error("Failed to filter attendees");
      }
    } catch (error) {
      console.error("Error filtering attendees:", error);
      toast.error("Failed to filter attendees");
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-600 bg-green-100";
      case "USED":
        return "text-blue-600 bg-blue-100";
      case "CANCELLED":
        return "text-red-600 bg-red-100";
      case "REFUNDED":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchTerm.trim()) {
      // If search term is empty, reset to show all attendees
      setSearchResults(null);
      return;
    }

    try {
      setIsSearching(true);

      // Build search parameters
      const params = new URLSearchParams({
        search: searchTerm,
        page: "1", // Reset to first page when searching
        limit: "50", // Show more results when searching
      });

      // Add filters if they exist
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      if (selectedEventFilter) {
        params.append("eventId", selectedEventFilter);
      }

      const response = await fetch(`/api/organizer/attendees?${params}`);

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        toast.success(
          `Found ${data.attendees.length} attendees matching "${searchTerm}"`
        );
      } else {
        toast.error("Failed to search attendees");
      }
    } catch (error) {
      console.error("Error searching attendees:", error);
      toast.error("Failed to search attendees");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults(null);
    setStatusFilter("");
    setSelectedEventFilter("");
    onRefresh();
  };

  const handleStatusFilter = async (status: string) => {
    setStatusFilter(status);

    // If there's an active search, re-run the search with the new status filter
    if (searchResults) {
      await applyFilters(searchTerm, status, selectedEventFilter);
    } else {
      // If no search is active, fetch filtered data from API
      await applyFilters("", status, selectedEventFilter);
    }
  };

  const handleEventFilter = async (eventId: string) => {
    setSelectedEventFilter(eventId);

    // If there's an active search, re-run the search with the new event filter
    if (searchResults) {
      await applyFilters(searchTerm, statusFilter, eventId);
    } else {
      // If no search is active, fetch filtered data from API
      await applyFilters("", statusFilter, eventId);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    await fetchEvents(); // Also refresh events list
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExportEvent = async (eventId: string) => {
    try {
      setExportingEventId(eventId);
      onExportAttendees(eventId);
    } catch (error) {
      console.error("Error exporting event:", error);
    } finally {
      setExportingEventId(null);
    }
  };

  const handleExportAll = () => {
    onExportAttendees();
  };

  // Filter attendees by selected event
  const displayedAttendees = searchResults
    ? searchResults.attendees
    : attendeesData?.attendees;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Event Analytics
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportAll}
            className="flex cursor-pointer items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export All CSV
          </button>
        </div>
      </div>

      {/* Events Quick Export Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Attendee Management
              </h3>
              {(searchResults || statusFilter || selectedEventFilter) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  {searchTerm && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Search: "{searchTerm}"
                    </span>
                  )}
                  {statusFilter && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Status: {statusFilter}
                    </span>
                  )}
                  {selectedEventFilter && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Event:{" "}
                      {events.find((e) => e.id === selectedEventFilter)?.title}
                    </span>
                  )}
                  <button
                    onClick={clearSearch}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoadingEvents ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">
              No events found. Create your first event to see analytics.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {event.title}
                    </h4>
                    <div className="mt-1 text-sm text-gray-500">
                      <div>
                        {new Date(event.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span>{event.attendeeCount} attendees</span>
                        <span>•</span>
                        <span>₦{event.totalRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExportEvent(event.id)}
                    disabled={exportingEventId === event.id}
                    className="ml-3 cursor-pointer px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    {exportingEventId === event.id ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="opacity-25"
                          ></circle>
                          <path
                            fill="currentColor"
                            className="opacity-75"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Exporting...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-3 w-3" />
                        <span>Export</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Attendees */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Attendees
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {attendeesData?.summary?.total || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Tickets Sold */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TicketIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-gray-900">
                {attendeesData?.attendees?.reduce(
                  (sum: number, attendee: any) => sum + attendee.quantity,
                  0
                ) || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  attendeesData?.attendees?.reduce(
                    (sum: number, attendee: any) =>
                      sum + attendee.price * attendee.quantity,
                    0
                  ) || 0
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex gap-x-0.5">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or confirmation ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 rounded-md cursor-pointer py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 flex items-center space-x-1"
              >
                {isSearching ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>
                      <path
                        fill="currentColor"
                        className="opacity-75"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Searching...</span>
                  </>
                ) : (
                  <span>Search</span>
                )}
              </button>
              {searchResults && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-3 py-2 cursor-pointer text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-r-md transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          <div className="flex items-center space-x-3">
            <select
              value={selectedEventFilter}
              onChange={(e) => handleEventFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by event"
            >
              <option value="">All Events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="USED">Used</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex cursor-pointer items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Attendee Management
            </h3>
            {searchResults && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Showing search results for "{searchTerm}"
                </span>
                <button
                  onClick={clearSearch}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Show all attendees
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedAttendees?.length > 0 ? (
                displayedAttendees.map((attendee: any) => (
                  <tr key={attendee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {attendee.attendeeName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attendee.attendeeEmail}
                        </div>
                        <div className="text-xs text-gray-400">
                          {attendee.confirmationId}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {attendee.event.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(attendee.event.date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendee.ticketType.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {attendee.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(attendee.price * attendee.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          attendee.status
                        )}`}
                      >
                        {attendee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(attendee.purchaseDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No attendees found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {attendeesData?.pagination &&
          attendeesData.pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  {(attendeesData.pagination.page - 1) *
                    attendeesData.pagination.limit +
                    1}{" "}
                  to{" "}
                  {Math.min(
                    attendeesData.pagination.page *
                      attendeesData.pagination.limit,
                    attendeesData.pagination.total
                  )}{" "}
                  of {attendeesData.pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {attendeesData.pagination.totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(
                          attendeesData.pagination.totalPages,
                          currentPage + 1
                        )
                      )
                    }
                    disabled={
                      currentPage === attendeesData.pagination.totalPages
                    }
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
