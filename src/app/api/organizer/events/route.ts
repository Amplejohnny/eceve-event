import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { fromKobo } from "@/lib/utils";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch events with attendee counts and revenue
    const events = await db.event.findMany({
      where: {
        organizerId: userId,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        date: true,
        createdAt: true,
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
      orderBy: {
        date: "desc",
      },
    });

    // Get revenue for each event
    const eventsWithRevenue = await Promise.all(
      events.map(async (event) => {
        const revenueResult = await db.ticket.aggregate({
          where: {
            eventId: event.id,
            status: {
              in: ["ACTIVE", "USED"],
            },
          },
          _sum: {
            price: true,
          },
        });

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          date: event.date,
          attendeeCount: event._count.tickets,
          totalRevenue: fromKobo(revenueResult._sum.price || 0),
        };
      })
    );

    return NextResponse.json({
      events: eventsWithRevenue,
    });
  } catch (error) {
    console.error("Error fetching organizer events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
