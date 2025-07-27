import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { updateEvent, getEventById, checkTicketSales } from "@/lib/event";
import { EventType, EventStatus } from "@/generated/prisma";
import { z } from "zod";

// Helper functions
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

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
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const existingEvent = await getEventById(eventId);
    if (!existingEvent) {
      return createErrorResponse("Event not found", 404);
    }

    if (existingEvent.organizerId !== session.user.id) {
      return createErrorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    if (validatedData.date && validatedData.date < new Date()) {
      return createErrorResponse("Event date cannot be in the past", 400);
    }

    const startDate = validatedData.date || existingEvent.date;
    if (validatedData.endDate && validatedData.endDate < startDate) {
      return createErrorResponse("End date cannot be before start date", 400);
    }

    if (validatedData.startTime && validatedData.endTime) {
      if (!validateTimeFormat(validatedData.startTime)) {
        return createErrorResponse(
          "Invalid start time format. Use HH:MM format",
          400
        );
      }

      if (!validateTimeFormat(validatedData.endTime)) {
        return createErrorResponse(
          "Invalid end time format. Use HH:MM format",
          400
        );
      }

      const [startHour, startMinute] = validatedData.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = validatedData.endTime.split(":").map(Number);

      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      if (endTimeMinutes <= startTimeMinutes) {
        return createErrorResponse("End time must be after start time", 400);
      }
    }

    if (
      validatedData.eventType &&
      validatedData.eventType !== existingEvent.eventType
    ) {
      const hasTicketSales = await checkTicketSales(eventId);
      if (hasTicketSales) {
        return createErrorResponse(
          "Cannot change event type when tickets have been sold",
          400
        );
      }
    }

    const updatedEvent = await updateEvent(eventId, {
      ...validatedData,
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

    return createErrorResponse("Internal server error", 500);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const event = await getEventById(eventId);
    if (!event) {
      return createErrorResponse("Event not found", 404);
    }

    return NextResponse.json(event, { status: 200 });
  } catch (error) {
    console.error("Error fetching event:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
