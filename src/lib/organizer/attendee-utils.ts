import { db } from "@/lib/db";
import type { TicketStatus, EventType, TicketType } from "@/generated/prisma";

// Interface for attendee data
interface EventAttendee {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  eventTitle: string;
  eventDate: Date;
  confirmationId: string;
  ticketTypeName: string;
  ticketPrice: number;
  quantity: number;
  status: TicketStatus;
  purchaseDate: Date;
  paymentReference?: string | null;
  eventType: EventType;
}

// Interface for export summary
interface AttendeeExportSummary {
  totalAttendees: number;
  totalTickets: number;
  freeTickets: number;
  paidTickets: number;
  totalRevenue: number;
  attendeesByStatus: {
    active: number;
    used: number;
    cancelled: number;
    refunded: number;
  };
  attendeesByTicketType: {
    ticketTypeName: string;
    count: number;
    revenue: number;
  }[];
}

// Export options
interface ExportOptions {
  includeName: boolean;
  includeEmail: boolean;
  includePhone?: boolean;
  includePaymentRef?: boolean;
  statusFilter?: TicketStatus[];
  ticketTypeFilter?: string[];
  sortBy?: "name" | "email" | "date" | "ticketType";
  sortOrder?: "asc" | "desc";
}

// ✅ FIXED: Proper typing for where clause
interface TicketWhereClause {
  eventId: string;
  status?: {
    in: TicketStatus[];
  };
  ticketTypeId?: {
    in: string[];
  };
}

// ✅ FIXED: Proper typing for order by clause
type TicketOrderBy =
  | { createdAt: "asc" | "desc" }
  | { attendeeName: "asc" | "desc" }
  | { attendeeEmail: "asc" | "desc" }
  | { ticketType: { name: "asc" | "desc" } };

/**
 * Get all attendees for a specific event
 * @param eventId - The event ID
 * @param organizerId - The organizer's user ID (for security)
 * @param options - Export options for filtering and sorting
 * @returns Promise containing attendee data and summary
 */
export async function getEventAttendees(
  eventId: string,
  organizerId: string,
  options: ExportOptions = {
    includeName: false,
    includeEmail: false,
  }
): Promise<{
  attendees: EventAttendee[];
  summary: AttendeeExportSummary;
}> {
  try {
    // First verify the organizer owns this event
    const event = await db.event.findFirst({
      where: {
        id: eventId,
        organizerId: organizerId,
      },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) {
      throw new Error(
        "Event not found or you don't have permission to access it"
      );
    }

    // ✅ FIXED: Proper typing for where clause
    const whereClause: TicketWhereClause = {
      eventId: eventId,
    };

    // Apply status filter if provided
    if (options.statusFilter && options.statusFilter.length > 0) {
      whereClause.status = {
        in: options.statusFilter,
      };
    }

    // Apply ticket type filter if provided
    if (options.ticketTypeFilter && options.ticketTypeFilter.length > 0) {
      whereClause.ticketTypeId = {
        in: options.ticketTypeFilter,
      };
    }

    // ✅ FIXED: Proper typing for order by clause
    let orderBy: TicketOrderBy = { createdAt: "desc" }; // Default sorting

    if (options.sortBy) {
      switch (options.sortBy) {
        case "name":
          orderBy = { attendeeName: options.sortOrder || "asc" };
          break;
        case "email":
          orderBy = { attendeeEmail: options.sortOrder || "asc" };
          break;
        case "date":
          orderBy = { createdAt: options.sortOrder || "desc" };
          break;
        case "ticketType":
          orderBy = { ticketType: { name: options.sortOrder || "asc" } };
          break;
      }
    }

    // Fetch all tickets with related data
    const tickets = await db.ticket.findMany({
      where: whereClause,
      include: {
        ticketType: true,
        payment: {
          select: {
            paystackRef: true,
            customerEmail: true,
            paidAt: true,
          },
        },
      },
      orderBy,
    });

    // Transform tickets to attendee format
    const attendees: EventAttendee[] = tickets.map((ticket) => ({
      id: ticket.id,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      attendeePhone: options.includePhone ? ticket.attendeePhone : null,
      eventTitle: event.title,
      eventDate: event.date,
      confirmationId: ticket.confirmationId,
      ticketTypeName: ticket.ticketType.name,
      ticketPrice: ticket.price,
      quantity: ticket.quantity,
      status: ticket.status,
      purchaseDate: ticket.createdAt,
      paymentReference: options.includePaymentRef
        ? ticket.payment?.paystackRef
        : null,
      eventType: event.eventType,
    }));

    // ✅ FIXED: Use event.ticketTypes properly (now it's used)
    const summary = calculateSummary(attendees, event.ticketTypes);

    return {
      attendees,
      summary,
    };
  } catch (error) {
    console.error("Error fetching event attendees:", error);
    throw error;
  }
}

/**
 * Export attendees data as CSV format
 * @param eventId - The event ID
 * @param organizerId - The organizer's user ID
 * @param options - Export options
 * @returns Promise containing CSV string
 */
export async function exportAttendeesToCSV(
  eventId: string,
  organizerId: string,
  options: ExportOptions = {
    includeName: false,
    includeEmail: false,
  }
): Promise<string> {
  const { attendees } = await getEventAttendees(eventId, organizerId, options);

  // Define CSV headers
  const headers = [
    "Name",
    "Email",
    ...(options.includePhone ? ["Phone"] : []),
    "Confirmation ID",
    "Ticket Type",
    "Price (₦)",
    "Quantity",
    "Status",
    "Purchase Date",
    ...(options.includePaymentRef ? ["Payment Reference"] : []),
  ];

  // Convert attendees to CSV rows
  const rows = attendees.map((attendee) => {
    const row = [
      attendee.attendeeName,
      attendee.attendeeEmail,
      ...(options.includePhone ? [attendee.attendeePhone || ""] : []),
      attendee.confirmationId,
      attendee.ticketTypeName,
      attendee.ticketPrice.toString(),
      attendee.quantity.toString(),
      attendee.status,
      attendee.purchaseDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
      ...(options.includePaymentRef ? [attendee.paymentReference || ""] : []),
    ];

    // Escape commas and quotes in CSV
    return row
      .map((field) => {
        // ✅ FIXED: Handle potential null/undefined values
        const safeField = field || "";
        if (
          safeField.includes(",") ||
          safeField.includes('"') ||
          safeField.includes("\n")
        ) {
          return `"${safeField.replace(/"/g, '""')}"`;
        }
        return safeField;
      })
      .join(",");
  });

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  return csvContent;
}

/**
 * Export all attendees from all events for an organizer as CSV format
 * @param organizerId - The organizer's user ID
 * @param options - Export options
 * @returns Promise containing CSV string
 */
export async function exportAllAttendeesToCSV(
  organizerId: string,
  options: ExportOptions = {
    includeName: false,
    includeEmail: false,
  }
): Promise<string> {
  // Get all events for the organizer
  const events = await db.event.findMany({
    where: { organizerId },
    include: { ticketTypes: true },
  });

  const allAttendees: EventAttendee[] = [];

  for (const event of events) {
    try {
      const result = await getEventAttendees(event.id, organizerId, options);
      allAttendees.push(...result.attendees);
    } catch (error) {
      console.warn(`Skipping event ${event.id} due to error:`, error);
      continue;
    }
  }

  // Define CSV headers for all events export
  const headers = [
    "Name",
    "Email",
    ...(options.includePhone ? ["Phone"] : []),
    "Event Title",
    "Event Date",
    "Confirmation ID",
    "Ticket Type",
    "Price (₦)",
    "Quantity",
    "Status",
    "Purchase Date",
    ...(options.includePaymentRef ? ["Payment Reference"] : []),
  ];

  // Convert attendees to CSV rows
  const rows = allAttendees.map((attendee) => {
    const row = [
      attendee.attendeeName,
      attendee.attendeeEmail,
      ...(options.includePhone ? [attendee.attendeePhone || ""] : []),
      attendee.eventTitle,
      attendee.eventDate.toISOString().split("T")[0],
      attendee.confirmationId,
      attendee.ticketTypeName,
      attendee.ticketPrice.toString(),
      attendee.quantity.toString(),
      attendee.status,
      attendee.purchaseDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
      ...(options.includePaymentRef ? [attendee.paymentReference || ""] : []),
    ];

    // Escape commas and quotes in CSV
    return row
      .map((field) => {
        // ✅ FIXED: Normalize to string to avoid Date type issues
        const safeField = String(field ?? "");
        if (
          safeField.includes(",") ||
          safeField.includes('"') ||
          safeField.includes("\n")
        ) {
          return `"${safeField.replace(/"/g, '""')}"`;
        }
        return safeField;
      })
      .join(",");
  });

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows].join("\n");

  return csvContent;
}

/**
 * Get attendee counts by status for dashboard widgets
 * @param eventId - The event ID
 * @param organizerId - The organizer's user ID
 * @returns Promise containing status counts
 */
export async function getEventAttendeeStats(
  eventId: string,
  organizerId: string
): Promise<{
  totalAttendees: number;
  activeTickets: number;
  usedTickets: number;
  cancelledTickets: number;
  totalRevenue: number;
}> {
  // Verify ownership
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      organizerId: organizerId,
    },
  });

  if (!event) {
    throw new Error(
      "Event not found or you don't have permission to access it"
    );
  }

  // Get ticket statistics
  const [totalCount, activeCount, usedCount, cancelledCount, revenueResult] =
    await Promise.all([
      // Total attendees (unique emails)
      db.ticket.groupBy({
        by: ["attendeeEmail"],
        where: { eventId, status: { not: "CANCELLED" } },
        _count: true,
      }),

      // Active tickets
      db.ticket.count({
        where: { eventId, status: "ACTIVE" },
      }),

      // Used tickets
      db.ticket.count({
        where: { eventId, status: "USED" },
      }),

      // Cancelled tickets
      db.ticket.count({
        where: { eventId, status: "CANCELLED" },
      }),

      // Total revenue
      db.ticket.aggregate({
        where: { eventId, status: { in: ["ACTIVE", "USED"] } },
        _sum: { price: true },
      }),
    ]);

  return {
    totalAttendees: totalCount.length,
    activeTickets: activeCount,
    usedTickets: usedCount,
    cancelledTickets: cancelledCount,
    totalRevenue: revenueResult._sum.price || 0,
  };
}

/**
 * Search attendees by name or email
 * @param eventId - The event ID
 * @param organizerId - The organizer's user ID
 * @param searchTerm - Search term for name or email
 * @returns Promise containing matching attendees
 */
export async function searchEventAttendees(
  eventId: string,
  organizerId: string,
  searchTerm: string
): Promise<EventAttendee[]> {
  // Verify ownership
  const event = await db.event.findFirst({
    where: {
      id: eventId,
      organizerId: organizerId,
    },
    include: {
      ticketTypes: true,
    },
  });

  if (!event) {
    throw new Error(
      "Event not found or you don't have permission to access it"
    );
  }

  const tickets = await db.ticket.findMany({
    where: {
      eventId,
      OR: [
        {
          attendeeName: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          attendeeEmail: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          confirmationId: {
            contains: searchTerm.toUpperCase(),
          },
        },
      ],
    },
    include: {
      ticketType: true,
      payment: {
        select: {
          paystackRef: true,
          customerEmail: true,
          paidAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return tickets.map((ticket) => ({
    id: ticket.id,
    attendeeName: ticket.attendeeName,
    attendeeEmail: ticket.attendeeEmail,
    attendeePhone: ticket.attendeePhone,
    confirmationId: ticket.confirmationId,
    ticketTypeName: ticket.ticketType.name,
    eventTitle: event.title,
    eventDate: event.date,
    ticketPrice: ticket.price,
    quantity: ticket.quantity,
    status: ticket.status,
    purchaseDate: ticket.createdAt,
    paymentReference: ticket.payment?.paystackRef,
    eventType: event.eventType,
  }));
}

// ✅ FIXED: Proper typing for ticketTypes parameter and actually use it
function calculateSummary(
  attendees: EventAttendee[],
  ticketTypes: TicketType[]
): AttendeeExportSummary {
  const totalTickets = attendees.reduce(
    (sum, attendee) => sum + attendee.quantity,
    0
  );
  const freeTickets = attendees
    .filter((a) => a.ticketPrice === 0)
    .reduce((sum, a) => sum + a.quantity, 0);
  const paidTickets = totalTickets - freeTickets;
  const totalRevenue = attendees.reduce(
    (sum, attendee) => sum + attendee.ticketPrice * attendee.quantity,
    0
  );

  // Count by status
  const attendeesByStatus = {
    active: attendees.filter((a) => a.status === "ACTIVE").length,
    used: attendees.filter((a) => a.status === "USED").length,
    cancelled: attendees.filter((a) => a.status === "CANCELLED").length,
    refunded: attendees.filter((a) => a.status === "REFUNDED").length,
  };

  // ✅ FIXED: Now we actually use the ticketTypes parameter
  // Create a complete breakdown including ticket types with zero sales
  const ticketTypeMap = new Map<string, { count: number; revenue: number }>();

  // Initialize all ticket types (even those with zero sales)
  ticketTypes.forEach((ticketType) => {
    ticketTypeMap.set(ticketType.name, { count: 0, revenue: 0 });
  });

  // Add actual sales data
  attendees.forEach((attendee) => {
    const existing = ticketTypeMap.get(attendee.ticketTypeName) || {
      count: 0,
      revenue: 0,
    };
    ticketTypeMap.set(attendee.ticketTypeName, {
      count: existing.count + attendee.quantity,
      revenue: existing.revenue + attendee.ticketPrice * attendee.quantity,
    });
  });

  const attendeesByTicketType = Array.from(ticketTypeMap.entries()).map(
    ([name, data]) => ({
      ticketTypeName: name,
      count: data.count,
      revenue: data.revenue,
    })
  );

  return {
    totalAttendees: new Set(attendees.map((a) => a.attendeeEmail)).size, // Unique attendees
    totalTickets,
    freeTickets,
    paidTickets,
    totalRevenue,
    attendeesByStatus,
    attendeesByTicketType,
  };
}
