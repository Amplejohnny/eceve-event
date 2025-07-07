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
