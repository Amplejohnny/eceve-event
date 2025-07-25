import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma, EventStatus } from "@/generated/prisma";

// Type for event with all required relations
type EventWithRelations = {
  id: string;
  title: string;
  description: string;
  eventType: string;
  date: Date;
  endDate: Date | null;
  startTime: string;
  endTime: string | null;
  location: string;
  venue: string | null;
  address: string | null;
  tags: string[];
  category: string;
  imageUrl: string | null;
  isPublic: boolean;
  status: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  ticketTypes: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number | null; // Allow null as per schema
  }>;
  organizer: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  _count: {
    tickets: number;
    favorites: number;
  };
};

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

    // Parse and validate status parameter
    const getValidStatus = (statusParam: string | null): EventStatus => {
      if (!statusParam) return EventStatus.ACTIVE;

      // Check if the provided status is a valid EventStatus enum value
      const validStatuses = Object.values(EventStatus);
      const upperCaseStatus = statusParam.toUpperCase() as EventStatus;

      return validStatuses.includes(upperCaseStatus)
        ? upperCaseStatus
        : EventStatus.ACTIVE;
    };

    // Use Prisma types instead of `any`
    const baseWhereClause: Prisma.EventWhereInput = {
      isPublic: true,
      status: getValidStatus(status),
    };

    if (category) {
      baseWhereClause.category = {
        contains: category,
        mode: "insensitive",
      };
    }

    if (location) {
      baseWhereClause.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (eventType === "FREE" || eventType === "PAID") {
      baseWhereClause.eventType = eventType as "FREE" | "PAID";
    }

    if (q) {
      baseWhereClause.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    // Clone the base filters
    const finalWhereClause: Prisma.EventWhereInput = { ...baseWhereClause };

    let orderBy: Prisma.EventOrderByWithRelationInput[] = [
      { date: "asc" },
      { createdAt: "desc" },
    ];

    const now = new Date();

    switch (section) {
      case "popular":
        orderBy = [{ createdAt: "desc" }];
        finalWhereClause.date = { gte: now };
        break;

      case "upcoming":
        orderBy = [{ date: "asc" }];
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        finalWhereClause.date = {
          gte: now,
          lte: thirtyDaysFromNow,
        };
        break;

      case "trendy":
        orderBy = [{ createdAt: "desc" }];
        finalWhereClause.date = { gte: now };

        // Handle OR clause safely
        const cityFilters = majorNigerianCities.map((city) => ({
          location: {
            contains: city,
            mode: "insensitive" as const,
          },
        }));

        if (finalWhereClause.OR) {
          finalWhereClause.OR = [...finalWhereClause.OR, ...cityFilters];
        } else {
          finalWhereClause.AND = [
            { OR: cityFilters },
            ...(finalWhereClause.AND ? [finalWhereClause.AND].flat() : []),
          ];
        }
        break;
    }

    // Set pagination
    const defaultLimit =
      section === "popular" || section === "upcoming" || section === "trendy"
        ? 18
        : 30;

    const take = limitParam
      ? Math.max(1, parseInt(limitParam)) || defaultLimit
      : defaultLimit;
    const skip = offsetParam ? Math.max(0, parseInt(offsetParam)) || 0 : 0;

    let events: EventWithRelations[];
    let totalCount: number;

    try {
      const rawEvents = await db.event.findMany({
        where: finalWhereClause,
        include: {
          ticketTypes: { orderBy: { price: "asc" } },
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

      // Type assertion after database query
      events = rawEvents as EventWithRelations[];

      totalCount = await db.event.count({
        where: finalWhereClause,
      });
    } catch (dbError) {
      console.error("Database query error:", dbError);
      throw new Error("Database query failed");
    }

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
        quantity: ticket.quantity, // Can be null
      })),
      organizer: event.organizer || null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      _count: {
        tickets: event._count.tickets,
        favorites: event._count.favorites,
      },
    }));

    return NextResponse.json({
      events: transformedEvents,
      totalCount,
      hasMore: skip + take < totalCount,
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

      if (
        error.message.includes("Invalid") ||
        error.message.includes("validation")
      ) {
        return NextResponse.json(
          { error: "Invalid query parameters" },
          { status: 400 }
        );
      }

      if (error.message.includes("Database query failed")) {
        return NextResponse.json(
          { error: "Database query error. Please try again." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
