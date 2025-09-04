import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  exportAttendeesToCSV,
  exportAllAttendeesToCSV,
} from "@/lib/organizer/attendee-utils";
import { TicketStatus } from "@/generated/prisma";

// Helper function to validate and convert status strings to TicketStatus enum
function validateTicketStatuses(statuses: string[]): TicketStatus[] {
  const validStatuses = Object.values(TicketStatus) as string[];
  return statuses.filter((status): status is TicketStatus =>
    validStatuses.includes(status)
  ) as TicketStatus[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const eventId = searchParams.get("eventId");
    const includePhone = searchParams.get("includePhone") === "true";
    const includePaymentRef = searchParams.get("includePaymentRef") === "true";
    const statusFilterRaw = searchParams.get("status")?.split(",") || [];
    const ticketTypeFilter = searchParams.get("ticketTypeId")?.split(",") || [];
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Convert string statuses to TicketStatus enum values
    const statusFilter =
      statusFilterRaw.length > 0
        ? validateTicketStatuses(statusFilterRaw)
        : undefined;

    // Export options
    const exportOptions = {
      includeName: true,
      includeEmail: true,
      includePhone,
      includePaymentRef,
      statusFilter:
        statusFilter && statusFilter.length > 0 ? statusFilter : undefined,
      ticketTypeFilter:
        ticketTypeFilter.length > 0 ? ticketTypeFilter : undefined,
      sortBy: sortBy as "name" | "email" | "date" | "ticketType",
      sortOrder: sortOrder as "asc" | "desc",
    };

    let csvContent: string;

    if (eventId) {
      // Export for specific event
      csvContent = await exportAttendeesToCSV(eventId, userId, exportOptions);
    } else {
      // Export all events for the organizer
      csvContent = await exportAllAttendeesToCSV(userId, exportOptions);
    }

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `attendees-${eventId || "all"}-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting attendees:", error);
    return NextResponse.json(
      { error: "Failed to export attendees" },
      { status: 500 }
    );
  }
}
