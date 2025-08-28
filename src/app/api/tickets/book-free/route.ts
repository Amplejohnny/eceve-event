import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { TicketStatus, Event, TicketType, User } from "@/generated/prisma";
import { sendTicketConfirmation } from "@/lib/email";
import { db } from "@/lib/db";
import { generateConfirmationId, formatDate, formatTime } from "@/lib/utils";
import { freeTicketBookingSchema } from "@/lib/validation";
import { ZodError } from "zod";

interface EventWithRelations extends Event {
  ticketTypes: TicketType[];
  organizer: User;
}

interface TicketCreateData {
  eventId: string;
  ticketTypeId: string;
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  confirmationId: string;
  status: TicketStatus;
}

interface EmailGroup {
  email: string;
  name: string;
  tickets: Array<{
    ticketType: string;
    confirmationId: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = freeTicketBookingSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid input data",
            errors: error.errors.map(
              (e) => `${e.path.join(".")}: ${e.message}`
            ),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { eventId, tickets } = validatedData;

    // Validate event exists and is free
    const event = (await db.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        organizer: true,
      },
    })) as EventWithRelations | null;

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (event.eventType !== "FREE") {
      return NextResponse.json(
        { success: false, message: "This is not a free event" },
        { status: 400 }
      );
    }

    // Validate ticket types and availability
    for (const ticket of tickets) {
      // Validate required fields
      if (
        !ticket.ticketTypeId ||
        !ticket.attendeeName ||
        !ticket.attendeeEmail
      ) {
        return NextResponse.json(
          { success: false, message: "Missing required ticket information" },
          { status: 400 }
        );
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ticket.attendeeEmail)) {
        return NextResponse.json(
          { success: false, message: "Invalid email address" },
          { status: 400 }
        );
      }

      const ticketType = event.ticketTypes.find(
        (t) => t.id === ticket.ticketTypeId
      );

      if (!ticketType) {
        return NextResponse.json(
          {
            success: false,
            message: `Ticket type not found: ${ticket.ticketTypeId}`,
          },
          { status: 400 }
        );
      }

      if (ticketType.price !== 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Ticket type ${ticketType.name} is not free`,
          },
          { status: 400 }
        );
      }

      // For free events, limit to 1 ticket per type per email
      if (ticket.quantity > 1) {
        return NextResponse.json(
          { success: false, message: "Only 1 free ticket allowed per person" },
          { status: 400 }
        );
      }

      // Check if user already has a ticket for this event
      const existingTicket = await db.ticket.findFirst({
        where: {
          eventId,
          attendeeEmail: ticket.attendeeEmail,
          status: { in: ["ACTIVE", "USED"] },
        },
      });

      if (existingTicket) {
        return NextResponse.json(
          {
            success: false,
            message: "You already have a ticket for this event",
          },
          { status: 400 }
        );
      }

      // Check availability if quantity is limited
      if (ticketType.quantity) {
        const soldTickets = await db.ticket.count({
          where: {
            ticketTypeId: ticket.ticketTypeId,
            status: { in: ["ACTIVE", "USED"] },
          },
        });

        if (soldTickets >= ticketType.quantity) {
          return NextResponse.json(
            {
              success: false,
              message: `No more tickets available for ${ticketType.name}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Create tickets
    const ticketsToCreate: TicketCreateData[] = [];
    const confirmationIds: string[] = [];

    for (const ticketOrder of tickets) {
      const confirmationId = generateConfirmationId();
      confirmationIds.push(confirmationId);

      ticketsToCreate.push({
        eventId,
        ticketTypeId: ticketOrder.ticketTypeId,
        price: 0, // Free ticket
        quantity: ticketOrder.quantity,
        attendeeName: ticketOrder.attendeeName,
        attendeeEmail: ticketOrder.attendeeEmail,
        attendeePhone: ticketOrder.attendeePhone || null,
        confirmationId,
        status: "ACTIVE" as TicketStatus,
      });
    }

    if (ticketsToCreate.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid tickets to create" },
        { status: 400 }
      );
    }

    // Create all tickets in a transaction for atomicity
    const createdTickets = await db.$transaction(async (tx) => {
      return await tx.ticket.createMany({
        data: ticketsToCreate,
      });
    });

    // Send confirmation emails for each unique email
    const emailGroups = groupTicketsByEmail(ticketsToCreate, event);

    const emailPromises = emailGroups.map(async (emailGroup) => {
      try {
        await sendTicketConfirmation({
          attendeeEmail: emailGroup.email,
          attendeeName: emailGroup.name,
          eventTitle: event.title,
          eventDate: formatDate(event.date.toISOString()),
          eventEndDate: event.endDate
            ? formatDate(event.endDate.toISOString())
            : "TBA",
          eventLocation: event.venue || event.location,
          eventTime: formatTime(event.startTime) || "TBA",
          tickets: emailGroup.tickets,
          eventId: event.id,
        });
      } catch (emailError) {
        console.error(
          `Failed to send confirmation email to ${emailGroup.email}:`,
          emailError
        );
      }
    });

    // Send emails concurrently but don't wait for them to complete
    Promise.allSettled(emailPromises).catch((error) => {
      console.error("Error in email sending:", error);
    });

    return NextResponse.json({
      success: true,
      message: "Free tickets booked successfully",
      confirmationIds,
      ticketCount: createdTickets.count,
    });
  } catch (error) {
    console.error("Free ticket booking error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

function groupTicketsByEmail(
  tickets: TicketCreateData[],
  event: EventWithRelations
): EmailGroup[] {
  const groups: Record<string, EmailGroup> = {};

  tickets.forEach((ticket) => {
    if (!groups[ticket.attendeeEmail]) {
      groups[ticket.attendeeEmail] = {
        email: ticket.attendeeEmail,
        name: ticket.attendeeName,
        tickets: [],
      };
    }

    const ticketType = event.ticketTypes.find(
      (t) => t.id === ticket.ticketTypeId
    );

    if (ticketType) {
      groups[ticket.attendeeEmail].tickets.push({
        ticketType: ticketType.name,
        confirmationId: ticket.confirmationId,
        quantity: ticket.quantity,
      });
    }
  });

  return Object.values(groups);
}
