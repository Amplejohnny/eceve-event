"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Star,
  Share2,
  X,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";
import { FaXTwitter, FaFacebook, FaLinkedin } from "react-icons/fa6";
import { useEventStore } from "@/store/eventStore";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventUrl: string;
  eventTitle: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  eventUrl,
  eventTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (err instanceof Error) {
        console.error("Error fetching event:", err);
      } else {
        console.error("Unexpected error:", err);
      }
    }
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      eventUrl
    )}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      eventUrl
    )}&text=${encodeURIComponent(eventTitle)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(
      `${eventTitle} ${eventUrl}`
    )}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      eventUrl
    )}`,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Share with friends</h3>
          <button
            title="Close"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex justify-center space-x-4 mb-6">
          <a
            title="Share on Facebook"
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <FaFacebook className="w-6 h-6" />
          </a>
          <a
            title="Share on Twitter"
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
          >
            <FaXTwitter className="w-6 h-6" />
          </a>
          <a
            title="Share on WhatsApp"
            href={shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </a>
          <a
            title="Share on LinkedIn"
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
          >
            <FaLinkedin className="w-6 h-6" />
          </a>
        </div>

        <div className="border rounded-lg p-3 flex items-center space-x-3">
          <span className="text-sm text-gray-600 flex-1 truncate">
            Event URL
          </span>
          <input
            type="text"
            value={eventUrl}
            readOnly
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            onClick={handleCopyLink}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const EventSlugPage = (): JSX.Element => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");
  const { loadEvent, currentEvent, isLoading } = useEventStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (!eventId) {
      router.push("/");
      return;
    }

    const fetchEvent = async (): Promise<void> => {
      try {
        await loadEvent(eventId);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Error fetching event:", err);
        } else {
          console.error("Unexpected error:", err);
        }
      }
    };

    fetchEvent();
  }, [eventId, router, loadEvent]);

  const handleFavoriteToggle = (): void => {
    if (!session?.user) {
      setShowVerificationMessage(true);
      setTimeout(() => setShowVerificationMessage(false), 3000);
      return;
    }
    setIsFavorite(!isFavorite);
  };

  const handleBuyTickets = (): void => {
    router.push("/ticket");
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (price: number): string => {
    return `₦${(price / 100).toLocaleString()}`;
  };

  const eventUrl = typeof window !== "undefined" ? window.location.href : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The event you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }
  return (
    <>
      <Head>
        <title>{currentEvent.title}</title>
        <meta name="description" content={currentEvent.description} />
        <meta property="og:title" content={currentEvent.title} />
        <meta property="og:description" content={currentEvent.description} />
        {currentEvent.imageUrl && (
          <meta property="og:image" content={currentEvent.imageUrl} />
        )}
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header Banner */}
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-red-600 to-green-600">
          {currentEvent.imageUrl && (
            <Image
              src={currentEvent.imageUrl}
              alt={currentEvent.title}
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Event Title */}
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {currentEvent.title}
                </h1>
              </div>

              {/* Event Info */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Event Details</h2>

                {/* Date and Time */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Date and Time
                  </h3>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {currentEvent.date && formatDate(currentEvent.date)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(currentEvent.startTime)}
                      {currentEvent.endTime &&
                        ` - ${formatTime(currentEvent.endTime)}`}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">
                      {currentEvent.venue || currentEvent.location}
                    </p>
                    {currentEvent.address && (
                      <p className="text-sm">{currentEvent.address}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    About this event
                  </h3>
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {currentEvent.description}
                  </div>
                </div>

                {/* Tags */}
                {currentEvent.tags.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {currentEvent.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hosted By */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-medium text-gray-900 mb-4">Hosted by</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {currentEvent.organizer?.name?.charAt(0) || "C"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {currentEvent.organizer?.name || "City Youth Movement"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                {/* Ticket Information */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Tickets</h3>
                    <div className="flex items-center space-x-2">
                      <button
                        title="Add to Favorites"
                        onClick={handleFavoriteToggle}
                        className={`p-2 rounded-full transition-colors ${
                          isFavorite
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            isFavorite ? "fill-current" : ""
                          }`}
                        />
                      </button>
                      <button
                        title="Share Event"
                        onClick={() => setIsShareModalOpen(true)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  {showVerificationMessage && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Become a verified user to add events to favorites
                      </p>
                    </div>
                  )}

                  {/* Event Tickets */}
                  <div className="space-y-3 mb-6">
                    {(currentEvent.ticketTypes || []).map((ticket) => (
                      <div key={ticket.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-900">
                            {ticket.name}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {ticket.price === 0
                              ? "Free"
                              : formatPrice(ticket.price)}
                          </span>
                        </div>
                        {ticket.quantity && (
                          <span className="text-sm text-gray-500">
                            {ticket.quantity} available
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleBuyTickets}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    {currentEvent.eventType === "FREE"
                      ? "Get Tickets"
                      : "Buy Tickets"}
                  </button>
                </div>

                {/* Event Stats */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Event Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium">
                        {currentEvent.category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className="font-medium capitalize">
                        {currentEvent.eventType.toLowerCase()}
                      </span>
                    </div>
                    {currentEvent.status && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium capitalize">
                          {currentEvent.status.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventUrl={eventUrl}
        eventTitle={currentEvent.title}
      />
    </>
  );
};

export default EventSlugPage;
