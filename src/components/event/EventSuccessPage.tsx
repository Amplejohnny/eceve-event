"use client";

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
  Edit,
} from "lucide-react";
import { FaXTwitter, FaFacebook } from "react-icons/fa6";
import { getEventUrl } from "@/lib/utils";
import Image from "next/image";

interface EventSuccessPageProps {
  event: {
    id: string;
    slug: string;
    title: string;
    category: string;
    date: Date;
    endDate?: Date;
    startTime: string;
    endTime?: string;
    location: string;
    venue?: string;
    address?: string;
    tags: string[];
    imageUrl?: string;
    description: string;
    eventType: "FREE" | "PAID";
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
  const [isWebShareSupported, setIsWebShareSupported] = useState(false);

  const eventUrl = getEventUrl(event.slug);

  // Check Web Share API support on client side
  useEffect(() => {
    setIsWebShareSupported(
      typeof navigator !== "undefined" && "share" in navigator
    );
  }, []);

  // Countdown timer with pause on user interaction
  useEffect(() => {
    let isPaused = false;

    const handleUserActivity = (): void => {
      isPaused = true;
      // Resume countdown after 10 seconds of inactivity
      setTimeout(() => {
        isPaused = false;
      }, 10000);
    };

    // Add event listeners for user activity
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => {
      document.addEventListener(event, handleUserActivity, true);
    });

    const timer = setInterval(() => {
      if (!isPaused) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            router.push("/");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return (): void => {
      clearInterval(timer);
      events.forEach((event) => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [router]);

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = eventUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleViewEvent = (): void => {
    router.push(`/events/${event.slug}`);
  };

  const handleEditEvent = (): void => {
    router.push(`/events/${event.id}/edit`);
  };

  const handleGoHome = (): void => {
    router.push("/");
  };

  const handleNativeShare = async (): Promise<void> => {
    if (isWebShareSupported) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this amazing event: ${event.title}`,
          url: eventUrl,
        });
      } catch (err) {
        console.log("Error sharing:", err);
        setShowShareOptions(true);
      }
    } else {
      setShowShareOptions(true);
    }
  };

  const shareToTwitter = (): void => {
    const text = `Check out this amazing event: ${event.title}`;
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(eventUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToFacebook = (): void => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      eventUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToWhatsApp = (): void => {
    const text = `Check out this amazing event: ${event.title} - ${eventUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToLinkedIn = (): void => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      eventUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (price: number): string => {
    return event.eventType === "FREE" ? "Free" : `₦${price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-bounce">
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
          <p className="text-xs text-gray-500 mt-2">
            Countdown pauses when you interact with the page
          </p>
        </div>

        {/* Event Preview Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 transform hover:scale-[1.01] transition-all duration-300 hover:shadow-2xl">
          {event.imageUrl && (
            <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600">
              <Image
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={240}
              />
              <div className="absolute inset-0 bg-black bg-opacity-20"></div>
              <div className="absolute top-4 left-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white bg-opacity-90 text-gray-800 backdrop-blur-sm">
                  {event.category}
                </span>
              </div>
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                  {event.eventType}
                </span>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {event.title}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                {event.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex items-start text-gray-600">
                <Calendar className="w-5 h-5 mr-3 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">
                    {formatDate(event.date)}
                    {event.endDate && (
                      <span className="block text-sm text-gray-500">
                        to {formatDate(event.endDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm flex items-center mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    {event.startTime}
                    {event.endTime && ` - ${event.endTime}`}
                  </div>
                </div>
              </div>

              <div className="flex items-start text-gray-600">
                <MapPin className="w-5 h-5 mr-3 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">{event.location}</div>
                  {event.venue && (
                    <div className="text-sm text-gray-500">{event.venue}</div>
                  )}
                  {event.address && (
                    <div className="text-sm text-gray-500">{event.address}</div>
                  )}
                </div>
              </div>
            </div>

            {event.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Ticket Information
              </h3>
              <div className="space-y-3">
                {event.ticketTypes.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex justify-between items-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {ticket.name}
                      </span>
                      {ticket.quantity && (
                        <span className="text-sm text-gray-500 ml-2 bg-white px-2 py-1 rounded">
                          Qty: {ticket.quantity}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-lg text-gray-900">
                      {formatPrice(ticket.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleViewEvent}
            className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            View Event
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>

          <button
            onClick={handleEditEvent}
            className="flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Edit className="w-5 h-5 mr-2" />
            Edit Event
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Copy className="w-5 h-5 mr-2" />
            {copied ? "Copied!" : "Copy Link"}
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
            {!isWebShareSupported &&
              (showShareOptions ? (
                <ChevronUp className="w-4 h-4 ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 ml-2" />
              ))}
          </button>
        </div>

        {/* Share Options */}
        {showShareOptions && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Share your event
              </h3>
              <button
                title="Close Share Options"
                onClick={() => setShowShareOptions(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <button
                onClick={shareToTwitter}
                className="flex flex-col items-center justify-center p-4 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                <FaXTwitter className="w-6 h-6 mb-2" />
                <span className="text-sm">X</span>
              </button>

              <button
                onClick={shareToFacebook}
                className="flex flex-col items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaFacebook className="w-6 h-6 mb-2" />
                <span className="text-sm">Facebook</span>
              </button>

              <button
                onClick={shareToWhatsApp}
                className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-6 h-6 mb-2" />
                <span className="text-sm">WhatsApp</span>
              </button>

              <button
                onClick={shareToLinkedIn}
                className="flex flex-col items-center justify-center p-4 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
              >
                <svg
                  className="w-6 h-6 mb-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span className="text-sm">LinkedIn</span>
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
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
            className="flex items-center px-8 py-4 bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <Home className="w-5 h-5 mr-2" />
            Go to Homepage
          </button>
        </div>

        {/* Footer Notes */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-gray-500 text-sm">
            You can always edit your event details from your dashboard
          </p>
          <p className="text-gray-400 text-xs">Event ID: {event.id}</p>
        </div>
      </div>
    </div>
  );
};

export default EventSuccessPage;
