import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // GET STATUS FILTER FROM QUERY PARAMS
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    // BUILD WHERE CLAUSE WITH OPTIONAL STATUS FILTERING
    const whereClause: any = {};
    if (statusFilter && statusFilter.trim() !== "") {
      whereClause.status = statusFilter;
    }

    const events = await db.event.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        eventType: true,
        date: true,
        status: true,
        organizer: {
          select: {
            name: true,
            email: true,
          },
        },
        tickets: {
          where: { status: { in: ["ACTIVE", "USED"] } },
          select: {
            quantity: true,
            price: true,
          },
        },
        payments: {
          where: {
            status: "COMPLETED",
            tickets: {
              some: {},
            },
          },
          select: {
            amount: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const eventsWithMetrics = events.map((event) => {
      const ticketsSold = event.tickets.reduce((sum, ticket) => {
        return sum + ticket.quantity;
      }, 0);

      const totalRevenue = event.payments.reduce((sum, payment) => {
        return sum + payment.amount;
      }, 0);

      return {
        id: event.id,
        title: event.title,
        eventType: event.eventType,
        date: event.date,
        status: event.status,
        organizer: {
          name: event.organizer.name || "Unknown",
          email: event.organizer.email,
        },
        ticketsSold,
        totalRevenue,
      };
    });

    return NextResponse.json({
      events: eventsWithMetrics,
    });
  } catch (error) {
    console.error("Error fetching admin events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
