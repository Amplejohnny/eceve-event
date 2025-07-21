import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Star,
  Users,
  Tag,
  X,
  Plus,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useEventStore } from "@/store/eventStore";

const PREDEFINED_TAGS = [
  "Conference",
  "Workshop",
  "Networking",
  "Music",
  "Comedy",
  "Art",
  "Sports",
  "Food",
  "Business",
  "Technology",
  "Education",
  "Health",
  "Family",
  "Online",
  "Outdoor",
  "Indoor",
  "Free",
  "Premium",
  "Beginner",
  "Advanced",
];

const CATEGORIES = [
  "Entertainment",
  "Educational & Business",
  "Cultural & Arts",
  "Sports & Fitness",
  "Technology & Innovation",
  "Travel & Adventure",
];

const PRICE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Free", value: "FREE" },
  { label: "Paid", value: "PAID" },
];

const EventCard = ({ event }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date
      .toLocaleDateString("en-US", { month: "short" })
      .toUpperCase();
    const day = date.getDate();
    return { month, day };
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const { month, day } = formatDate(event.date);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* Event Image */}
      <div className="relative h-48 bg-gray-200">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
            <Calendar className="h-16 w-16 text-gray-400" />
          </div>
        )}

        {/* Date Badge */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-2 text-center min-w-[50px]">
          <div className="text-xs font-medium text-gray-600">{month}</div>
          <div className="text-lg font-bold text-gray-900">{day}</div>
        </div>

        {/* Favorite Button */}
        <button
          title="favourite"
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md hover:bg-gray-50"
        >
          <Star className="h-4 w-4 text-gray-400" />
        </button>

        {/* Event Type Badge */}
        <div className="absolute bottom-4 left-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.eventType === "FREE"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {event.eventType === "FREE" ? "Free" : "Paid"}
          </span>
        </div>
      </div>

      {/* Event Details */}
      <div className="p-4">
        {/* Category */}
        <div className="mb-2">
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
            {event.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {event.title}
        </h3>

        {/* Time */}
        <div className="flex items-center text-gray-600 text-sm mb-2">
          <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
          <span>
            {formatTime(event.startTime)}
            {event.endTime && ` - ${formatTime(event.endTime)}`}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center text-gray-600 text-sm mb-3">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            <span>{event._count?.tickets || 0} interested</span>
          </div>

          {event.eventType === "PAID" && event.ticketTypes?.[0] && (
            <div className="text-sm font-semibold text-gray-900">
              ₦{(event.ticketTypes[0].price / 100).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EventsPage = () => {
  const {
    allEvents,
    eventsLoading,
    eventsError,
    loadEvents,
    setEventsError,
    clearEvents,
  } = useEventStore();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [customTag, setCustomTag] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Load events on component mount
  useEffect(() => {
    loadInitialEvents();
  }, []);

  const loadInitialEvents = async () => {
    try {
      const result = await loadEvents({ limit: 12 });
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  // Handle search and filters
  const handleSearch = async () => {
    setIsLoading(true);
    clearEvents();

    try {
      const params = {
        q: searchQuery,
        location: location,
        category: selectedCategory,
        eventType: priceFilter !== "all" ? priceFilter : undefined,
        limit: 12,
        offset: 0,
      };

      const result = await loadEvents(params);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error searching events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load more events
  const loadMoreEvents = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const params = {
        q: searchQuery,
        location: location,
        category: selectedCategory,
        eventType: priceFilter !== "all" ? priceFilter : undefined,
        limit: 12,
        offset: allEvents.length,
      };

      const result = await loadEvents(params);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error("Error loading more events:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Tag management
  const addTag = (tag) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag));
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag("");
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setLocation("");
    setSelectedCategory("");
    setSelectedTags([]);
    setPriceFilter("all");
    setSortBy("relevance");
    loadInitialEvents();
  };

  // Filter events locally by tags (since API doesn't support tags yet)
  const filteredEvents = allEvents.filter((event) => {
    if (selectedTags.length === 0) return true;
    return selectedTags.some((tag) =>
      event.tags?.some((eventTag) =>
        eventTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Explore a world of events. Find what excites you!
            </h1>
            <p className="text-xl opacity-90 mb-8">
              Discover amazing events happening around you
            </p>

            {/* Search Bar */}
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-2 flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-gray-900 rounded-md border-0 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full md:w-48 pl-10 pr-4 py-3 text-gray-900 rounded-md border-0 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-8 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isLoading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-8">
          {/* Mobile Filter Toggle */}
          <div className="md:hidden mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-between w-full p-3 bg-white rounded-lg shadow-sm border"
            >
              <div className="flex items-center">
                <Filter className="h-5 w-5 mr-2 text-gray-500" />
                <span>Filters</span>
              </div>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${
                  showFilters ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Filter Content */}
          <div
            className={`${showFilters ? "block" : "hidden"} md:block space-y-4`}
          >
            {/* Category & Price Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  title="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <select
                  title="priceFilter"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {PRICE_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <select
                  title="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="date">Date</option>
                  <option value="price">Price</option>
                </select>
              </div>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                    >
                      {tag}
                      <button
                        title="removeTag"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-purple-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Custom Tag */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addCustomTag()}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
                <button
                  title="addTag"
                  onClick={addCustomTag}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Predefined Tags */}
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    disabled={selectedTags.includes(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-purple-100 text-purple-800 border-purple-200 cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Events</h2>
            <p className="text-gray-600">
              {totalCount > 0
                ? `${totalCount} events found`
                : "No events found"}
            </p>
          </div>
        </div>

        {/* Events Grid */}
        {eventsError ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{eventsError}</div>
            <button
              onClick={loadInitialEvents}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Loading State */}
            {(eventsLoading || isLoading) && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-4 text-gray-600">Loading events...</p>
              </div>
            )}

            {/* Load More */}
            {hasMore &&
              !eventsLoading &&
              !isLoading &&
              filteredEvents.length > 0 && (
                <div className="text-center">
                  <button
                    onClick={loadMoreEvents}
                    className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Load More Events
                  </button>
                </div>
              )}

            {/* No Events */}
            {!eventsLoading && !isLoading && filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No events found
                </h3>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria or clearing some filters
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
