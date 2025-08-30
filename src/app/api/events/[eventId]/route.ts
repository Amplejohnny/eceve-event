import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface EventWithRelations {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  date: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  venue: string | null;
  address: string | null;
  tags: string[];
  category: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  status: string;
  slug: string;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number | null;
  }>;
  organizer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

// Helper functions
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
};

const isValidCuid = (id: string): boolean => {
  return /^c[a-z0-9]{24}$/i.test(id);
};

const looksLikeId = (identifier: string): boolean => {
  return isValidUUID(identifier) || isValidCuid(identifier);
};

const transformEventDataWithCounts = (
  event: EventWithRelations,
  soldCountMap: Record<string, number>
) => {
  const transformed = {
    id: event.id,
    title: event.title,
    description: event.description,
    eventType: event.eventType,
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() || null,
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    location: event.location || "",
    venue: event.venue || "",
    address: event.address || "",
    tags: Array.isArray(event.tags) ? event.tags : [],
    category: event.category || "",
    imageUrl: event.imageUrl || "",
    isPublic: event.isPublic ?? true,
    status: event.status,
    slug: event.slug,
    ticketTypes: event.ticketTypes.map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity,
      soldCount: soldCountMap[ticket.id] || 0, // Get sold count from the map
    })),
    organizer: event.organizer
      ? {
          id: event.organizer.id,
          name: event.organizer.name,
          email: event.organizer.email,
          image: event.organizer.image,
        }
      : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };

  return transformed;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    if (!eventId) {
      return createErrorResponse("Event ID is required", 400);
    }

    const searchById = looksLikeId(eventId);

    // First get the event
    const event = await db.event.findUnique({
      where: searchById ? { id: eventId } : { slug: eventId },
      include: {
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!event) {
      const errorMessage = searchById
        ? "Event not found with the provided ID"
        : "Event not found with the provided slug";
      return createErrorResponse(errorMessage, 404);
    }

    console.log(`🔍 API: Found event with ID: ${event.id}`);
    console.log(
      `🎫 API: Event has ${event.ticketTypes.length} ticket types:`,
      event.ticketTypes.map((t) => ({ id: t.id, name: t.name }))
    );

    // Debug: Check all tickets in the database for this event
    const allTicketsForEvent = await db.ticket.findMany({
      where: {
        eventId: event.id,
      },
      select: {
        id: true,
        ticketTypeId: true,
        status: true,
      },
    });

    console.log(
      `🎟️ API: Total tickets in database for event ${event.id}: ${allTicketsForEvent.length}`
    );
    console.log(`🎟️ API: All tickets breakdown:`, allTicketsForEvent);

    // Now get sold ticket counts for each ticket type for this event
    const soldTicketCounts = await db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        eventId: event.id,
        status: "ACTIVE", // Make sure this status exists in your data
      },
      _count: {
        id: true,
      },
    });

    console.log(
      `📊 API: Sold ticket counts (ACTIVE status only):`,
      soldTicketCounts
    );

    // Also check with different statuses to debug
    const soldTicketCountsAll = await db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        eventId: event.id,
        // Remove status filter to see all tickets
      },
      _count: {
        id: true,
      },
    });

    console.log(
      `📊 API: All ticket counts (regardless of status):`,
      soldTicketCountsAll
    );

    // Check what statuses exist
    const ticketStatuses = await db.ticket.findMany({
      where: {
        eventId: event.id,
      },
      select: {
        status: true,
      },
      distinct: ["status"],
    });

    console.log(
      `🔍 API: Available ticket statuses for this event:`,
      ticketStatuses
    );

    // Create a map for quick lookup
    const soldCountMap = soldTicketCounts.reduce((acc, item) => {
      acc[item.ticketTypeId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    console.log(`🗺️ API: Final soldCountMap:`, soldCountMap);

    const transformedEvent = transformEventDataWithCounts(event, soldCountMap);

    console.log(
      `✅ API: Sending transformed event with ticket soldCounts:`,
      transformedEvent.ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        soldCount: t.soldCount,
      }))
    );

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("API Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("connection")) {
        return createErrorResponse("Database connection error", 503);
      }
      if (error.message.includes("Invalid")) {
        return createErrorResponse("Invalid event ID format", 400);
      }
    }

    return createErrorResponse("Internal server error", 500);
  }
}
