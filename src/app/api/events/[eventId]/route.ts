// Here's your complete working API route:

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformEventData = (event: any) => {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ticketTypes: event.ticketTypes.map((ticket: any) => ({
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
          image: event.organizer.image, // This should now work!
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

    // Fetch event - IMPORTANT: Use organizer: true instead of select
    const event = await db.event.findUnique({
      where: searchById ? { id: eventId } : { slug: eventId },
      include: {
        ticketTypes: {
          orderBy: { price: "asc" },
        },
        organizer: true, // Get ALL organizer fields
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

    // Transform the data
    const transformedEvent = transformEventData(event);

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("Error fetching event:", error);

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
