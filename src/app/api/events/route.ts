import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const eventType = searchParams.get("eventType");
    const status = searchParams.get("status");
    const q = searchParams.get("q");
    const section = searchParams.get("section");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const majorNigerianCities = [
      "Lagos",
      "Abuja",
      "Kano",
      "Rivers",
      "Port Harcourt",
      "Ibadan",
      "Oyo",
      "Ogun",
    ];

    const whereClause: any = {
      isPublic: true,
      status: status || "ACTIVE",
    };

    if (category) {
      whereClause.category = {
        contains: category,
        mode: "insensitive",
      };
    }

    if (location) {
      whereClause.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (eventType && (eventType === "FREE" || eventType === "PAID")) {
      whereClause.eventType = eventType;
    }

    if (q) {
      whereClause.OR = [
        {
          title: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          venue: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          tags: {
            has: q,
          },
        },
      ];
    }

    let orderBy: any = [{ date: "asc" }, { createdAt: "desc" }]; // default

    switch (section) {
      case "popular":
        orderBy = [{ createdAt: "desc" }];
        whereClause.date = {
          gte: new Date(),
        };
        break;

      case "upcoming":
        orderBy = [{ date: "asc" }];
        const now = new Date();
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        whereClause.date = {
          gte: now,
          lte: thirtyDaysFromNow,
        };
        break;

      case "trendy":
        orderBy = [{ createdAt: "desc" }];
        whereClause.OR = [
          ...(whereClause.OR || []),
          ...majorNigerianCities.map((city) => ({
            location: {
              contains: city,
              mode: "insensitive" as const,
            },
          })),
        ];
        whereClause.date = {
          gte: new Date(),
        };
        break;
    }

    let defaultLimit = 30;
    if (
      section === "popular" ||
      section === "upcoming" ||
      section === "trendy"
    ) {
      defaultLimit = 18;
    }

    const take = limitParam
      ? Math.max(1, parseInt(limitParam)) || undefined
      : defaultLimit;
    const skip = offsetParam ? Math.max(0, parseInt(offsetParam)) || 0 : 0;

    // Fetch events with all related data
    const events = await db.event.findMany({
      where: whereClause,
      include: {
        ticketTypes: {
          orderBy: { price: "asc" },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            tickets: {
              where: {
                status: {
                  in: ["ACTIVE", "USED"],
                },
              },
            },
            favorites: true,
          },
        },
      },
      orderBy,
      take,
      skip,
    });

    // Transform the data to ensure consistent structure
    const transformedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.eventType,
      date: event.date.toISOString(),
      endDate: event.endDate?.toISOString() || null,
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      venue: event.venue || "",
      address: event.address || "",
      tags: Array.isArray(event.tags) ? event.tags : [],
      category: event.category || "",
      imageUrl: event.imageUrl || "",
      isPublic: event.isPublic ?? true,
      status: event.status,
      slug: event.slug,
      ticketTypes: event.ticketTypes.map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        price: ticket.price,
        quantity: ticket.quantity,
      })),
      organizer: event.organizer || null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      _count: {
        tickets: event._count.tickets,
        favorites: event._count.favorites,
      },
    }));

    // Get total count for pagination (optional)
    const totalCount = await db.event.count({
      where: whereClause,
    });

    return NextResponse.json({
      events: transformedEvents,
      totalCount,
      hasMore: take ? skip + take < totalCount : false,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    if (error instanceof Error) {
      if (error.message.includes("connection")) {
        return NextResponse.json(
          { error: "Database connection error" },
          { status: 503 }
        );
      }

      if (error.message.includes("Invalid")) {
        return NextResponse.json(
          { error: "Invalid query parameters" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
