import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import type { Prisma, TicketStatus } from "@/generated/prisma";
import { fromKobo } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const eventId = searchParams.get("eventId");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const ticketTypeId = searchParams.get("ticketTypeId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Prisma.TicketWhereInput = {
      event: { organizerId: userId },
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    if (status) {
      whereClause.status = status as TicketStatus;
    }

    if (ticketTypeId) {
      whereClause.ticketTypeId = ticketTypeId;
    }

    if (search) {
      whereClause.OR = [
        {
          attendeeName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          attendeeEmail: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          confirmationId: {
            contains: search.toUpperCase(),
          },
        },
      ];
    }

    // Build order by clause
    const orderBy: Prisma.TicketOrderByWithRelationInput =
      sortBy === "name"
        ? { attendeeName: sortOrder }
        : sortBy === "email"
        ? { attendeeEmail: sortOrder }
        : sortBy === "date"
        ? { createdAt: sortOrder }
        : sortBy === "price"
        ? { price: sortOrder }
        : { createdAt: sortOrder };

    // Get tickets with pagination
    const [tickets, totalCount] = await Promise.all([
      db.ticket.findMany({
        where: whereClause,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              date: true,
            },
          },
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          payment: {
            select: {
              paystackRef: true,
              paidAt: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.ticket.count({ where: whereClause }),
    ]);

    // Transform data for response
    const attendees = tickets.map((ticket) => ({
      id: ticket.id,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      attendeePhone: ticket.attendeePhone,
      confirmationId: ticket.confirmationId,
      quantity: ticket.quantity,
      price: fromKobo(ticket.price),
      status: ticket.status,
      purchaseDate: ticket.createdAt,
      usedAt: ticket.usedAt,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        slug: ticket.event.slug,
        date: ticket.event.date,
      },
      ticketType: {
        id: ticket.ticketType.id,
        name: ticket.ticketType.name,
        currentPrice: fromKobo(ticket.ticketType.price),
      },
      payment: ticket.payment
        ? {
            reference: ticket.payment.paystackRef,
            paidAt: ticket.payment.paidAt,
          }
        : null,
    }));

    // Get summary statistics
    const summary = await db.ticket.groupBy({
      by: ["status"],
      where: { event: { organizerId: userId } },
      _count: { _all: true },
    });

    const statusCounts: Record<string, number> = {};
    summary.forEach((item) => {
      statusCounts[item.status] = item._count._all;
    });

    return NextResponse.json({
      attendees,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        total: totalCount,
        statusCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching attendees:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}
