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

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      organizerId: userId,
    };

    if (status) {
      whereClause.status = status;
    }

    // Build order by clause
    const orderBy: any = {};
    switch (sortBy) {
      case "amount":
        orderBy.amount = sortOrder;
        break;
      case "status":
        orderBy.status = sortOrder;
        break;
      case "processedAt":
        orderBy.processedAt = sortOrder;
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Get withdrawals with pagination
    const [withdrawals, totalCount] = await Promise.all([
      db.payout.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      db.payout.count({ where: whereClause }),
    ]);

    // Get summary statistics
    const summary = await db.payout.groupBy({
      by: ["status"],
      where: { organizerId: userId },
      _sum: { amount: true },
      _count: true,
    });

    const statusSummary = summary.reduce((acc, item) => {
      acc[item.status] = {
        count: item._count,
        totalAmount: item._sum.amount || 0,
      };
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    // Calculate total amounts
    const totalWithdrawn = await db.payout.aggregate({
      where: {
        organizerId: userId,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    });

    const pendingAmount = await db.payout.aggregate({
      where: {
        organizerId: userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      withdrawals: withdrawals.map((withdrawal) => ({
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bankAccount: withdrawal.bankAccount,
        bankCode: withdrawal.bankCode,
        accountName: withdrawal.accountName,
        reason: withdrawal.reason,
        paystackRef: withdrawal.paystackRef,
        transferCode: withdrawal.transferCode,
        failureReason: withdrawal.failureReason,
        createdAt: withdrawal.createdAt,
        processedAt: withdrawal.processedAt,
        updatedAt: withdrawal.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalWithdrawn: totalWithdrawn._sum.amount || 0,
        pendingAmount: pendingAmount._sum.amount || 0,
        statusSummary,
      },
    });
  } catch (error) {
    console.error("Error fetching withdrawals:", error);
    return NextResponse.json(
      { error: "Failed to fetch withdrawals" },
      { status: 500 }
    );
  }
}
