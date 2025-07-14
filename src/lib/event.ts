import { db } from "./db";
import { PrismaClient, Prisma } from "../generated/prisma/";

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
  location: string;
  venue?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  category?: string;
  imageUrl?: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    quantity: number;
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

//check if there are existing ticket sales here


export async function deleteEvent(id: string) {
  return await db.event.delete({
    where: { id },
  });
}

// Ticket Type functions
export async function createTicketType(data: {
  name: string;
  price: number;
  quantity: number;
  eventId: string;
}) {
  return await db.ticketType.create({
    data,
  });
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
  const ticketTypes = ticketTypeStats.map(stat => {
    const ticketType = ticketTypeDetails.find(t => t.id === stat.ticketTypeId);
    return {
      id: stat.ticketTypeId,
      name: ticketType?.name || 'Unknown',
      price: ticketType?.price || 0,
      totalQuantity: ticketType?.quantity || 0,
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

  return ticketTypes.map(ticketType => ({
    ...ticketType,
    available: ticketType.quantity - ticketType._count.tickets,
    soldOut: ticketType.quantity <= ticketType._count.tickets,
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