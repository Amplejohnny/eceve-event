import { PrismaClient, Prisma } from "../generated/prisma/";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate required environment variable
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

db.$connect()
  .then(() => {
    console.log("✅ Prisma successfully connected to the database.");
  })
  .catch((error: any) => {
    console.error("❌ Prisma failed to connect to the database:", error);
  });

// Database utility functions
export async function getUserByEmail(email: string) {
  return await db.user.findUnique({
    where: { email },
    include: {
      accounts: true,
      sessions: true,
    },
  });
}

export async function getUserById(id: string) {
  return await db.user.findUnique({
    where: { id },
    include: {
      accounts: true,
      sessions: true,
    },
  });
}

export async function createUser(data: {
  email: string;
  password?: string;
  name?: string;
  role?: "USER" | "ORGANIZER";
  emailVerified?: Date;
  image?: string;
}) {
  return await db.user.create({
    data: {
      ...data,
      role: data.role || "USER",
    },
  });
}

export async function updateUser(
  id: string,
  data: Partial<{
    name: string;
    password: string;
    email: string;
    role: "USER" | "ORGANIZER";
    emailVerified: Date;
    image: string;
    bio: string;
    location: string;
    website: string;
    twitter: string;
    instagram: string;
    isActive: boolean;
  }>
) {
  return await db.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: string) {
  return await db.user.delete({
    where: { id },
  });
}

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

// Payment database functions
export async function createPayment(data: {
  paystackRef: string;
  amount: number;
  platformFee: number;
  organizerAmount: number;
  customerEmail: string;
  eventId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return await db.payment.create({
    data,
  });
}

export async function updatePayment(
  paystackRef: string,
  data: Prisma.PaymentUpdateInput | Prisma.PaymentUncheckedUpdateInput
) {
  return await db.payment.update({
    where: { paystackRef },
    data,
  });
}

export async function getPaymentByReference(paystackRef: string) {
  return await db.payment.findUnique({
    where: { paystackRef },
    include: {
      event: true,
      tickets: true,
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

export async function getPlatformAnalytics() {
  const [totalUsers, totalEvents, totalTickets, totalRevenue] =
    await Promise.all([
      db.user.count(),
      db.event.count({ where: { status: "ACTIVE" } }),
      db.ticket.count({ where: { status: "ACTIVE" } }),
      db.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { platformFee: true },
      }),
    ]);

  return {
    totalUsers,
    totalEvents,
    totalTickets,
    totalRevenue: totalRevenue._sum.platformFee || 0,
  };
}
