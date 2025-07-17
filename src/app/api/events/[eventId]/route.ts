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
      slug: event.slug,
      title: event.title,
      description: event.description,
      category: event.category,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      endDate: event.endDate,
      location: event.location,
      venue: event.venue,
      address: event.address,
      imageUrl: event.imageUrl,
      tags: event.tags,
      eventType: event.eventType,
      status: event.status,
      isPublic: event.isPublic,
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