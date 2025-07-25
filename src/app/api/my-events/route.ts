import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";

// Type for event with all required relations
type EventWithRelations = {
  id: string;
  title: string;
  date: Date;
  location: string;
  venue: string | null;
  imageUrl: string | null;
  status: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number | null; // Allow null as per schema
    _count: {
      tickets: number;
    };
  }>;
  _count: {
    tickets: number;
  };
};

// Helper function to get event status based on event data
function getEventStatusForFiltering(
  event: EventWithRelations,
  currentDate: Date
): string {
  const eventDate = new Date(event.date);

  if (event.status === "CANCELLED") return "cancelled";
  if (event.status === "COMPLETED") return "completed";
  if (event.status === "SUSPENDED") return "suspended";
  if (event.status === "DRAFT") return "draft";
  if (eventDate < currentDate) return "completed";
  return "active";
}

// GET - Fetch organizer's events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user exists and is verified
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        emailVerified: true,
        isActive: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Email verification required" },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Check if user is an organizer
    if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Organizer access required" },
        { status: 403 }
      );
    }

    // Get URL search params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build base where clause with proper typing
    const baseWhere: Prisma.EventWhereInput = {
      organizerId: session.user.id,
    };

    // Apply server-side filtering based on status
    const currentDate = new Date();

    let whereClause: Prisma.EventWhereInput = baseWhere;

    if (status && status !== "all") {
      switch (status) {
        case "cancelled":
          whereClause = {
            ...baseWhere,
            status: "CANCELLED",
          };
          break;
        case "completed":
          whereClause = {
            ...baseWhere,
            OR: [
              { status: "COMPLETED" },
              {
                AND: [{ status: "ACTIVE" }, { date: { lt: currentDate } }],
              },
            ],
          };
          break;
        case "suspended":
          whereClause = {
            ...baseWhere,
            status: "SUSPENDED",
          };
          break;
        case "draft":
          whereClause = {
            ...baseWhere,
            status: "DRAFT",
          };
          break;
        case "active":
          whereClause = {
            ...baseWhere,
            AND: [{ status: "ACTIVE" }, { date: { gte: currentDate } }],
          };
          break;
      }
    }

    // Fetch organizer's events with proper relations
    const events = await db.event.findMany({
      where: whereClause,
      include: {
        ticketTypes: {
          select: {
            id: true,
            name: true,
            price: true,
            quantity: true,
            _count: {
              select: {
                tickets: {
                  where: {
                    status: "ACTIVE", // Only count active tickets as sold
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            tickets: {
              where: {
                status: "ACTIVE",
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination with same filtering
    const totalEvents = await db.event.count({
      where: whereClause,
    });

    // Transform events to match the expected format
    const transformedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.toISOString(),
      location: event.location,
      venue: event.venue,
      imageUrl: event.imageUrl,
      status: event.status,
      slug: event.slug,
      // Add computed display status to avoid client-side calculation
      displayStatus: getEventStatusForFiltering(event, currentDate),
      ticketTypes: event.ticketTypes.map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: ticketType.quantity, // Can be null
        sold: ticketType._count.tickets, // Automatically calculated from actual tickets
      })),
      totalTicketsSold: event._count.tickets,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        events: transformedEvents,
        pagination: {
          total: totalEvents,
          limit,
          offset,
          hasMore: offset + limit < totalEvents,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching organizer events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
