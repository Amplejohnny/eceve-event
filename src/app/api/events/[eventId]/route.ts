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
  _count: {
    tickets: number;
  };
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

const transformEventData = (event: EventWithRelations) => {
  return {
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
    ticketsSold: event._count.tickets,
  };
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

    // Fetch event by ID or slug with all related data
    const event = await db.event.findUnique({
      where: searchById ? { id: eventId } : { slug: eventId },
      include: {
        ticketTypes: {
          orderBy: { price: "asc" },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: {
                status: {
                  in: ["ACTIVE", "USED"],
                },
              },
            },
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

    const transformedEvent = transformEventData(event);

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
