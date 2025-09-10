import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

interface EventWithRelations {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  date: Date;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  venue: string | null;
  address: string | null;
  tags: string[];
  category: string | null;
  imageUrl: string | null;
  isPublic: boolean;
  status: string;
  slug: string;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number | null;
  }>;
  organizer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

// Helper functions
const createErrorResponse = (message: string, status: number) => {
  return NextResponse.json({ error: message }, { status });
};

const isValidUUID = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    id
  );
};

const isValidCuid = (id: string): boolean => {
  return /^c[a-z0-9]{24}$/i.test(id);
};

const looksLikeId = (identifier: string): boolean => {
  return isValidUUID(identifier) || isValidCuid(identifier);
};

const transformEventDataWithCounts = (
  event: EventWithRelations,
  soldCountMap: Record<string, number>
) => {
  const transformed = {
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
      quantity: ticket.quantity,
      soldCount: soldCountMap[ticket.id] || 0, // Get sold count from the map
    })),
    organizer: event.organizer
      ? {
          id: event.organizer.id,
          name: event.organizer.name,
          email: event.organizer.email,
          image: event.organizer.image,
        }
      : null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  } as any;

  return transformed;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    if (!eventId) {
      return createErrorResponse("Event ID is required", 400);
    }

    const searchById = looksLikeId(eventId);

    // First get the event
    const event = await db.event.findUnique({
      where: searchById ? { id: eventId } : { slug: eventId },
      include: {
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!event) {
      const errorMessage = searchById
        ? "Event not found with the provided ID"
        : "Event not found with the provided slug";
      return createErrorResponse(errorMessage, 404);
    }

    // Now get sold ticket counts for each ticket type for this event
    const soldTicketCounts = await db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: {
        eventId: event.id,
        status: "ACTIVE", // Make sure this status exists in your data
      },
      _count: {
        id: true,
      },
    });

    // Create a map for quick lookup
    const soldCountMap = soldTicketCounts.reduce((acc, item) => {
      acc[item.ticketTypeId] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    const transformedEvent = transformEventDataWithCounts(event, soldCountMap);

    // Optionally include sales info
    const url = new URL(request.url);
    const withSales = url.searchParams.get("withSales");
    if (withSales === "1") {
      const [ticketsCount, paymentsCount] = await Promise.all([
        db.ticket.count({
          where: { eventId: event.id, status: { in: ["ACTIVE", "USED"] } },
        }),
        db.payment.count({ where: { eventId: event.id, status: "COMPLETED" } }),
      ]);
      (transformedEvent as any).sales = {
        tickets: ticketsCount,
        completedPayments: paymentsCount,
      };
    }

    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error("API Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("connection")) {
        return createErrorResponse("Database connection error", 503);
      }
      if (error.message.includes("Invalid")) {
        return createErrorResponse("Invalid event ID format", 400);
      }
    }

    return createErrorResponse("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (!eventId) {
      return createErrorResponse("Event ID is required", 400);
    }

    const searchById = looksLikeId(eventId);

    const event = await db.event.findUnique({
      where: searchById ? { id: eventId } : { slug: eventId },
      select: { id: true, organizerId: true },
    });

    if (!event) {
      return createErrorResponse("Event not found", 404);
    }

    if (event.organizerId !== session.user.id) {
      return createErrorResponse(
        "Forbidden: Only the organizer can delete",
        403
      );
    }

    // Check for existing tickets/payments (purchases)
    const [ticketsCount, paymentsCount] = await Promise.all([
      db.ticket.count({
        where: { eventId: event.id, status: { in: ["ACTIVE", "USED"] } },
      }),
      db.payment.count({ where: { eventId: event.id, status: "COMPLETED" } }),
    ]);

    const hasSales = ticketsCount > 0 || paymentsCount > 0;

    if (hasSales) {
      // Soft delete: keep records for audit; hide and cancel the event
      await db.event.update({
        where: { id: event.id },
        data: { status: "CANCELLED", isPublic: false },
      });
      return NextResponse.json({ success: true, softDeleted: true });
    }

    // No sales: hard delete everything related then the event
    await db.$transaction([
      db.eventFavorite.deleteMany({ where: { eventId: event.id } }),
      db.ticket.deleteMany({ where: { eventId: event.id } }),
      db.payment.deleteMany({ where: { eventId: event.id } }),
      db.ticketType.deleteMany({ where: { eventId: event.id } }),
      db.event.delete({ where: { id: event.id } }),
    ]);

    return NextResponse.json({ success: true, softDeleted: false });
  } catch (error) {
    console.error("Delete event error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
