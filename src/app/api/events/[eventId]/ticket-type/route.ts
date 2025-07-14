import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "....../generated/prisma";
import { getEventById } from "@/lib/event";
import { EventType } from "@/generated/prisma";
import { z } from "zod";

const updateTicketsSchema = z.object({
  ticketTypes: z
    .array(
      z.object({
        id: z.string().optional(), // Optional for new tickets
        name: z.string().min(1, "Ticket name is required"),
        price: z.number().min(0, "Ticket price must be non-negative"),
        quantity: z.number().min(1, "Ticket quantity must be greater than 0"),
      })
    )
    .min(1, "At least one ticket type is required"),
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

    // Check if event has started or has ticket sales
    if (existingEvent.date < new Date()) {
      return NextResponse.json(
        { error: "Cannot update tickets for events that have already started" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateTicketsSchema.parse(body);

    // Validate ticket types based on event type
    if (existingEvent.eventType === EventType.FREE) {
      const hasNonZeroPrice = validatedData.ticketTypes.some(
        (ticket) => ticket.price > 0
      );
      if (hasNonZeroPrice) {
        return NextResponse.json(
          { error: "Free events cannot have paid ticket types" },
          { status: 400 }
        );
      }
    }

    if (existingEvent.eventType === EventType.PAID) {
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

    // Use a transaction to update tickets
    const updatedEvent = await prisma.$transaction(async (tx) => {
      // Get existing ticket types
      const existingTickets = await tx.ticketType.findMany({
        where: { eventId },
      });

      const existingTicketIds = existingTickets.map((t) => t.id);
      const incomingTicketIds = validatedData.ticketTypes
        .filter((t) => t.id)
        .map((t) => t.id!);

      // Delete tickets that are no longer in the list
      const ticketsToDelete = existingTicketIds.filter(
        (id) => !incomingTicketIds.includes(id)
      );

      if (ticketsToDelete.length > 0) {
        await tx.ticketType.deleteMany({
          where: {
            id: { in: ticketsToDelete },
            eventId,
          },
        });
      }

      // Update or create tickets
      for (const ticket of validatedData.ticketTypes) {
        if (ticket.id) {
          // Update existing ticket
          await tx.ticketType.update({
            where: { id: ticket.id },
            data: {
              name: ticket.name,
              price: ticket.price,
              quantity: ticket.quantity,
            },
          });
        } else {
          // Create new ticket
          await tx.ticketType.create({
            data: {
              name: ticket.name,
              price: ticket.price,
              quantity: ticket.quantity,
              eventId,
            },
          });
        }
      }

      // Return updated event with ticket types
      return await tx.event.findUnique({
        where: { id: eventId },
        include: { ticketTypes: true },
      });
    });

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error("Error updating event tickets:", error);

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
