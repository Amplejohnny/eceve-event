import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("🔍 DEBUG API: Starting organizer check...");

    // Test 1: Get the specific user
    const user = await db.user.findUnique({
      where: { id: "cmdp7pctr0000ld04qtbiqqdh" },
    });

    console.log("👤 User found:", user);

    // Test 2: Get the event with organizer
    const event = await db.event.findUnique({
      where: { slug: "we-are-coming" },
      include: {
        organizer: true, // Get ALL organizer fields
      },
    });

    console.log("📅 Event with organizer:", event);

    // Test 3: Raw SQL to check relationship
    const rawQuery = await db.$queryRaw`
      SELECT 
        e.id as event_id,
        e.title,
        e."organizerId",
        u.id as user_id,
        u.name,
        u.email,
        u.image,
        u.role
      FROM events e
      LEFT JOIN users u ON e."organizerId" = u.id
      WHERE e.slug = 'we-are-coming'
    `;

    console.log("🔍 Raw SQL result:", rawQuery);

    return NextResponse.json({
      user,
      event: {
        id: event?.id,
        title: event?.title,
        organizerId: event?.organizerId,
        organizer: event?.organizer,
      },
      rawQuery,
      debug: {
        userExists: !!user,
        eventExists: !!event,
        organizerExists: !!event?.organizer,
        organizerHasImage: !!(event?.organizer as any)?.image,
      },
    });
  } catch (error) {
    console.error("💥 Debug API error:", error);
    return NextResponse.json({ 
      error: "Failed to debug",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
