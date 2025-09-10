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

// db.$connect()
//   .then(() => {
//     console.log("✅ Prisma successfully connected to the database.");
//   })
//   .catch((error: unknown) => {
//     console.error("❌ Prisma failed to connect to the database:", error);
//   });

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
