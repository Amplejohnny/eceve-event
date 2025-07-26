import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getEventById } from "@/lib/event";
import { EventType } from "@/generated/prisma";
import { z } from "zod";
import { db } from "@/lib/db";

// Helper functions
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

// Schema definition
const updateTicketsSchema = z.object({
  ticketTypes: z
    .array(
      z.object({
        id: z.string().optional(), // Optional for new tickets
        name: z.string().min(1, "Ticket name is required"),
        price: z.number().min(0, "Ticket price must be non-negative"),
        quantity: z
          .number()
          .min(1, "Ticket quantity must be greater than 0")
          .optional(), // Made optional
      })
    )
    .min(1, "At least one ticket type is required"),
});

// Types
type UpdateTicketsData = z.infer<typeof updateTicketsSchema>;

// Validation functions
const validateAuthentication = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: createErrorResponse("Unauthorized", 401) };
  }

  return { userId: session.user.id };
};

const validateEventOwnership = async (eventId: string, userId: string) => {
  const existingEvent = await getEventById(eventId);

  if (!existingEvent) {
    return { error: createErrorResponse("Event not found", 404) };
  }

  if (existingEvent.organizerId !== userId) {
    return { error: createErrorResponse("Forbidden", 403) };
  }

  if (existingEvent.date < new Date()) {
    return {
      error: createErrorResponse(
        "Cannot update tickets for events that have already started",
        400
      ),
    };
  }

  return { event: existingEvent };
};

const validateTicketTypes = (data: UpdateTicketsData, eventType: EventType) => {
  if (eventType === EventType.FREE) {
    const hasNonZeroPrice = data.ticketTypes.some((ticket) => ticket.price > 0);
    if (hasNonZeroPrice) {
      return createErrorResponse(
        "Free events cannot have paid ticket types",
        400
      );
    }
  }

  if (eventType === EventType.PAID) {
    const hasValidPaidTickets = data.ticketTypes.some(
      (ticket) => ticket.price > 0
    );
    if (!hasValidPaidTickets) {
      return createErrorResponse(
        "Paid events must have at least one ticket type with a price greater than 0",
        400
      );
    }
  }

  return null;
};

const handleZodError = (error: z.ZodError) => {
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
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    // Validate authentication
    const authResult = await validateAuthentication();
    if (authResult.error) {
      return authResult.error;
    }
    const { userId } = authResult;

    // Validate event ownership and status
    const eventResult = await validateEventOwnership(eventId, userId);
    if (eventResult.error) {
      return eventResult.error;
    }
    const { event: existingEvent } = eventResult;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateTicketsSchema.parse(body);

    // Validate ticket types based on event type
    const ticketValidationError = validateTicketTypes(
      validatedData,
      existingEvent.eventType
    );
    if (ticketValidationError) {
      return ticketValidationError;
    }

    // Check for tickets that have already been sold before allowing quantity reduction
    const soldTicketsCounts = await db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        eventId,
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
      _count: {
        id: true,
      },
    });

    // Create a map of sold tickets count per ticket type
    const soldCountMap = new Map(
      soldTicketsCounts.map((item) => [item.ticketTypeId, item._count.id])
    );

    // Use a transaction to update tickets
    const updatedEvent = await db.$transaction(async (tx) => {
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

      // Check if we're trying to delete tickets that have been sold
      for (const ticketId of ticketsToDelete) {
        const soldCount = soldCountMap.get(ticketId) || 0;
        if (soldCount > 0) {
          const ticketType = existingTickets.find((t) => t.id === ticketId);
          throw new Error(
            `Cannot delete ticket type "${ticketType?.name}" because ${soldCount} tickets have already been sold`
          );
        }
      }

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
          // For existing tickets, check if new quantity is less than sold tickets
          const soldCount = soldCountMap.get(ticket.id) || 0;
          if (ticket.quantity && ticket.quantity < soldCount) {
            const existingTicket = existingTickets.find(
              (t) => t.id === ticket.id
            );
            throw new Error(
              `Cannot set quantity to ${ticket.quantity} for "${existingTicket?.name}" because ${soldCount} tickets have already been sold`
            );
          }

          // Update existing ticket
          await tx.ticketType.update({
            where: { id: ticket.id },
            data: {
              name: ticket.name,
              price: ticket.price,
              ...(ticket.quantity !== undefined && {
                quantity: ticket.quantity,
              }),
            },
          });
        } else {
          // Create new ticket
          await tx.ticketType.create({
            data: {
              name: ticket.name,
              price: ticket.price,
              eventId,
              ...(ticket.quantity !== undefined && {
                quantity: ticket.quantity,
              }),
            },
          });
        }
      }

      // Return updated event with ticket types
      return await tx.event.findUnique({
        where: { id: eventId },
        include: {
          ticketTypes: {
            include: {
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
          },
        },
      });
    });

    return NextResponse.json(updatedEvent, { status: 200 });
  } catch (error) {
    console.error("Error updating event tickets:", error);

    if (error instanceof z.ZodError) {
      return handleZodError(error);
    }

    // Handle custom validation errors from transaction
    if (error instanceof Error && error.message.includes("Cannot")) {
      return createErrorResponse(error.message, 400);
    }

    return createErrorResponse("Internal server error", 500);
  }
}
