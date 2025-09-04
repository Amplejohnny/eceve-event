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

    // Get platform financial statistics
    const [totalRevenue, totalPlatformFees, totalPayouts, pendingObligations] =
      await Promise.all([
        // Total revenue from all completed payments
        db.payment.aggregate({
          where: { status: "COMPLETED" },
          _sum: { amount: true },
        }),

        // Total platform fees from all completed payments
        db.payment.aggregate({
          where: { status: "COMPLETED" },
          _sum: { platformFee: true },
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

    const platformBalance =
      (totalPlatformFees._sum.platformFee || 0) -
      (totalPayouts._sum.amount || 0) -
      (pendingObligations._sum.amount || 0);

    return NextResponse.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalPlatformFees: totalPlatformFees._sum.platformFee || 0,
      totalPayouts: totalPayouts._sum.amount || 0,
      pendingObligations: pendingObligations._sum.amount || 0,
      platformBalance: Math.max(0, platformBalance), // Ensure non-negative
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch platform stats" },
      { status: 500 }
    );
  }
}
