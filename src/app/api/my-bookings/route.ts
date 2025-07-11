import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

// GET - Fetch user's bookings
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

    // Get URL search params for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause for filtering
    const whereClause: any = {
      userId: session.user.id,
    };

    if (status && status !== "all") {
      whereClause.status = status.toUpperCase();
    }

    // Fetch user's tickets with event and ticket type details
    const tickets = await db.ticket.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            venue: true,
            imageUrl: true,
            status: true,
            slug: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true, // Current price from ticket type
          },
        },
        payment: {
          select: {
            id: true,
            paystackRef: true,
            status: true,
            paidAt: true,
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
    const totalTickets = await db.ticket.count({
      where: whereClause,
    });

    // Transform tickets to match the expected format
    const transformedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      eventId: ticket.eventId,
      ticketType: {
        id: ticket.ticketType.id,
        name: ticket.ticketType.name,
        currentPrice: ticket.ticketType.price, // Current price from ticket type
      },
      price: ticket.price, // Price paid at time of purchase
      quantity: ticket.quantity,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      attendeePhone: ticket.attendeePhone,
      confirmationId: ticket.confirmationId,
      qrCode: ticket.qrCode,
      notes: ticket.notes,
      status: ticket.status,
      usedAt: ticket.usedAt?.toISOString() || null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        date: ticket.event.date.toISOString(),
        location: ticket.event.location,
        venue: ticket.event.venue,
        imageUrl: ticket.event.imageUrl,
        status: ticket.event.status,
        slug: ticket.event.slug,
      },
      payment: ticket.payment
        ? {
            id: ticket.payment.id,
            paystackRef: ticket.payment.paystackRef,
            status: ticket.payment.status,
            paidAt: ticket.payment.paidAt?.toISOString() || null,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tickets: transformedTickets,
        pagination: {
          total: totalTickets,
          limit,
          offset,
          hasMore: offset + limit < totalTickets,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
