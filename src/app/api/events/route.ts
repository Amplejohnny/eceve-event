import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { EventStatus } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";

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
    quantity: number | null;
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

      const validStatuses = Object.values(EventStatus);
      const upperCaseStatus = statusParam.toUpperCase() as EventStatus;

      return validStatuses.includes(upperCaseStatus)
        ? upperCaseStatus
        : EventStatus.ACTIVE;
    };

    // Build base where clause with common filters
    const baseWhereClause: Prisma.EventWhereInput = {
      isPublic: true,
      status: getValidStatus(status),
    };

    // Add basic filters
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

    // Handle search query with OR conditions
    if (q) {
      baseWhereClause.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
    }

    const now = new Date();
    let finalWhereClause: Prisma.EventWhereInput = { ...baseWhereClause };
    let orderBy: Prisma.EventOrderByWithRelationInput[] = [
      { date: "asc" },
      { createdAt: "desc" },
    ];

    // Create date filters for different sections
    const getActiveEventsFilter = (): Prisma.EventWhereInput => {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      return {
        OR: [
          // Future events
          { date: { gte: now } },
          // Multi-day events that haven't ended
          {
            AND: [
              { date: { lt: now } },
              { endDate: { not: null } },
              { endDate: { gte: now } },
            ],
          },
          // Today's single-day events (will be time-filtered later)
          {
            AND: [
              { date: { gte: todayStart } },
              {
                date: {
                  lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
                },
              },
              { endDate: null },
            ],
          },
        ],
      };
    };

    const getUpcomingEventsFilter = (): Prisma.EventWhereInput => {
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      return {
        OR: [
          // Future events within 30 days
          {
            AND: [{ date: { gte: now } }, { date: { lte: thirtyDaysFromNow } }],
          },
          // Multi-day ongoing events ending within 30 days
          {
            AND: [
              { date: { lt: now } },
              { endDate: { not: null } },
              { endDate: { gte: now } },
              { endDate: { lte: thirtyDaysFromNow } },
            ],
          },
          // Today's events (single-day)
          {
            AND: [
              { date: { gte: todayStart } },
              {
                date: {
                  lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
                },
              },
              { endDate: null },
            ],
          },
        ],
      };
    };

    const getTrendyEventsFilter = (): Prisma.EventWhereInput => {
      const activeFilter = getActiveEventsFilter();
      const cityFilters = majorNigerianCities.map((city) => ({
        location: {
          contains: city,
          mode: "insensitive" as const,
        },
      }));

      return {
        AND: [activeFilter, { OR: cityFilters }],
      };
    };

    // Apply section-specific filters
    switch (section) {
      case "popular":
        orderBy = [{ createdAt: "desc" }];
        const popularFilter = getActiveEventsFilter();
        // Merge with existing OR conditions if they exist
        if (finalWhereClause.OR) {
          finalWhereClause = {
            ...finalWhereClause,
            AND: [{ OR: finalWhereClause.OR }, popularFilter],
          };
          delete finalWhereClause.OR;
        } else {
          finalWhereClause = {
            ...finalWhereClause,
            ...popularFilter,
          };
        }
        break;

      case "upcoming":
        orderBy = [{ date: "asc" }];
        const upcomingFilter = getUpcomingEventsFilter();
        // Merge with existing OR conditions if they exist
        if (finalWhereClause.OR) {
          finalWhereClause = {
            ...finalWhereClause,
            AND: [{ OR: finalWhereClause.OR }, upcomingFilter],
          };
          delete finalWhereClause.OR;
        } else {
          finalWhereClause = {
            ...finalWhereClause,
            ...upcomingFilter,
          };
        }
        break;

      case "trendy":
        orderBy = [{ createdAt: "desc" }];
        const trendyFilter = getTrendyEventsFilter();
        // Merge with existing OR conditions if they exist
        if (finalWhereClause.OR) {
          finalWhereClause = {
            ...finalWhereClause,
            AND: [{ OR: finalWhereClause.OR }, trendyFilter],
          };
          delete finalWhereClause.OR;
        } else {
          finalWhereClause = {
            ...finalWhereClause,
            ...trendyFilter,
          };
        }
        break;

      default:
        // For regular queries, apply active filter
        const defaultFilter = getActiveEventsFilter();
        if (finalWhereClause.OR) {
          finalWhereClause = {
            ...finalWhereClause,
            AND: [{ OR: finalWhereClause.OR }, defaultFilter],
          };
          delete finalWhereClause.OR;
        } else {
          finalWhereClause = {
            ...finalWhereClause,
            ...defaultFilter,
          };
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

    // Time-based filtering function (for single-day events)
    const filterEventsByTime = (
      events: EventWithRelations[]
    ): EventWithRelations[] => {
      return events.filter((event) => {
        const eventDate = new Date(event.date);

        // If event hasn't started yet, it's valid
        if (eventDate >= now) {
          return true;
        }

        // If it's a multi-day event, check endDate only
        if (event.endDate) {
          const eventEndDate = new Date(event.endDate);
          return eventEndDate >= now;
        }

        // For single-day events, check if it's today and hasn't expired by time
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        if (eventDate >= todayStart && eventDate < todayEnd) {
          if (event.endTime) {
            try {
              const [endHours, endMinutes] = event.endTime
                .split(":")
                .map(Number);
              const eventEndDateTime = new Date(eventDate);
              eventEndDateTime.setHours(endHours, endMinutes, 0, 0);
              return now <= eventEndDateTime;
            } catch {
              // If endTime is malformed, use default 2-hour buffer
              return false;
            }
          } else if (event.startTime) {
            try {
              // No end time, use start time + 2-hour buffer
              const [startHours, startMinutes] = event.startTime
                .split(":")
                .map(Number);
              const eventStartDateTime = new Date(eventDate);
              eventStartDateTime.setHours(startHours, startMinutes, 0, 0);
              const estimatedEndTime = new Date(
                eventStartDateTime.getTime() + 2 * 60 * 60 * 1000
              );
              return now <= estimatedEndTime;
            } catch {
              // If startTime is malformed, exclude the event
              return false;
            }
          }
        }

        return false;
      });
    };

    let events: EventWithRelations[];
    let totalCount: number;

    try {
      // Execute database queries with error handling
      const [rawEvents, count] = await Promise.all([
        db.event.findMany({
          where: finalWhereClause,
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
          take: take * 2, // Fetch more to account for time filtering
          skip,
        }),
        db.event.count({
          where: finalWhereClause,
        }),
      ]);

      // Apply time-based filtering
      const allFilteredEvents = filterEventsByTime(
        rawEvents as EventWithRelations[]
      );
      events = allFilteredEvents.slice(0, take);
      totalCount = count;
    } catch (dbError) {
      console.error("Database query error:", dbError);

      // Handle specific database errors
      if (dbError instanceof Error) {
        if (
          dbError.message.includes("prepared statement") ||
          dbError.message.includes("connection")
        ) {
          try {
            // Disconnect and reconnect
            await db.$disconnect();
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Simplified retry query
            const [rawEvents, count] = await Promise.all([
              db.event.findMany({
                where: {
                  isPublic: true,
                  status: getValidStatus(status),
                  ...(category && {
                    category: { contains: category, mode: "insensitive" },
                  }),
                  ...(location && {
                    location: { contains: location, mode: "insensitive" },
                  }),
                  ...(eventType &&
                    (eventType === "FREE" || eventType === "PAID") && {
                      eventType: eventType as "FREE" | "PAID",
                    }),
                },
                include: {
                  ticketTypes: { orderBy: { price: "asc" } },
                  organizer: {
                    select: { id: true, name: true, email: true, image: true },
                  },
                  _count: {
                    select: {
                      tickets: {
                        where: { status: { in: ["ACTIVE", "USED"] } },
                      },
                      favorites: true,
                    },
                  },
                },
                orderBy,
                take: take * 2,
                skip,
              }),
              db.event.count({
                where: {
                  isPublic: true,
                  status: getValidStatus(status),
                  ...(category && {
                    category: { contains: category, mode: "insensitive" },
                  }),
                  ...(location && {
                    location: { contains: location, mode: "insensitive" },
                  }),
                  ...(eventType &&
                    (eventType === "FREE" || eventType === "PAID") && {
                      eventType: eventType as "FREE" | "PAID",
                    }),
                },
              }),
            ]);

            const allFilteredEvents = filterEventsByTime(
              rawEvents as EventWithRelations[]
            );
            events = allFilteredEvents.slice(0, take);
            totalCount = count;
          } catch (retryError) {
            console.error("Retry failed:", retryError);
            throw new Error("Database connection issue. Please try again.");
          }
        } else {
          throw new Error("Database query failed");
        }
      } else {
        throw new Error("Unknown database error");
      }
    }

    // Transform events for response
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

    return NextResponse.json({
      events: transformedEvents,
      totalCount,
      hasMore: skip + take < totalCount,
    });
  } catch (error) {
    console.error("Error fetching events:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("connection") ||
        error.message.includes("prepared statement")
      ) {
        return NextResponse.json(
          { error: "Database connection error. Please try again." },
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
