import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
// import { calculatePaymentBreakdown } from "@/lib/payment-utils";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all events by this organizer
    const events = await db.event.findMany({
      where: { organizerId: userId },
      include: {
        payments: {
          where: { status: "COMPLETED" },
          include: { tickets: true },
        },
      },
    });

    // Calculate earnings from completed payments
    let totalRevenue = 0;
    let totalEarnings = 0;
    let totalPlatformFees = 0;

    events.forEach((event) => {
      event.payments.forEach((payment) => {
        totalRevenue += payment.amount;
        totalEarnings += payment.organizerAmount;
        totalPlatformFees += payment.platformFee;
      });
    });

    // Get pending withdrawals
    const pendingWithdrawals = await db.payout.aggregate({
      where: {
        organizerId: userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amount: true },
    });

    const pendingAmount = pendingWithdrawals._sum.amount || 0;
    const availableBalance = totalEarnings - pendingAmount;

    // Get recent earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await db.payment.findMany({
      where: {
        event: { organizerId: userId },
        status: "COMPLETED",
        paidAt: { gte: thirtyDaysAgo },
      },
    });

    const recentEarnings = recentPayments.reduce((sum, payment) => {
      return sum + payment.organizerAmount;
    }, 0);

    // Get monthly earnings for the last 6 months
    const monthlyEarnings = await db.payment.groupBy({
      by: ["paidAt"],
      where: {
        event: { organizerId: userId },
        status: "COMPLETED",
        paidAt: { gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { organizerAmount: true },
    });

    const monthlyData = monthlyEarnings.reduce((acc, payment) => {
      const month = payment.paidAt?.toISOString().slice(0, 7); // YYYY-MM format
      if (month) {
        acc[month] = (acc[month] || 0) + (payment._sum.organizerAmount || 0);
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalRevenue,
      totalEarnings,
      totalPlatformFees,
      availableBalance,
      pendingWithdrawals: pendingAmount,
      recentEarnings,
      monthlyData,
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
