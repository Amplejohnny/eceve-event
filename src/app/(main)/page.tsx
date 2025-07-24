"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Star,
  Calendar,
  Clock,
  User,
  MapPinIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEventStore } from "@/store/eventStore";

interface EventData {
  id: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime?: string;
  location: string;
  imageUrl?: string;
  eventType: "FREE" | "PAID";
  slug: string;
  organizer?: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
  createdAt: string;
}

interface EventCardProps {
  event: EventData;
  onFavoriteToggle?: (eventId: string) => void;
  isFavorite?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onFavoriteToggle,
  isFavorite = false,
}) => {
  const router = useRouter();
  const [localFavorite, setLocalFavorite] = useState(isFavorite);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalFavorite(!localFavorite);
    onFavoriteToggle?.(event.id);
  };

  const handleCardClick = () => {
    router.push(`/events/${event.slug}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      .toUpperCase();
  };

  const getLowestPrice = () => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return null;
    if (event.eventType === "FREE") return 0;

    const prices = event.ticketTypes
      .map((ticket) => ticket.price)
      .filter((price) => price > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const lowestPrice = getLowestPrice();

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="h-48 relative overflow-hidden">
        <Image
          src={event.imageUrl || "/api/placeholder/300/200"}
          alt={event.title}
          fill
          className="object-cover"
        />
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
          title={localFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-label={
            localFavorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          <Star
            size={16}
            className={
              localFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-400"
            }
          />
        </button>
      </div>

      <div className="p-4">
        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full inline-block mb-2">
          {event.category}
        </div>

        <div className="flex items-center text-blue-600 text-sm font-semibold mb-2">
          <Calendar size={14} className="mr-1" />
          {formatDate(event.date)}
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {event.title}
        </h3>

        <div className="flex items-center text-gray-600 text-sm mb-2">
          <Clock size={14} className="mr-1" />
          {event.endTime
            ? `${event.startTime} - ${event.endTime}`
            : event.startTime}
        </div>

        <div className="flex items-center text-gray-600 text-sm mb-2">
          <MapPinIcon size={14} className="mr-1" />
          <span className="truncate">{event.location}</span>
        </div>

        {event.organizer && (
          <div className="flex items-center text-gray-600 text-sm mb-2">
            <User size={14} className="mr-1" />
            <span className="truncate">{event.organizer.name}</span>
          </div>
        )}

        {lowestPrice !== null && (
          <div className="flex items-center text-green-600 font-semibold">
            {lowestPrice === 0
              ? "Free"
              : `₦${(lowestPrice / 100).toLocaleString()}`}
          </div>
        )}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("Lagos");
  const [email, setEmail] = useState("");
  const [showMorePopular, setShowMorePopular] = useState(false);
  const [showMoreUpcoming, setShowMoreUpcoming] = useState(false);
  const [showMoreTrendy, setShowMoreTrendy] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { allEvents, eventsLoading, loadEvents } = useEventStore();

  // Event state
  const [popularEvents, setPopularEvents] = useState<EventData[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventData[]>([]);
  const [trendyEvents, setTrendyEvents] = useState<EventData[]>([]);
  const [locationPermission, setLocationPermission] = useState<string | null>(
    null
  );

  const categories = [
    { icon: "🎵", label: "Entertainment" },
    { icon: "🎓", label: "Educational & Business" },
    { icon: "🎨", label: "Cultural & Arts" },
    { icon: "⚽", label: "Sports & Fitness" },
    { icon: "💻", label: "Technology & Innovation" },
    { icon: "✈️", label: "Travel & Adventure" },
  ];

  const filters = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "tomorrow", label: "Tomorrow" },
    { key: "weekend", label: "This Weekend" },
    { key: "free", label: "Free" },
    { key: "paid", label: "Paid" },
  ];

  // Nigerian major cities for trendy events
  const majorNigerianCities = [
    "Lagos",
    "Abuja",
    "Kano",
    "Rivers",
    "Port Harcourt",
    "Ibadan",
    "Oyo",
    "Ogun",
  ];

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            }
          );

          // Use reverse geocoding to get city name (you might want to implement this)
          // For now, we'll use a default based on coordinates
          const { latitude, longitude } = position.coords;

          // You can integrate with a geocoding service here
          // For now, we'll keep Lagos as default
          setUserLocation("Lagos");
          setLocationPermission("granted");
        } catch (error) {
          console.error("Error getting location:", error);
          setLocationPermission("denied");
          setUserLocation("Lagos");
        }
      } else {
        setLocationPermission("unsupported");
        setUserLocation("Lagos");
      }
    };

    getUserLocation();
  }, []);

  // First useEffect: Load events from the store
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        await loadEvents({
          status: "ACTIVE",
          limit: 50,
        });
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    fetchEvents();
  }, [loadEvents]);

  // Process and filter events when allEvents or activeFilter changes
  useEffect(() => {
    if (allEvents.length > 0) {
      try {
        // Filter and sort events
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Popular events (active events ordered by creation time)
        let popular = allEvents
          .filter((event) => {
            const eventDate = new Date(event.date);
            return eventDate >= today; // Only future events
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        // Apply filters
        if (activeFilter !== "all") {
          popular = popular.filter((event) => {
            const eventDate = new Date(event.date);

            switch (activeFilter) {
              case "today":
                return eventDate.toDateString() === today.toDateString();
              case "tomorrow":
                return eventDate.toDateString() === tomorrow.toDateString();
              case "weekend":
                return eventDate >= today && eventDate <= weekEnd;
              case "free":
                return event.eventType === "FREE";
              case "paid":
                return event.eventType === "PAID";
              default:
                return true;
            }
          });
        }

        // Upcoming events (events near current date/time)
        const upcoming = allEvents
          .filter((event) => {
            const eventDate = new Date(event.date);
            const timeDiff = eventDate.getTime() - now.getTime();
            const daysDiff = timeDiff / (1000 * 3600 * 24);
            return daysDiff >= 0 && daysDiff <= 30; // Events within next 30 days
          })
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        // Trendy events (events in major Nigerian cities)
        const trendy = allEvents
          .filter((event) => {
            return majorNigerianCities.some((city) =>
              event.location.toLowerCase().includes(city.toLowerCase())
            );
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        setPopularEvents(popular);
        setUpcomingEvents(upcoming);
        setTrendyEvents(trendy);
      } catch (error) {
        console.error("Error processing events:", error);
      }
    }
  }, [allEvents, activeFilter]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push(
      `/events?q=${encodeURIComponent(
        searchQuery
      )}&location=${encodeURIComponent(userLocation)}`
    );
  };

  const handleSubscribe = async () => {
    if (email.trim()) {
      try {
        // Implement newsletter subscription
        console.log("Subscribing email:", email);
        setEmail("");
        // You can add a success message here
      } catch (error) {
        console.error("Error subscribing:", error);
      }
    }
  };

  const handleFavoriteToggle = async (eventId: string) => {
    try {
      // Implement favorite toggle API call
      await fetch(`/api/events/${eventId}/favorite`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleCategoryClick = (category: string) => {
    router.push(`/events?category=${encodeURIComponent(category)}`);
  };

  const handleCreateEvent = () => {
    router.push("/events/create");
  };

  // Determine how many events to show
  const getDisplayCount = (showMore: boolean) => {
    return isMobile ? (showMore ? Infinity : 3) : showMore ? Infinity : 6;
  };

  const displayedPopularEvents = popularEvents.slice(
    0,
    getDisplayCount(showMorePopular)
  );
  const displayedUpcomingEvents = upcomingEvents.slice(
    0,
    getDisplayCount(showMoreUpcoming)
  );
  const displayedTrendyEvents = trendyEvents.slice(
    0,
    getDisplayCount(showMoreTrendy)
  );

  // Handle loading state from the store
  if (isInitialLoading || eventsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/homepageHero.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0"></div>

        {/* Content */}
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Don't miss out!
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Explore the vibrant events happening locally and globally.
          </p>

          {/* Search form - visible only on md+ screens */}
          <div className="hidden md:block max-w-2xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl p-2 shadow-lg flex flex-col md:flex-row gap-2"
              role="search"
              aria-label="Search for events"
            >
              {/* Search input */}
              <div className="flex-1 relative">
                <label htmlFor="searchQuery" className="sr-only">
                  Search events
                </label>
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  id="searchQuery"
                  type="text"
                  placeholder="Search events, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="off"
                />
              </div>

              {/* Location input */}
              <div className="relative w-full md:w-auto">
                <label htmlFor="location" className="sr-only">
                  Location
                </label>
                <MapPin
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  id="location"
                  type="text"
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  className="pl-10 pr-4 py-3 text-gray-900 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter location"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold"
              >
                Search
              </button>
            </form>
          </div>

          {/* Mobile CTA */}
          <div className="md:hidden mt-6">
            <button
              onClick={() => router.push("/events")}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold"
            >
              Explore Events
            </button>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Explore Categories
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category, index) => (
            <div
              key={index}
              onClick={() => handleCategoryClick(category.label)}
              className="bg-white rounded-lg p-6 text-center shadow-md hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                {category.icon}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 leading-tight">
                {category.label}
              </h3>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Events */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Popular Events
          </h2>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeFilter === filter.key
                    ? "bg-purple-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {displayedPopularEvents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {displayedPopularEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>

            {!showMorePopular &&
              popularEvents.length > getDisplayCount(false) && (
                <div className="text-center">
                  <button
                    onClick={() => setShowMorePopular(true)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    See More
                  </button>
                </div>
              )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">
              No events found matching your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Upcoming Events
          </h2>

          {displayedUpcomingEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {displayedUpcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {!showMoreUpcoming &&
                upcomingEvents.length > getDisplayCount(false) && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowMoreUpcoming(true)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      See More
                    </button>
                  </div>
                )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No upcoming events found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Event Section */}
      <div
        className="relative text-[#ffe047] py-6 overflow-hidden mb-5"
        style={{
          backgroundImage: "url('/create-event-background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col sm:flex-row items-center justify-between md:justify-end gap-4 md:gap-6 max-w-6xl mx-auto">
            {/* Text Content */}
            <div className="px-2 sm:px-20">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">
                Create an event with Conforeve
              </h2>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg opacity-90 leading-relaxed">
                Got a show, event, activity? Create your event with Conforeve to
                reach a wider audience.
              </p>
            </div>

            {/* Create Event Button */}
            <div className="flex-shrink-0">
              <button
                onClick={handleCreateEvent}
                className="cursor-pointer bg-[#ffe047] text-black px-4 py-2 sm:px-6 sm:py-3 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors text-xs sm:text-sm md:text-base whitespace-nowrap flex items-center gap-1 md:gap-2"
              >
                <Calendar size={16} />
                Create Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trendy Events Near You */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Trendy Events Near You
          </h2>

          {displayedTrendyEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {displayedTrendyEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {!showMoreTrendy &&
                trendyEvents.length > getDisplayCount(false) && (
                  <div className="text-center">
                    <button
                      onClick={() => setShowMoreTrendy(true)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      See More
                    </button>
                  </div>
                )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No trendy events found in major cities.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-[#FFE047] py-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Text Section - 2/3 */}
            <div className="md:w-2/3">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Subscribe to our Newsletter
              </h3>
              <p className="text-gray-800 text-sm">
                Receive our weekly newsletter & updates with new events from
                your favourite organisers & venues.
              </p>
            </div>

            {/* Form Section - 1/3 */}
            <div className="md:w-1/3 w-full">
              <div className="flex flex-nowrap items-stretch gap-0">
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-3 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white min-w-0"
                />
                <button
                  onClick={handleSubscribe}
                  className="bg-gray-900 text-white px-4 py-3 rounded-r-md hover:bg-gray-800 transition-colors font-medium whitespace-nowrap min-w-[100px] flex-shrink-0"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
