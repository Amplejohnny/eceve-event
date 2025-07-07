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
      tickets: {
        select: {
          id: true,
          ticketType: true,
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
      tickets: true,
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
  ticketTypes: any[];
  maxAttendees?: number;
  organizerId: string;
  slug: string;
}) {
  return await db.event.create({
    data: {
      ...data,
      ticketTypes: data.ticketTypes as Prisma.InputJsonValue,
    },
    include: {
      organizer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
  });
}

export async function deleteEvent(id: string) {
  return await db.event.delete({
    where: { id },
  });
}

// Ticket database functions
export async function createTicket(data: {
  ticketType: string;
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
    },
  });
}

export async function getUserTickets(userId: string) {
  return await db.ticket.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          location: true,
          imageUrl: true,
          slug: true,
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
  const [ticketsSold, totalRevenue, ticketTypes] = await Promise.all([
    db.ticket.count({
      where: { eventId, status: "ACTIVE" },
    }),
    db.ticket.aggregate({
      where: { eventId, status: "ACTIVE" },
      _sum: { price: true },
    }),
    db.ticket.groupBy({
      by: ["ticketType"],
      where: { eventId, status: "ACTIVE" },
      _count: { ticketType: true },
      _sum: { price: true },
    }),
  ]);

  return {
    ticketsSold,
    totalRevenue: totalRevenue._sum.price || 0,
    ticketTypes,
  };
}
