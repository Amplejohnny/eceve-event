import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { updateEvent, getEventById, checkTicketSales } from "@/lib/event";
import { EventType, EventStatus } from "@/generated/prisma";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(1, "Event title is required").optional(),
  description: z.string().min(1, "Event description is required").optional(),
  eventType: z.nativeEnum(EventType).optional(),
  date: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(1, "Event location is required").optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().min(1, "Event category is required").optional(),
  imageUrl: z.string().optional(),
  isPublic: z.boolean().optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { eventId } = params;

    // Check if event exists and user owns it
    const existingEvent = await getEventById(eventId);
    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (existingEvent.organizerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    // Additional validation for date changes
    if (validatedData.date && validatedData.date < new Date()) {
      return NextResponse.json(
        { error: "Event date cannot be in the past" },
        { status: 400 }
      );
    }

    // Validate end date is after start date
    const startDate = validatedData.date || existingEvent.date;
    if (validatedData.endDate && validatedData.endDate < startDate) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Validate start time and end time
    if (validatedData.startTime && validatedData.endTime) {
      // Basic time format validation (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (!timeRegex.test(validatedData.startTime)) {
        return NextResponse.json(
          { error: "Invalid start time format. Use HH:MM format" },
          { status: 400 }
        );
      }

      if (!timeRegex.test(validatedData.endTime)) {
        return NextResponse.json(
          { error: "Invalid end time format. Use HH:MM format" },
          { status: 400 }
        );
      }

      // Check if end time is after start time (on the same day)
      const [startHour, startMinute] = validatedData.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = validatedData.endTime.split(":").map(Number);

      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      if (endTimeMinutes <= startTimeMinutes) {
        return NextResponse.json(
          { error: "End time must be after start time" },
          { status: 400 }
        );
      }
    }

    // Prevent changing event type if there are existing ticket sales
    if (
      validatedData.eventType &&
      validatedData.eventType !== existingEvent.eventType
    ) {
      const hasTicketSales = await checkTicketSales(eventId);
      if (hasTicketSales) {
        return NextResponse.json(
          { error: "Cannot change event type when tickets have been sold" },
          { status: 400 }
        );
      }
    }

    // Use the event library function
    const updatedEvent = await updateEvent(eventId, {
      ...validatedData,
      // Ensure we only pass the fields that are defined
      ...(validatedData.date && { date: validatedData.date }),
      ...(validatedData.endDate !== undefined && {
        endDate: validatedData.endDate,
      }),
      ...(validatedData.startTime && { startTime: validatedData.startTime }),
      ...(validatedData.endTime && { endTime: validatedData.endTime }),
    });

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error("Error updating event:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const event = await getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
