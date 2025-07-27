import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { createEvent } from "@/lib/event";
import { EventType } from "@/generated/prisma";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().min(1, "Event description is required"),
  eventType: z.nativeEnum(EventType),
  date: z.string().transform((str) => new Date(str)),
  endDate: z
    .string()
    .optional()
    .transform((str) => (str ? new Date(str) : undefined)),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  location: z.string().min(1, "Event location is required"),
  venue: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().min(1, "Event category is required"),
  imageUrl: z.string().optional(),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(1, "Ticket name is required"),
        price: z.number().min(0, "Ticket price must be non-negative"),
        quantity: z
          .number()
          .min(1, "Ticket quantity must be greater than 0")
          .optional(), // Made optional
      })
    )
    .min(1, "At least one ticket type is required"),
  slug: z.string().min(1, "Event slug is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    // Additional validation for paid events
    if (validatedData.eventType === EventType.PAID) {
      const hasValidPaidTickets = validatedData.ticketTypes.some(
        (ticket) => ticket.price > 0
      );
      if (!hasValidPaidTickets) {
        return NextResponse.json(
          {
            error:
              "Paid events must have at least one ticket type with a price greater than 0",
          },
          { status: 400 }
        );
      }
    }

    // For free events, ensure all ticket prices are 0
    if (validatedData.eventType === EventType.FREE) {
      validatedData.ticketTypes = validatedData.ticketTypes.map((ticket) => ({
        ...ticket,
        price: 0,
      }));
    }

    // Validate date is not in the past
    if (validatedData.date < new Date()) {
      return NextResponse.json(
        { error: "Event date cannot be in the past" },
        { status: 400 }
      );
    }

    // Validate end date is after start date
    if (validatedData.endDate && validatedData.endDate < validatedData.date) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Validate start time and end time
    if (validatedData.startTime) {
      // Basic time format validation (HH:MM)
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

      if (!timeRegex.test(validatedData.startTime)) {
        return NextResponse.json(
          { error: "Invalid start time format. Use HH:MM format" },
          { status: 400 }
        );
      }

      if (validatedData.endTime) {
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
        const [endHour, endMinute] = validatedData.endTime
          .split(":")
          .map(Number);

        const startTimeMinutes = startHour * 60 + startMinute;
        const endTimeMinutes = endHour * 60 + endMinute;

        if (endTimeMinutes <= startTimeMinutes) {
          return NextResponse.json(
            { error: "End time must be after start time" },
            { status: 400 }
          );
        }
      }
    }

    // Transform ticket types to handle optional quantity
    const transformedTicketTypes = validatedData.ticketTypes.map((ticket) => ({
      name: ticket.name,
      price: ticket.price,
      quantity: ticket.quantity || null, // NULL means unlimited
    }));

    // Use the event library function
    const event = await createEvent({
      ...validatedData,
      ticketTypes: transformedTicketTypes,
      organizerId: session.user.id,
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);

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
