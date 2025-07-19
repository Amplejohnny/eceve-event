import { db } from "./db";
import { Prisma } from "@/generated/prisma";

// Event database functions
export async function getEvents(
  options: {
    skip?: number;
    take?: number;
    where?: unknown;
    include?: unknown;
    orderBy?: unknown;
  } = {}
) {
  return await db.event.findMany({
    skip: options.skip || 0,
    take: options.take || 10,
    where: options.where || { status: "ACTIVE", isPublic: true },
    include: options.include || {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
    orderBy: options.orderBy || { createdAt: "desc" },
  });
}

export async function getEventBySlug(slug: string) {
  return await db.event.findUnique({
    where: { slug },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          location: true,
          website: true,
          twitter: true,
          instagram: true,
        },
      },
      ticketTypes: {
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
        },
      },
      tickets: {
        select: {
          id: true,
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          attendeeName: true,
          attendeeEmail: true,
          status: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
  });
}

export async function getEventById(id: string) {
  return await db.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      ticketTypes: true,
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
      payments: true,
      _count: {
        select: {
          tickets: true,
          favorites: true,
        },
      },
    },
  });
}

export async function createEvent(data: {
  title: string;
  description: string;
  eventType: "FREE" | "PAID";
  date: Date;
  endDate?: Date;
  startTime: string;
  endTime?: string;
  location: string;
  venue?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  category: string;
  imageUrl?: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    quantity: number | null;
  }>;
  maxAttendees?: number;
  organizerId: string;
  slug: string;
}) {
  const { ticketTypes, ...eventData } = data;

  return await db.event.create({
    data: {
      ...eventData,
      ticketTypes: {
        create: ticketTypes,
      },
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      ticketTypes: true,
    },
  });
}

export async function updateEvent(
  id: string,
  data: Prisma.EventUpdateInput | Prisma.EventUncheckedUpdateInput
) {
  return await db.event.update({
    where: { id },
    data,
    include: {
      ticketTypes: true,
    },
  });
}

// Check if there are any tickets sold for this event
export async function checkTicketSales(eventId: string): Promise<boolean> {
  try {
    const ticketSales = await db.ticket.findFirst({
      where: {
        eventId: eventId,
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
      select: {
        id: true,
      },
    });

    return !!ticketSales;
  } catch (error) {
    console.error("Error checking ticket sales:", error);
    return true;
  }
}

export async function checkTicketSalesWithCount(eventId: string): Promise<{
  hasSales: boolean;
  count: number;
}> {
  try {
    const ticketSalesCount = await db.ticket.count({
      where: {
        eventId: eventId,
        status: {
          in: ["ACTIVE", "USED"],
        },
      },
    });

    return {
      hasSales: ticketSalesCount > 0,
      count: ticketSalesCount,
    };
  } catch (error) {
    console.error("Error checking ticket sales with count:", error);
    return {
      hasSales: true,
      count: 0,
    };
  }
}

export async function checkTicketSalesDetailed(eventId: string): Promise<{
  hasAnySales: boolean;
  hasActiveSales: boolean;
  cancelledCount: number;
  activeSalesCount: number;
  usedCount: number;
}> {
  try {
    const [activeSales, usedSales, cancelledSales] = await Promise.all([
      db.ticket.count({
        where: {
          eventId: eventId,
          status: "ACTIVE",
        },
      }),
      db.ticket.count({
        where: {
          eventId: eventId,
          status: "USED",
        },
      }),
      db.ticket.count({
        where: {
          eventId: eventId,
          status: {
            in: ["CANCELLED", "REFUNDED"],
          },
        },
      }),
    ]);

    const totalSales = activeSales + usedSales;

    return {
      hasAnySales: totalSales > 0,
      hasActiveSales: activeSales > 0,
      cancelledCount: cancelledSales,
      activeSalesCount: activeSales,
      usedCount: usedSales,
    };
  } catch (error) {
    console.error("Error checking detailed ticket sales:", error);
    return {
      hasAnySales: true,
      hasActiveSales: true,
      cancelledCount: 0,
      activeSalesCount: 0,
      usedCount: 0,
    };
  }
}

export async function updateTicketType(
  id: string,
  data: Prisma.TicketTypeUpdateInput
) {
  return await db.ticketType.update({
    where: { id },
    data,
  });
}

export async function deleteTicketType(id: string) {
  return await db.ticketType.delete({
    where: { id },
  });
}

export async function getTicketTypeById(id: string) {
  return await db.ticketType.findUnique({
    where: { id },
    include: {
      event: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });
}

// Ticket database functions
export async function createTicket(data: {
  ticketTypeId: string;
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  confirmationId: string;
  eventId: string;
  userId?: string;
  paymentId?: string;
}) {
  return await db.ticket.create({
    data,
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });
}

export async function getTicketByConfirmationId(confirmationId: string) {
  return await db.ticket.findUnique({
    where: { confirmationId },
    include: {
      event: {
        include: {
          organizer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      ticketType: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });
}

export async function getUserFavorites(userId: string) {
  return await db.eventFavorite.findMany({
    where: { userId },
    include: {
      event: {
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              tickets: true,
              favorites: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Favorites database functions
export async function toggleEventFavorite(userId: string, eventId: string) {
  const existingFavorite = await db.eventFavorite.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId,
      },
    },
  });

  if (existingFavorite) {
    await db.eventFavorite.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });
    return false;
  } else {
    await db.eventFavorite.create({
      data: {
        userId,
        eventId,
      },
    });
    return true;
  }
}

// Analytics functions
export async function getEventAnalytics(eventId: string) {
  const [ticketsSold, totalRevenue, ticketTypeStats] = await Promise.all([
    db.ticket.count({
      where: { eventId, status: "ACTIVE" },
    }),
    db.ticket.aggregate({
      where: { eventId, status: "ACTIVE" },
      _sum: { price: true },
    }),
    db.ticket.groupBy({
      by: ["ticketTypeId"],
      where: { eventId, status: "ACTIVE" },
      _count: { ticketTypeId: true },
      _sum: { price: true },
    }),
  ]);

  // Get ticket type details for the stats
  const ticketTypeDetails = await db.ticketType.findMany({
    where: { eventId },
    select: {
      id: true,
      name: true,
      price: true,
      quantity: true,
    },
  });

  // Combine ticket type stats with details
  const ticketTypes = ticketTypeStats.map((stat) => {
    const ticketType = ticketTypeDetails.find(
      (t) => t.id === stat.ticketTypeId
    );
    return {
      id: stat.ticketTypeId,
      name: ticketType?.name || "Unknown",
      price: ticketType?.price || 0,
      totalQuantity: ticketType?.quantity || null,
      soldCount: stat._count.ticketTypeId,
      revenue: stat._sum.price || 0,
    };
  });

  return {
    ticketsSold,
    totalRevenue: totalRevenue._sum.price || 0,
    ticketTypes,
  };
}
// Additional utility functions
export async function getAvailableTicketTypes(eventId: string) {
  const ticketTypes = await db.ticketType.findMany({
    where: { eventId },
    include: {
      _count: {
        select: {
          tickets: {
            where: {
              status: "ACTIVE",
            },
          },
        },
      },
    },
  });

  return ticketTypes.map((ticketType) => ({
    ...ticketType,
    available: ticketType.quantity
      ? ticketType.quantity - ticketType._count.tickets
      : null,
    soldOut: ticketType.quantity
      ? ticketType.quantity <= ticketType._count.tickets
      : false,
  }));
}

export async function getTicketsSoldCount(ticketTypeId: string) {
  return await db.ticket.count({
    where: {
      ticketTypeId,
      status: "ACTIVE",
    },
  });
}
