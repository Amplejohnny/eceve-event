import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { computeEventEffectiveEnd } from "@/lib/event";

// Secure this endpoint with a header X-CRON-SECRET that must match env CRON_SECRET
export async function POST(request: NextRequest) {
  try {
    const provided =
      request.headers.get("x-cron-secret") ||
      request.headers.get("X-CRON-SECRET");
    const expected = process.env.CRON_SECRET;

    if (!expected || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // Fetch candidate events: ACTIVE or DRAFT whose potential end could be in the past.
    // We limit by date <= now to reduce set size quickly.
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
      take: 2000, // safety cap
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
    console.error("Failed to update event statuses:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Optional GET for quick manual checks with ?dryRun=1
export async function GET(request: NextRequest) {
  try {
    const provided =
      request.headers.get("x-cron-secret") ||
      request.headers.get("X-CRON-SECRET");
    const expected = process.env.CRON_SECRET;

    if (!expected || provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const candidates = await db.event.findMany({
      where: {
        status: { in: ["ACTIVE", "DRAFT"] },
        date: { lte: now },
      },
      select: {
        id: true,
        title: true,
        date: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      take: 200,
    });

    const ready = candidates.filter((ev) => {
      const effectiveEnd = computeEventEffectiveEnd({
        date: ev.date,
        endDate: ev.endDate,
        startTime: ev.startTime,
        endTime: ev.endTime,
        status: ev.status as any,
      });
      return effectiveEnd.getTime() < now.getTime();
    });

    return NextResponse.json({
      candidates: candidates.length,
      ready: ready.length,
      sample: ready.slice(0, 10),
    });
  } catch (error) {
    console.error("Failed to dry-run event status updates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
