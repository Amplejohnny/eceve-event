"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Calendar, Clock, Star, Share2, X, Copy, Check } from "lucide-react";
import {
  FaXTwitter,
  FaFacebookF,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa6";
import { useEventStore, type TicketTypeTicket } from "@/store/eventStore";
// import type { TicketType } from "@/store/eventStore";
import {
  formatDate,
  formatPrice,
  formatTime,
  getEventImageUrl,
} from "@/lib/utils";
import TicketPurchaseModal from "@/components/ticket/TicketModal";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventUrl: string;
  eventTitle: string;
}

interface EventSlugPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialEvent?: any;
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
        console.error("Error copying link:", err);
      } else {
        console.error("Unexpected error:", err);
      }
    }
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      `${eventTitle}\n\n${eventUrl}`
    )}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `${eventTitle}\n\n${eventUrl}`
    )}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(eventUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      `${eventTitle}\n\n${eventUrl}`
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
            <FaFacebookF className="w-6 h-6" />
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
            <FaWhatsapp className="w-6 h-6" />
          </a>
          <a
            title="Share on LinkedIn"
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors"
          >
            <FaLinkedinIn className="w-6 h-6" />
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

const EventSlugPage = ({ initialEvent }: EventSlugPageProps): JSX.Element => {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { loadEvent, currentEvent, isLoading, setCurrentEvent } =
    useEventStore();

  const [isFavorite, setIsFavorite] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {

    if (!slug) {
      router.push("/");
      return;
    }

    setLocalLoading(true);
    setCurrentEvent(null);

    const fetchEvent = async (): Promise<void> => {
      try {
        await loadEvent(slug);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Error fetching event:", err);
        } else {
          console.error("Unexpected error:", err);
        }

        // If API fails and we have initialEvent as fallback, use it
        if (initialEvent) {
          setCurrentEvent(initialEvent);
        } else {
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
      } finally {
        setLocalLoading(false);
      }
    };

    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, router, loadEvent, setCurrentEvent]);

  const handleFavoriteToggle = (): void => {
    if (!session?.user) {
      setShowVerificationMessage(true);
      setTimeout(() => setShowVerificationMessage(false), 3000);
      return;
    }
    setIsFavorite(!isFavorite);
  };

  const handleBuyTickets = (): void => {
    setIsTicketModalOpen(true);
  };

  useEffect(() => {
    setImageError(false);
  }, [currentEvent?.organizer?.image]);

  const eventUrl = typeof window !== "undefined" ? window.location.href : "";
  const isActuallyLoading = localLoading || isLoading;

  const eventToShow = currentEvent || initialEvent;

  if (isActuallyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  // Now check if we have EITHER currentEvent OR initialEvent
  if (!eventToShow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The event you're looking for doesn't exist.
          </p>
          {slug && (
            <p className="text-xs text-gray-400 mb-4">Searched for: {slug}</p>
          )}
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

  const hasAvailableTickets = () => {
    if (!eventToShow.ticketTypes || eventToShow.ticketTypes.length === 0) {
      return false;
    }

    return eventToShow.ticketTypes.some((ticket: TicketTypeTicket) => {
      if (ticket.quantity === null || ticket.quantity === undefined)
        return true;
      const soldTickets = ticket.soldCount || 0;
      return ticket.quantity > soldTickets;
    });
  };

  const isEventSoldOut = !hasAvailableTickets();

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Banner */}
        <div className="relative h-64 md:h-80 bg-gradient-to-r from-red-600 to-green-600">
          {eventToShow.imageUrl && (
            <Image
              src={getEventImageUrl(eventToShow.imageUrl)}
              alt={eventToShow.title}
              title={eventToShow.title}
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
                  {eventToShow.title}
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
                      {eventToShow.date && formatDate(eventToShow.date)}
                      {eventToShow.endDate &&
                        ` - ${formatDate(eventToShow.endDate)}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 mt-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatTime(eventToShow.startTime)}
                      {eventToShow.endTime &&
                        ` - ${formatTime(eventToShow.endTime)}`}
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">
                      {eventToShow.venue || eventToShow.location}
                    </p>
                    {eventToShow.address && (
                      <p className="text-sm">{eventToShow.address}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    About this event
                  </h3>
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {eventToShow.description}
                  </div>
                </div>

                {/* Tags */}
                {eventToShow.tags && eventToShow.tags.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {eventToShow.tags.map((tag: string) => (
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
                  <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-r from-red-600 to-green-600">
                    {eventToShow.organizer?.image && !imageError ? (
                      <Image
                        src={eventToShow.organizer.image}
                        alt={eventToShow.organizer?.name || "Organizer"}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        onError={() => {
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {eventToShow.organizer?.name?.charAt(0) || "O"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {eventToShow.organizer?.name || "Event Organizer"}
                    </p>
                    {eventToShow.organizer?.email && (
                      <p className="text-sm text-gray-500">
                        {eventToShow.organizer.email}
                      </p>
                    )}
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
                    {(eventToShow.ticketTypes || []).map(
                      (ticket: TicketTypeTicket) => {
                        // Calculate available tickets properly
                        const soldTickets = ticket.soldCount || 0;
                        const totalTickets = ticket.quantity;

                        // Handle unlimited tickets properly
                        const isUnlimitedTickets =
                          totalTickets === undefined || totalTickets === null;
                        const availableTickets = isUnlimitedTickets
                          ? null
                          : Math.max(0, totalTickets - soldTickets);

                        // Only out of stock if we have limited tickets AND available is 0
                        const isOutOfStock =
                          !isUnlimitedTickets && availableTickets === 0;

                        return (
                          <div
                            key={ticket.id}
                            className="border rounded-lg p-3"
                          >
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
                            <div className="flex justify-between items-center">
                              {isUnlimitedTickets ? (
                                <span className="hidden text-sm text-gray-500">
                                  Unlimited
                                </span>
                              ) : (
                                <span
                                  className={`text-sm ${
                                    isOutOfStock
                                      ? "text-red-500 font-medium"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {isOutOfStock
                                    ? "Sold out"
                                    : `${availableTickets} available`}
                                </span>
                              )}
                              {isOutOfStock && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                  Out of stock
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                  <button
                    onClick={handleBuyTickets}
                    disabled={isEventSoldOut}
                    className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                      isEventSoldOut
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "cursor-pointer bg-yellow-400 text-white hover:bg-yellow-500"
                    }`}
                  >
                    {isEventSoldOut
                      ? "Sold Out"
                      : eventToShow.eventType === "FREE"
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
                        {eventToShow.category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className="font-medium capitalize">
                        {eventToShow.eventType.toLowerCase()}
                      </span>
                    </div>
                    {eventToShow.status && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className="font-medium capitalize">
                          {eventToShow.status.toLowerCase()}
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

      <TicketPurchaseModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        event={
          eventToShow
            ? {
                id: eventToShow.id,
                title: eventToShow.title,
                description: eventToShow.description,
                eventType: eventToShow.eventType,
                date: eventToShow.date,
                endDate: eventToShow.endDate,
                startTime: eventToShow.startTime,
                endTime: eventToShow.endTime,
                location: eventToShow.location,
                venue: eventToShow.venue,
                address: eventToShow.address,
                ticketTypes: eventToShow.ticketTypes || [],
                organizer: eventToShow.organizer,
              }
            : null
        }
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        eventUrl={eventUrl}
        eventTitle={(currentEvent || initialEvent)?.title || ""}
      />
    </>
  );
};

export default EventSlugPage;
