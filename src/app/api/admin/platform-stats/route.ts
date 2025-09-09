import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { fromKobo } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get period from query params
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Get platform financial statistics with date filtering
    const [
      totalRevenue,
      totalPlatformFees,
      totalOrganizerAmount,
      totalPayouts,
      pendingObligations,
      cashFlowData,
    ] = await Promise.all([
      // Total revenue from all completed payments that have tickets (filtered by period)
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
      }),

      // Total platform fees from all completed payments that have tickets (filtered by period)
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { platformFee: true },
      }),

      // Total Organizer fees from all completed payments that have tickets (filtered by period)
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { organizerAmount: true },
      }),

      // Total payouts completed (filtered by period)
      db.payout.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { amount: true },
      }),

      // Pending withdrawal obligations (all time for accuracy)
      db.payout.aggregate({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { amount: true },
      }),

      // Cash flow data for chart
      getCashFlowData(startDate, endDate, period),
    ]);

    // Convert from kobo to naira and calculate platform balance
    const totalRevenueNaira = fromKobo(totalRevenue._sum.amount || 0);
    const totalPlatformFeesNaira = fromKobo(
      totalPlatformFees._sum.platformFee || 0
    );
    const totalOrganizerAmountNaira = fromKobo(
      totalOrganizerAmount._sum.organizerAmount || 0
    );
    const totalPayoutsNaira = fromKobo(totalPayouts._sum.amount || 0);
    const pendingObligationsNaira = fromKobo(
      pendingObligations._sum.amount || 0
    );

    const platformBalance =
      totalPlatformFeesNaira - totalPayoutsNaira - pendingObligationsNaira;

    return NextResponse.json({
      totalRevenue: totalRevenueNaira,
      totalPlatformFees: totalPlatformFeesNaira,
      totalOrganizerAmount: totalOrganizerAmountNaira,
      totalPayouts: totalPayoutsNaira,
      pendingObligations: pendingObligationsNaira,
      platformBalance: Math.max(0, platformBalance),
      cashFlowData,
      currency: "NGN",
      period,
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    );
  }
}

// Helper function to get cash flow data
async function getCashFlowData(startDate: Date, endDate: Date, period: number) {
  // Determine the grouping interval based on period
  let groupBy: "day" | "week" | "month";
  if (period <= 7) {
    groupBy = "day";
  } else if (period <= 90) {
    groupBy = "week";
  } else {
    groupBy = "month";
  }

  // Get daily revenue data
  const revenueData = await db.payment.groupBy({
    by: ["createdAt"],
    where: {
      status: "COMPLETED",
      tickets: { some: {} },
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      platformFee: true,
      amount: true,
    },
  });

  // Get daily payout data
  const payoutData = await db.payout.groupBy({
    by: ["createdAt"],
    where: {
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: {
      amount: true,
    },
  });

  // Process and group the data
  const cashFlow = processTimeSeriesData(
    revenueData,
    payoutData,
    startDate,
    endDate,
    groupBy
  );

  return cashFlow;
}

function processTimeSeriesData(
  revenueData: any[],
  payoutData: any[],
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month"
) {
  const result = [];
  const current = new Date(startDate);

  // Create revenue and payout maps for quick lookup
  const revenueMap = new Map();
  const payoutMap = new Map();

  revenueData.forEach((item) => {
    const date = new Date(item.createdAt).toDateString();
    revenueMap.set(date, {
      revenue: fromKobo(item._sum.amount || 0),
      platformFees: fromKobo(item._sum.platformFee || 0),
    });
  });

  payoutData.forEach((item) => {
    const date = new Date(item.createdAt).toDateString();
    payoutMap.set(date, fromKobo(item._sum.amount || 0));
  });

  // Generate time series
  while (current <= endDate) {
    const dateKey = current.toDateString();
    const revenue = revenueMap.get(dateKey)?.revenue || 0;
    const platformFees = revenueMap.get(dateKey)?.platformFees || 0;
    const payouts = payoutMap.get(dateKey) || 0;
    const netCashFlow = platformFees - payouts;

    result.push({
      date: formatDateForChart(current, groupBy),
      revenue,
      platformFees,
      payouts,
      netCashFlow,
    });

    // Increment based on groupBy
    if (groupBy === "day") {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === "week") {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return result;
}

function formatDateForChart(
  date: Date,
  groupBy: "day" | "week" | "month"
): string {
  if (groupBy === "day") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } else if (groupBy === "week") {
    return `Week of ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
}
