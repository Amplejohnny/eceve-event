import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { computeEventEffectiveEnd } from "@/lib/event";

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    const candidates = await db.event.findMany({
      where: {
        status: { in: ["ACTIVE", "DRAFT"] },
        date: { lte: now },
      },
      select: {
        id: true,
        date: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      take: 2000,
    });

    const idsToComplete: string[] = [];

    for (const ev of candidates) {
      const effectiveEnd = computeEventEffectiveEnd({
        date: ev.date,
        endDate: ev.endDate,
        startTime: ev.startTime,
        endTime: ev.endTime,
        status: ev.status as any,
      });
      if (effectiveEnd.getTime() < now.getTime()) {
        idsToComplete.push(ev.id);
      }
    }

    let updated = 0;
    if (idsToComplete.length > 0) {
      const res = await db.event.updateMany({
        where: {
          id: { in: idsToComplete },
          status: { in: ["ACTIVE", "DRAFT"] },
        },
        data: { status: "COMPLETED" },
      });
      updated = res.count;
    }

    return NextResponse.json({
      checked: candidates.length,
      completed: updated,
    });
  } catch (error) {
    console.error("Admin update events failed:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
