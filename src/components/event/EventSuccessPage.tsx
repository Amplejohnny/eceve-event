import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Share2,
  Copy,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Tag,
  ArrowRight,
  Home,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FaXTwitter, FaFacebook } from "react-icons/fa6";
import { EventType } from "@/generated/prisma";

interface EventSuccessPageProps {
  event: {
    id: string;
    slug: string;
    title: string;
    category: string;
    date: Date;
    startTime: string;
    endTime?: string;
    location: string;
    venue?: string;
    address?: string;
    tags: string[];
    imageUrl?: string;
    description: string;
    eventType: EventType;
    ticketTypes: Array<{
      id: string;
      name: string;
      price: number;
      quantity?: number;
    }>;
  };
}

const EventSuccessPage: React.FC<EventSuccessPageProps> = ({ event }) => {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const eventUrl = `${window.location.origin}/events/${event.slug}`;

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleViewEvent = () => {
    router.push(`/events/${event.slug}`);
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const shareToTwitter = () => {
    const text = `Check out this amazing event: ${event.title}`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(eventUrl)}`;
    window.open(url, "_blank");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      eventUrl
    )}`;
    window.open(url, "_blank");
  };

  const shareToWhatsApp = () => {
    const text = `Check out this amazing event: ${event.title} - ${eventUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Event Created Successfully! 🎉
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Your event is now live and ready for attendees
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <Home className="w-4 h-4 mr-2" />
            Redirecting to homepage in {timeLeft}s
          </div>
        </div>

        {/* Event Preview Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 transform hover:scale-[1.01] transition-transform duration-300">
          {event.imageUrl && (
            <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-90 text-gray-800">
                  {event.category}
                </span>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {event.title}
              </h2>
              <p className="text-gray-600 line-clamp-3">{event.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                <div>
                  <div className="font-medium">
                    {event.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-sm flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {event.startTime}
                    {event.endTime && ` - ${event.endTime}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-3 text-red-500" />
                <div>
                  <div className="font-medium">{event.location}</div>
                  {event.venue && <div className="text-sm">{event.venue}</div>}
                </div>
              </div>
            </div>

            {event.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 text-gray-900">
                Ticket Information
              </h3>
              <div className="space-y-2">
                {event.ticketTypes.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex justify-between items-center bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {ticket.name}
                      </span>
                      {ticket.quantity && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Qty: {ticket.quantity})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                      {event.eventType === EventType.FREE
                        ? "Free"
                        : `₦${ticket.price.toLocaleString()}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleViewEvent}
            className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            View Event Page
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Copy className="w-5 h-5 mr-2" />
            {copied ? "Copied!" : "Copy Link"}
          </button>

          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Event
            {showShareOptions ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </button>
        </div>

        {/* Share Options */}
        {showShareOptions && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Share your event
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <button
                onClick={shareToTwitter}
                className="flex items-center justify-center px-4 py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                <FaXTwitter className="w-5 h-5 mr-2" />X
              </button>

              <button
                onClick={shareToFacebook}
                className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaFacebook className="w-5 h-5 mr-2" />
                Facebook
              </button>

              <button
                onClick={shareToWhatsApp}
                className="flex items-center justify-center px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </button>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Link
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={eventUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center">
          <button
            onClick={handleGoHome}
            className="flex items-center px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Homepage
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>You can always edit your event details from your dashboard</p>
        </div>
      </div>
    </div>
  );
};

export default EventSuccessPage;
