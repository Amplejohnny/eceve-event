import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    // Validate eventId
    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Check if eventId is a valid UUID or slug
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        eventId
      );

    // Fetch event by ID or slug with all related data
    const event = await db.event.findUnique({
      where: isUUID ? { id: eventId } : { slug: eventId },
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
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transform the data to ensure consistent structure
    const transformedEvent = {
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
        quantity: ticket.quantity, // Keep as-is, let client handle null
      })),
      organizer: event.organizer || null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      ticketsSold: event._count.tickets,
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("Error fetching event:", error);

    // More specific error handling
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes("connection")) {
        return NextResponse.json(
          { error: "Database connection error" },
          { status: 503 }
        );
      }

      // Prisma validation errors
      if (error.message.includes("Invalid")) {
        return NextResponse.json(
          { error: "Invalid event ID format" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
