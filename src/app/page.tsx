"use client";

import React, { useState } from "react";
import { Search, MapPin, Star, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import Router from "next/router";

interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  startTime: string;
  endTime?: string;
  price?: number;
  image: string;
  location?: string;
  isOnline?: boolean;
}

const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  const [isFavorite, setIsFavorite] = useState(false);


  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="h-48 relative overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          className="object-cover"
        />
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors z-10"
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            size={16}
            className={
              isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
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
          {event.date}
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

        {event.price && (
          <div className="flex items-center text-green-600 font-semibold">
            ₦{event.price}
          </div>
        )}
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("Lagos");
  const [email, setEmail] = useState("");
  const [showMoreLocal, setShowMoreLocal] = useState(false);
  const [showMoreOnline, setShowMoreOnline] = useState(false);
  const router = Router;

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

  const localEvents: Event[] = [
    {
      id: "1",
      title: "Lakeside Camping at Pawna",
      category: "Travel & Adventure",
      date: "DEC 25-26",
      startTime: "06:00 AM",
      endTime: "06:00 PM",
      price: 1299,
      image: "/api/placeholder/300/200",
    },
    {
      id: "2",
      title: "Spirit Of Christmas 2024",
      category: "Entertainment",
      date: "DEC 02",
      startTime: "07:00 PM",
      price: 599,
      image: "/api/placeholder/300/200",
    },
    {
      id: "3",
      title: "Meet the Royal College of Art in Mumbai 2024",
      category: "Educational & Business",
      date: "DEC 02",
      startTime: "11:00 AM",
      image: "/api/placeholder/300/200",
    },
    {
      id: "4",
      title: "Global Engineering Education Expo 2024",
      category: "Educational & Business",
      date: "DEC 01",
      startTime: "10:00 AM",
      endTime: "06:00 PM",
      image: "/api/placeholder/300/200",
    },
    {
      id: "5",
      title: "Cricket Business Meetup",
      category: "Sports & Fitness",
      date: "DEC 09",
      startTime: "06:00 PM",
      image: "/api/placeholder/300/200",
    },
    {
      id: "6",
      title: "Valentine's Day Sail at Yacht Club Mumbai",
      category: "Entertainment",
      date: "FEB 14",
      startTime: "06:00 PM",
      price: 2500,
      image: "/api/placeholder/300/200",
    },
  ];

  const onlineEvents: Event[] = [
    {
      id: "7",
      title: "The Road to Jobs and Internships: Starting with LinkedIn",
      category: "Educational & Business",
      date: "JAN 18",
      startTime: "07:00 PM",
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
    {
      id: "8",
      title: "Online Zumba Dance Fitness Class over Zoom",
      category: "Sports & Fitness",
      date: "NOV 29",
      startTime: "07:00 PM",
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
    {
      id: "9",
      title: "Easy Book Folding: Christmas Edition",
      category: "Cultural & Arts",
      date: "DEC 12",
      startTime: "03:00 PM",
      price: 299,
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
    {
      id: "10",
      title: "Synod at Chetek 2024",
      category: "Cultural & Arts",
      date: "DEC 14",
      startTime: "10:00 AM",
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
    {
      id: "11",
      title: "HackerX - Zurich (Full-Stack) Salary 11/29 (Virtual)",
      category: "Technology & Innovation",
      date: "NOV 29",
      startTime: "06:00 PM",
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
    {
      id: "12",
      title: "FRIENDS OF THE FACYWEST: Season of Innovation 2024",
      category: "Technology & Innovation",
      date: "DEC 07",
      startTime: "02:00 PM",
      image: "/api/placeholder/300/200",
      isOnline: true,
    },
  ];

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Navigate to filter page with search query
    console.log("Searching for:", searchQuery, "in", location);
  };

  const handleSubscribe = () => {
    if (email.trim()) {
      console.log("Subscribing email:", email);
      setEmail("");
    }
  };

  const displayedLocalEvents = showMoreLocal
    ? localEvents
    : localEvents.slice(0, 6);
  const displayedOnlineEvents = showMoreOnline
    ? onlineEvents
    : onlineEvents.slice(0, 6);

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
              onSubmit={(e) => {
                handleSearch(e);
              }}
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

              {/* Location input (static) */}
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
                  value="Lagos"
                  disabled
                  className="pl-10 pr-4 py-3 text-gray-500 bg-gray-100 rounded-md w-full cursor-not-allowed"
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
            //changed (filter page)
              onClick={() => router.push("/")}
              className="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors font-semibold"
            >
              Book a space now
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

      {/* Popular Events Near You */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Popular Events Near You
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedLocalEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {!showMoreLocal && localEvents.length > 6 && (
          <div className="text-center">
            <button
              onClick={() => setShowMoreLocal(true)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              See More
            </button>
          </div>
        )}
      </div>

      {/* Discover Best of Online Events */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Discover Best of Online Events
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {displayedOnlineEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {!showMoreOnline && onlineEvents.length > 6 && (
            <div className="text-center">
              <button
                onClick={() => setShowMoreOnline(true)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                See More
              </button>
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
              <button className="cursor-pointer bg-[#ffe047] text-black px-4 py-2 sm:px-6 sm:py-3 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors text-xs sm:text-sm md:text-base whitespace-nowrap flex items-center gap-1 md:gap-2">
                <Calendar size={16} />
                Create Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trendy Events around the world */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Trendy Events around the world
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {displayedLocalEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {!showMoreLocal && localEvents.length > 6 && (
          <div className="text-center">
            <button
              onClick={() => setShowMoreLocal(true)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              See More
            </button>
          </div>
        )}
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
                  className="bg-gray-900 text-white px-4 py-3 rounded-r-md hover:bg-gray-800 transition-colors font-medium whitespace-nowrap min-w-[100px]"
                  style={{ flexShrink: 0 }}
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
