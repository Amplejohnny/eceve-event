import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Check total events
    const totalEvents = await db.event.count();
    
    // Check active events
    const activeEvents = await db.event.count({
      where: { status: "ACTIVE" }
    });
    
    // Check public active events
    const publicActiveEvents = await db.event.count({
      where: { status: "ACTIVE", isPublic: true }
    });
    
    // Get sample events
    const sampleEvents = await db.event.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        status: true,
        isPublic: true,
        eventType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });
    
    // Check events with future dates
    const now = new Date();
    const futureEvents = await db.event.count({
      where: {
        status: "ACTIVE",
        isPublic: true,
        date: { gte: now }
      }
    });
    
    // Check events in major cities
    const majorNigerianCities = [
      "Lagos", "Abuja", "Kano", "Rivers", "Port Harcourt", "Ibadan", "Oyo", "Ogun"
    ];
    
    const cityEventCounts = await Promise.all(
      majorNigerianCities.map(async (city) => ({
        city,
        count: await db.event.count({
          where: {
            status: "ACTIVE",
            isPublic: true,
            location: {
              contains: city,
              mode: "insensitive"
            }
          }
        })
      }))
    );
    
    return NextResponse.json({
      success: true,
      stats: {
        totalEvents,
        activeEvents,
        publicActiveEvents,
        futureEvents,
        cityEventCounts,
      },
      sampleEvents,
      currentTime: now.toISOString(),
    });
    
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}