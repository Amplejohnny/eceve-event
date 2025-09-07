import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(_req: NextRequest) {
  try {
    // Support both single ADMIN_EMAIL and multiple ADMIN_EMAILS
    const adminEmails =
      process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.trim()
        ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase())
        : process.env.ADMIN_EMAIL
        ? [process.env.ADMIN_EMAIL.toLowerCase()]
        : [];

    if (adminEmails.length === 0) {
      return NextResponse.json(
        {
          error: "No admin emails configured",
          envCheck: {
            ADMIN_EMAIL: process.env.ADMIN_EMAIL,
            ADMIN_EMAILS: process.env.ADMIN_EMAILS,
          },
        },
        { status: 500 }
      );
    }

    console.log(`Configured admin emails: ${adminEmails.join(", ")}`);

    // First, let's see what users actually exist in the database
    const allUsers = await db.user.findMany({
      select: { id: true, email: true, role: true },
    });

    console.log(
      `All users in database:`,
      allUsers.map((u) => u.email)
    );

    // Find users with admin emails
    const users = await db.user.findMany({
      where: {
        email: {
          in: adminEmails,
        },
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`Found admin users:`, users);

    if (users.length === 0) {
      return NextResponse.json(
        {
          error: "No admin users found",
          debug: {
            configuredAdminEmails: adminEmails,
            allUsersInDb: allUsers.map((u) => u.email),
            exactMatches: allUsers.filter((u) =>
              adminEmails.includes(u.email.toLowerCase())
            ),
            possibleMatches: allUsers.filter((u) =>
              adminEmails.some(
                (adminEmail) =>
                  u.email.toLowerCase().includes(adminEmail) ||
                  adminEmail.includes(u.email.toLowerCase())
              )
            ),
          },
        },
        { status: 404 }
      );
    }

    // Check which users need upgrading
    const usersToUpgrade = users.filter((user) => user.role !== "ADMIN");

    if (usersToUpgrade.length === 0) {
      return NextResponse.json({
        message: "All admin users are already admins",
        users: users.map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
        })),
      });
    }

    // Upgrade users to admin
    const upgradedUsers = await Promise.all(
      usersToUpgrade.map(async (user) => {
        const updatedUser = await db.user.update({
          where: { email: user.email },
          data: {
            role: "ADMIN",
            emailVerified: new Date(),
            isActive: true,
          },
          select: { id: true, email: true, role: true },
        });

        console.log(`User ${user.email} upgraded to ADMIN role`);
        return updatedUser;
      })
    );

    return NextResponse.json({
      message: `${upgradedUsers.length} user(s) upgraded to admin successfully`,
      upgradedUsers,
      allAdminUsers: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: usersToUpgrade.find((u) => u.id === user.id)
          ? "ADMIN"
          : user.role,
      })),
    });
  } catch (error) {
    console.error("Error upgrading admin:", error);
    return NextResponse.json(
      {
        error: "Failed to upgrade admin",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const adminEmails =
      process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ||
      (process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.toLowerCase()] : []);

    // Get all users to help with debugging
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        isActive: true,
      },
    });

    const adminUsers = allUsers.filter((user) =>
      adminEmails.includes(user.email.toLowerCase())
    );

    return NextResponse.json({
      debug: {
        configuredAdminEmails: adminEmails,
        rawAdminEmail: process.env.ADMIN_EMAIL,
        rawAdminEmails: process.env.ADMIN_EMAILS,
        allUsersInDatabase: allUsers,
        matchingAdminUsers: adminUsers,
        needsUpgrade: adminUsers.filter((user) => user.role !== "ADMIN"),
        alreadyAdmin: adminUsers.filter((user) => user.role === "ADMIN"),
      },
    });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json(
      {
        error: "Failed to check admin status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
