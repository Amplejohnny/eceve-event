import type { Prisma } from "@/generated/prisma";
import { PrismaClient } from "@/generated/prisma";

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
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
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
  .catch((error: unknown) => {
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
