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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get platform financial statistics
    const [
      totalRevenue,
      totalPlatformFees,
      totalOrganizerAmount,
      totalPayouts,
      pendingObligations,
    ] = await Promise.all([
      // Total revenue from all completed payments that have tickets
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
        },
        _sum: { amount: true },
      }),

      // Total platform fees from all completed payments that have tickets
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
        },
        _sum: { platformFee: true },
      }),

      //Total Organizer fees from all completed payments that have tickets
      db.payment.aggregate({
        where: {
          status: "COMPLETED",
          tickets: {
            some: {},
          },
        },
        _sum: { organizerAmount: true },
      }),

      // Total payouts completed
      db.payout.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),

      // Pending withdrawal obligations
      db.payout.aggregate({
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { amount: true },
      }),
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
      platformBalance: Math.max(0, platformBalance), // Ensure non-negative
      currency: "NGN",
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    );
  }
}
