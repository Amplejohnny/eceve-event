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



// "🔍 API: Found event with ID: cmeqcublc0001wkj8est28vcy 🎫 API: Event has 2 ticket types: [ { id: 'cmeqcubld0002wkj8bu78nr9g', name: 'Standard' }, { id: 'cmeqcubld0003wkj8p8pyzt56', name: 'Premium' } ] 🎟️ API: Total tickets in database for event cmeqcublc0001wkj8est28 vcy: 3 🎟️ API: All tickets breakdown: [ { id: 'cmeu3hdsz0002wk3c26iex5g3', ticketTypeId: 'cmeqcubld0002wkj8bu78nr9g', status: 'ACTIVE' }, { id: 'cmeu3hdsz0003wk3cug7gig86', ticketTypeId: 'cmeqcubld0002wkj8bu78nr9g', status: 'ACTIVE' }, { id: 'cmeu3hdsz0004wk3cg9nqgfcv', ticketTypeId: 'cmeqcubld0003wkj8p8pyzt56', status: 'ACTIVE' } ] 📊 API: Sold ticket counts (ACTIVE status only): [ { *count: { id: 2 }, ticketTypeId: 'cmeqcubld0002wkj8bu78nr9g' }, { *count: { id: 1 }, ticketTypeId: 'cmeqcubld0003wkj8p8pyzt56' } ] 📊 API: All ticket counts (regardless of status): [ { *count: { id: 2 }, ticketTypeId: 'cmeqcubld0002wkj8bu78nr9g' }, { *count: { id: 1 }, ticketTypeId: 'cmeqcubld0003wkj8p8pyzt56' } ] 🔍 API: Available ticket statuses for this event: [ { status: 'ACTIVE' } ] 🗺️ API: Final soldCountMap: { cmeqcubld0002wkj8bu78nr9g: 2, cmeqcu bld0003wkj8p8pyzt56: 1 } ✅ API: Sending transformed event with ticket soldCounts: [ { id: 'cmeqcubld0002wkj8bu78nr9g', name: 'Standard', soldCount: 2 }, { id: 'cmeqcubld0003wkj8p8pyzt56', name: 'Premium', soldCount: 1 } ]

// 🎯 EventSlugPage eventToShow: {
//   hasCurrentEvent: false,
//   hasInitialEvent: true,
//   eventToShow: {
//     id: 'cmeqcublc0001wkj8est28vcy',
//     title: 'Future Leaders Summit 2025',
//     description: 'A two-day forum designed for executives, entrepreneurs, and students to explore strategies shaping the next decade of global business. Keynotes cover leadership in an AI-driven economy, sustainable growth models, and cross-border market opportunities. Hands-on sessions include case study analyses, mentorship roundtables, and pitch labs where participants refine ideas with direct feedback from investors. The event closes with a high-impact networking reception to foster lasting partnerships.',
//     eventType: 'PAID',
//     date: 2025-09-25T00:00:00.000Z,
//     endDate: 2025-09-27T00:00:00.000Z,
//     startTime: '10:30',
//     endTime: '12:00',
//     location: 'Abuja',
//     venue: 'International Conference Centre',
//     address: 'Herbert Macaulay Way, Central Business District, Abuja, Nigeria.',
//     latitude: null,
//     longitude: null,
//     tags: [ 'Networking', 'Conference', 'Education', 'Business', 'Premium' ],
//     category: 'Educational & Business',
//     imageUrl: '/uploads/events/event-1756080139694-wwm40tf2yz.png',
//     maxAttendees: null,
//     isPublic: true,
//     status: 'ACTIVE',
//     slug: 'future-leaders-summit-2025',
//     createdAt: 2025-08-25T00:04:13.481Z,
//     updatedAt: 2025-08-25T00:04:13.481Z,
//     organizerId: 'cmdp7pctr0000ld04qtbiqqdh',
//     organizer: {
//       id: 'cmdp7pctr0000ld04qtbiqqdh',
//       name: 'Amplejohnny',
//       email: 'workatdeveloper@gmail.com',
//       image: 'data:image/jpeg;base64,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'... 172463 more characters
//     },
//     ticketTypes: [ [Object], [Object] ]
//   },
//   ticketTypes: [
//     {
//       id: 'cmeqcubld0002wkj8bu78nr9g',
//       name: 'Standard',
//       price: 300000,
//       quantity: 300
//     },
//     {
//       id: 'cmeqcubld0003wkj8p8pyzt56',
//       name: 'Premium',
//       price: 1000000,
//       quantity: 50
//     }
//   ]
// }



// 🔄 EventSlugPage useEffect triggered with: {slug: 'future-leaders-summit-2025', initialEvent: true}initialEvent: trueslug: "future-leaders-summit-2025"[[Prototype]]: Object
// EventSlug.tsx:180 📝 Using initialEvent: {id: 'cmeqcublc0001wkj8est28vcy', title: 'Future Leaders Summit 2025', description: 'A two-day forum designed for executives, entrepren…working reception to foster lasting partnerships.', eventType: 'PAID', date: Thu Sep 25 2025 01:00:00 GMT+0100 (West Africa Standard Time), …}address: "Herbert Macaulay Way, Central Business District, Abuja, Nigeria."category: "Educational & Business"createdAt: Mon Aug 25 2025 01:04:13 GMT+0100 (West Africa Standard Time) {}date: Thu Sep 25 2025 01:00:00 GMT+0100 (West Africa Standard Time) {}description: "A two-day forum designed for executives, entrepreneurs, and students to explore strategies shaping the next decade of global business. Keynotes cover leadership in an AI-driven economy, sustainable growth models, and cross-border market opportunities. Hands-on sessions include case study analyses, mentorship roundtables, and pitch labs where participants refine ideas with direct feedback from investors. The event closes with a high-impact networking reception to foster lasting partnerships."endDate: Sat Sep 27 2025 01:00:00 GMT+0100 (West Africa Standard Time) {}endTime: "12:00"eventType: "PAID"id: "cmeqcublc0001wkj8est28vcy"imageUrl: "/uploads/events/event-1756080139694-wwm40tf2yz.png"isPublic: truelatitude: nulllocation: "Abuja"longitude: nullmaxAttendees: nullorganizer: {id: 'cmdp7pctr0000ld04qtbiqqdh', name: 'Amplejohnny', email: 'workatdeveloper@gmail.com', image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD…MNE4JtHj1hNHqTR6dJ/ytIRvPtT6F+YQIziP/ACOhroz/2Q=='}organizerId: "cmdp7pctr0000ld04qtbiqqdh"slug: "future-leaders-summit-2025"startTime: "10:30"status: "ACTIVE"tags: (5) ['Networking', 'Conference', 'Education', 'Business', 'Premium']ticketTypes: (2) [{…}, {…}]title: "Future Leaders Summit 2025"updatedAt: Mon Aug 25 2025 01:04:13 GMT+0100 (West Africa Standard Time) {}venue: "International Conference Centre"[[Prototype]]: Object
// EventSlug.tsx:244 🎫 EventSlugPage ticketTypes effect triggered
// EventSlug.tsx:247 🎫 Frontend received eventToShow.ticketTypes: (2) [{…}, {…}]0: {id: 'cmeqcubld0002wkj8bu78nr9g', name: 'Standard', price: 300000, quantity: 300}1: {id: 'cmeqcubld0003wkj8p8pyzt56', name: 'Premium', price: 1000000, quantity: 50}length: 2[[Prototype]]: Array(0)
// EventSlug.tsx:260 🎟️ Frontend Ticket: Standard
// EventSlug.tsx:261    - ID: cmeqcubld0002wkj8bu78nr9g
// EventSlug.tsx:262    - Total Quantity: 300
// EventSlug.tsx:263    - Sold Count: 0
// EventSlug.tsx:264    - Available: 300
// EventSlug.tsx:260 🎟️ Frontend Ticket: Premium
// EventSlug.tsx:261    - ID: cmeqcubld0003wkj8p8pyzt56
// EventSlug.tsx:262    - Total Quantity: 50
// EventSlug.tsx:263    - Sold Count: 0
// EventSlug.tsx:264    - Available: 50
