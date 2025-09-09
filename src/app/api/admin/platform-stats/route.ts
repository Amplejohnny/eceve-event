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
    const periodParam = searchParams.get("period") || "all";

    // Calculate date range
    let startDate: Date;
    const endDate = new Date();

    if (periodParam === "all") {
      startDate = new Date("2025-08-01");
    } else {
      const periodDays = parseInt(periodParam);
      startDate = new Date();
      startDate.setDate(endDate.getDate() - periodDays);
    }

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
      getCashFlowData(startDate, endDate, periodParam),
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
      period: periodParam,
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
async function getCashFlowData(startDate: Date, endDate: Date, period: string) {
  // Determine the grouping interval based on period
  let groupBy: "day" | "week" | "month";

  if (period === "all") {
    groupBy = "month";
  } else {
    const periodDays = parseInt(period);
    if (periodDays <= 7) {
      groupBy = "day";
    } else if (periodDays <= 90) {
      groupBy = "week";
    } else {
      groupBy = "month";
    }
  }

  // Get revenue data without groupBy
  const revenueData = await db.payment.findMany({
    where: {
      status: "COMPLETED",
      tickets: { some: {} },
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
      amount: true,
      platformFee: true,
      organizerAmount: true,
    },
  });

  // Get payout data without groupBy
  const payoutData = await db.payout.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      createdAt: true,
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
  revenueData: {
    createdAt: Date;
    amount: number;
    platformFee: number;
    organizerAmount: number;
  }[],
  payoutData: { createdAt: Date; amount: number }[],
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month"
) {
  const result = [];

  // Create maps for aggregated data by the groupBy period
  const revenueMap = new Map<
    string,
    {
      revenue: number;
      platformFees: number;
      organizerAmount: number;
    }
  >();
  const payoutMap = new Map<string, number>();

  // Process revenue data and group by period
  revenueData.forEach((item) => {
    const date = new Date(item.createdAt);
    const groupKey = getGroupKey(date, groupBy);

    if (!revenueMap.has(groupKey)) {
      revenueMap.set(groupKey, {
        revenue: 0,
        platformFees: 0,
        organizerAmount: 0,
      });
    }

    const existing = revenueMap.get(groupKey)!;
    revenueMap.set(groupKey, {
      revenue: existing.revenue + fromKobo(item.amount || 0),
      platformFees: existing.platformFees + fromKobo(item.platformFee || 0),
      organizerAmount:
        existing.organizerAmount + fromKobo(item.organizerAmount || 0),
    });
  });

  // Process payout data and group by period
  payoutData.forEach((item) => {
    const date = new Date(item.createdAt);
    const groupKey = getGroupKey(date, groupBy);

    if (!payoutMap.has(groupKey)) {
      payoutMap.set(groupKey, 0);
    }

    payoutMap.set(
      groupKey,
      payoutMap.get(groupKey)! + fromKobo(item.amount || 0)
    );
  });

  // Generate time series with proper intervals
  const current = new Date(startDate);
  const processedKeys = new Set<string>();

  while (current <= endDate) {
    const groupKey = getGroupKey(current, groupBy);

    // Only add each group key once to avoid duplicates
    if (!processedKeys.has(groupKey)) {
      processedKeys.add(groupKey);

      const revenue = revenueMap.get(groupKey)?.revenue || 0;
      const platformFees = revenueMap.get(groupKey)?.platformFees || 0;
      const organizerAmount = revenueMap.get(groupKey)?.organizerAmount || 0;
      const payouts = payoutMap.get(groupKey) || 0;
      const netCashFlow = revenue - organizerAmount - payouts;

      result.push({
        date: formatDateForChart(current, groupBy),
        revenue,
        platformFees,
        payouts,
        netCashFlow,
      });
    }

    // Increment based on groupBy
    if (groupBy === "day") {
      current.setDate(current.getDate() + 1);
    } else if (groupBy === "week") {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  // Sort results by date to ensure proper chronological order
  result.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

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

function getGroupKey(date: Date, groupBy: "day" | "week" | "month"): string {
  if (groupBy === "day") {
    return date.toDateString();
  } else if (groupBy === "week") {
    // Get the Monday of the week
    const monday = new Date(date);
    monday.setDate(date.getDate() - date.getDay() + 1);
    return monday.toDateString();
  } else {
    // Group by month and year
    return `${date.getFullYear()}-${date.getMonth()}`;
  }
}
