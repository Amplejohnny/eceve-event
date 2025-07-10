import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

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

    // Build where clause for filtering
    const whereClause: any = {
      organizerId: session.user.id,
    };

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase();
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

    // Get total count for pagination
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
      ticketTypes: event.ticketTypes.map((ticketType) => ({
        id: ticketType.id,
        name: ticketType.name,
        price: ticketType.price,
        quantity: ticketType.quantity,
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
        user: {
          id: user.id,
          role: user.role,
        },
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
