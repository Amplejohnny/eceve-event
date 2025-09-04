import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all organizers with their performance metrics
    const organizers = await db.user.findMany({
      where: { role: "ORGANIZER" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        events: {
          select: {
            id: true,
            payments: {
              where: { status: "COMPLETED" },
              select: {
                amount: true,
                organizerAmount: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate metrics for each organizer
    const organizersWithMetrics = organizers.map((organizer) => {
      const eventsCount = organizer.events.length;
      const totalRevenue = organizer.events.reduce((sum, event) => {
        return (
          sum +
          event.payments.reduce((paymentSum, payment) => {
            return paymentSum + payment.amount;
          }, 0)
        );
      }, 0);

      return {
        id: organizer.id,
        name: organizer.name || "Unknown",
        email: organizer.email,
        isActive: organizer.isActive,
        createdAt: organizer.createdAt,
        eventsCount,
        totalRevenue,
      };
    });

    return NextResponse.json({
      organizers: organizersWithMetrics,
    });
  } catch (error) {
    console.error("Error fetching admin organizers:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}
