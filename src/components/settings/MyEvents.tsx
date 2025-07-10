// pages/my-events.tsx
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { format } from "date-fns";

interface Booking {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  ticketPrice?: number;
  convenienceFee?: number;
  status: string;
}

export default function MyEvents() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date">("date");
  const [tab, setTab] = useState<"myBookings" | "myEvents">("myBookings");

  useEffect(() => {
    axios.get("/api/events").then((res) => setBookings(res.data.bookings));
  }, []);

  const filtered = bookings
    .filter((event) => filterStatus === "all" || event.status === filterStatus)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="space-x-4">
          <button
            onClick={() => setTab("myBookings")}
            className={`pb-1 border-b-2 ${
              tab === "myBookings" ? "border-black" : "border-transparent"
            }`}
          >
            My Bookings
          </button>
          <button
            onClick={() => setTab("myEvents")}
            className={`pb-1 border-b-2 ${
              tab === "myEvents" ? "border-black" : "border-transparent"
            }`}
          >
            My Events
          </button>
        </div>
        <div className="flex space-x-4">
          <select
            className="border p-1 text-sm"
            value={filterStatus}
            title="filter-status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="border p-1 text-sm"
            value={sortBy}
            title="sort-by"
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="date">Sort by Date</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((event) => (
          <div
            key={event.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white shadow-md rounded-lg p-4"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-md" />
              <div>
                <h2 className="font-semibold text-lg">{event.name}</h2>
                <p>
                  {event.date} — {event.time}
                </p>
                <p className="text-sm text-gray-600">{event.location}</p>
                {tab === "myBookings" && (
                  <>
                    <p className="font-medium">
                      Ticket Price: ${event.ticketPrice}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 sm:mt-0 text-right space-y-2">
              {tab === "myBookings" ? (
                <>
                  <div className="text-xs text-gray-600">
                    Booking ID: {event.id}
                  </div>
                  <button className="text-sm text-blue-600 underline">
                    Download PDF
                  </button>
                  <div className="space-x-2 text-sm">
                    <button className="text-blue-500">Follow Organizer</button>
                    <button className="text-red-500">Cancel Booking</button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      navigator.share?.({
                        title: event.name,
                        text: `Check out this event: ${event.name}`,
                        url: window.location.href,
                      })
                    }
                    className="px-4 py-1 border rounded text-sm"
                  >
                    Share
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
