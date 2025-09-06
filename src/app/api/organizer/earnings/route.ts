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

    const userId = session.user.id;

    // Get all events by this organizer with only payments that have tickets
    const events = await db.event.findMany({
      where: { organizerId: userId },
      include: {
        payments: {
          where: {
            status: "COMPLETED",
            tickets: {
              some: {}, // Only include payments that have at least one ticket
            },
          },
          include: { tickets: true },
        },
      },
    });

    // Calculate earnings from completed payments that have tickets only
    let totalTicketRevenue = 0;
    let totalWithdrawableRevenue = 0;
    let totalPlatformFees = 0;

    events.forEach((event) => {
      event.payments.forEach((payment) => {
        // Double-check that payment has tickets (additional safety)
        if (payment.tickets.length > 0) {
          totalTicketRevenue += payment.amount;
          totalWithdrawableRevenue += payment.organizerAmount;
          totalPlatformFees += payment.platformFee;
        }
      });
    });

    // Get pending withdrawals (unchanged)
    const pendingWithdrawals = await db.payout.aggregate({
      where: {
        organizerId: userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amount: true },
    });

    const pendingAmount = pendingWithdrawals._sum.amount || 0;
    const availableBalance = totalWithdrawableRevenue - pendingAmount;

    // Get recent earnings (last 30 days) - only payments with tickets
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await db.payment.findMany({
      where: {
        event: { organizerId: userId },
        status: "COMPLETED",
        paidAt: { gte: thirtyDaysAgo },
        tickets: {
          some: {}, // Only payments with tickets
        },
      },
      include: {
        tickets: true,
      },
    });

    const recentEarnings = recentPayments.reduce((sum, payment) => {
      // Additional check for tickets
      if (payment.tickets.length > 0) {
        return sum + payment.organizerAmount;
      }
      return sum;
    }, 0);

    // Get monthly earnings for the last 6 months - only payments with tickets
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyPayments = await db.payment.findMany({
      where: {
        event: { organizerId: userId },
        status: "COMPLETED",
        paidAt: { gte: sixMonthsAgo },
        tickets: {
          some: {}, // Only payments with tickets
        },
      },
      select: {
        paidAt: true,
        organizerAmount: true,
        tickets: true,
      },
    });

    const monthlyData = monthlyPayments.reduce((acc, payment) => {
      // Additional check for tickets
      if (payment.tickets.length > 0 && payment.paidAt) {
        const month = payment.paidAt.toISOString().slice(0, 7); // YYYY-MM format
        acc[month] = (acc[month] || 0) + (payment.organizerAmount / 100);
      }
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing months with 0 for better chart display
    const currentDate = new Date();
    const sixMonthsAgoDate = new Date();
    sixMonthsAgoDate.setMonth(currentDate.getMonth() - 5); // Last 6 months including current

    const completeMonthlyData: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const date = new Date(sixMonthsAgoDate);
      date.setMonth(sixMonthsAgoDate.getMonth() + i);
      const monthKey = date.toISOString().slice(0, 7);
      completeMonthlyData[monthKey] = monthlyData[monthKey] || 0;
    }

    return NextResponse.json({
      totalTicketRevenue,
      totalWithdrawableRevenue,
      totalPlatformFees,
      availableBalance,
      pendingWithdrawals: pendingAmount,
      recentEarnings,
      monthlyData: completeMonthlyData,
      currency: "NGN",
    });
  } catch (error) {
    console.error("Error fetching organizer earnings:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
