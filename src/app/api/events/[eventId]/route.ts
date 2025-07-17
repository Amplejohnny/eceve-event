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

    // Transform the data to match EventStore's loadEvent expectations
    const transformedEvent = {
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      date: event.date,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      venue: event.venue,
      address: event.address,
      tags: event.tags,
      category: event.category,
      imageUrl: event.imageUrl,
      isPublic: event.isPublic,
      status: event.status,
      slug: event.slug,
      ticketTypes: event.ticketTypes.map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
      })),
      organizer: event.organizer,
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
