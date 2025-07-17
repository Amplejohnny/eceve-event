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
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            // Don't include sensitive data
          },
        },
        // Include other relations as needed
        _count: {
          select: {
            bookings: true,
            // Other counts you might need
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Transform the data for consistent API response
    const transformedEvent = {
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      venue: event.venue,
      address: event.address,
      imageUrl: event.imageUrl,
      tags: event.tags,
      eventType: event.eventType,
      status: event.status,
      maxAttendees: event.maxAttendees,
      ticketTypes: event.ticketTypes.map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
        sold: ticket.sold || 0,
        available: ticket.quantity
          ? ticket.quantity - (ticket.sold || 0)
          : null,
      })),
      creator: event.creator,
      stats: {
        totalBookings: event._count.bookings,
        // Add other stats as needed
      },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Optional: Handle other HTTP methods if needed
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  // Handle event updates
  // Add authentication/authorization checks here
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  // Handle event deletion
  // Add authentication/authorization checks here
}
