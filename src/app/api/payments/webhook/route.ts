/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendTicketConfirmation } from "@/lib/email";
import crypto from "crypto";
import type {
  TicketStatus,
  PaymentStatus,
  Event,
  TicketType,
  User,
  Payment,
} from "@/generated/prisma";
import { db } from "@/lib/db";
import { updatePayment } from "@/lib/payment-utils";
import { generateConfirmationId, formatDate } from "@/lib/utils";

// Define proper interfaces
interface PaystackWebhookData {
  reference: string;
  status: string;
  metadata?: Record<string, any>;
  amount: number;
  currency: string;
  customer: {
    email: string;
    customer_code: string;
  };
}

interface PaystackWebhookEvent {
  event: string;
  data: PaystackWebhookData;
}

interface TicketOrderData {
  ticketTypeId: string;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
}

interface PaymentMetadata {
  tickets: TicketOrderData[];
  eventId: string;
}

interface PaymentWithRelations extends Payment {
  event: Event & {
    ticketTypes: TicketType[];
    organizer: User;
  };
}

interface TicketCreateData {
  eventId: string;
  ticketTypeId: string;
  paymentId: string;
  price: number;
  quantity: number;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  confirmationId: string;
  status: TicketStatus;
}

interface EmailGroup {
  email: string;
  name: string;
  ticketTypes: string[];
  confirmationIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // Verify webhook signature
    if (!signature || !verifyPaystackWebhook(body, signature)) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 }
      );
    }

    const event: PaystackWebhookEvent = JSON.parse(body);

    if (event.event === "charge.success") {
      await handlePaymentSuccess(event.data);
    }

    return NextResponse.json({ message: "Webhook processed" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { message: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function verifyPaystackWebhook(payload: string, signature: string): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const hash = crypto
    .createHmac("sha512", secretKey)
    .update(payload, "utf8")
    .digest("hex");

  return hash === signature;
}

async function handlePaymentSuccess(data: PaystackWebhookData): Promise<void> {
  const { reference, status } = data;

  if (status !== "success") return;

  try {
    // Find the payment record with proper typing
    const payment = (await db.payment.findUnique({
      where: { paystackRef: reference },
      include: {
        event: {
          include: {
            ticketTypes: true,
            organizer: true,
          },
        },
      },
    })) as PaymentWithRelations | null;

    if (!payment || payment.status === "COMPLETED") {
      return; // Already processed or not found
    }

    // Update payment status
    await updatePayment(reference, {
      status: "COMPLETED" as PaymentStatus,
      paidAt: new Date(),
      webhookData: data as any,
    });

    // Type-safe metadata parsing
    const ticketData = payment.metadata as unknown as PaymentMetadata;

    if (!ticketData?.tickets || !Array.isArray(ticketData.tickets)) {
      throw new Error("Invalid ticket data in payment metadata");
    }

    // Create tickets for each ticket type ordered
    const ticketsToCreate: TicketCreateData[] = [];

    for (const ticketOrder of ticketData.tickets) {
      const ticketType = payment.event.ticketTypes.find(
        (t) => t.id === ticketOrder.ticketTypeId
      );

      if (!ticketType) {
        console.warn(`Ticket type ${ticketOrder.ticketTypeId} not found`);
        continue;
      }

      for (let i = 0; i < ticketOrder.quantity; i++) {
        const confirmationId = generateConfirmationId();

        ticketsToCreate.push({
          eventId: payment.eventId,
          ticketTypeId: ticketOrder.ticketTypeId,
          paymentId: payment.id,
          price: ticketType.price,
          quantity: 1,
          attendeeName: ticketOrder.attendeeName,
          attendeeEmail: ticketOrder.attendeeEmail,
          attendeePhone: ticketOrder.attendeePhone || null,
          confirmationId,
          status: "ACTIVE" as TicketStatus,
        });
      }
    }

    if (ticketsToCreate.length === 0) {
      throw new Error("No valid tickets to create");
    }

    // Create all tickets in batch
    await db.ticket.createMany({
      data: ticketsToCreate,
    });

    // Send confirmation emails for each unique email
    const emailGroups = groupTicketsByEmail(ticketsToCreate, payment.event);

    for (const emailGroup of emailGroups) {
      try {
        await sendTicketConfirmation({
          attendeeEmail: emailGroup.email,
          attendeeName: emailGroup.name,
          eventTitle: payment.event.title,
          eventDate: formatDate(payment.event.date.toISOString()),
          eventLocation: payment.event.venue || payment.event.location,
          ticketType: emailGroup.ticketTypes.join(", "),
          confirmationId: emailGroup.confirmationIds.join(", "),
          eventId: payment.event.id,
        });
      } catch (emailError) {
        // Log email error but don't fail the entire webhook
        console.error(
          `Failed to send confirmation email to ${emailGroup.email}:`,
          emailError
        );
      }
    }
  } catch (error) {
    console.error("Error processing successful payment:", error);
    throw error;
  }
}

function groupTicketsByEmail(
  tickets: TicketCreateData[],
  event: Event & { ticketTypes: TicketType[] }
): EmailGroup[] {
  const groups: Record<string, EmailGroup> = {};

  tickets.forEach((ticket) => {
    if (!groups[ticket.attendeeEmail]) {
      groups[ticket.attendeeEmail] = {
        email: ticket.attendeeEmail,
        name: ticket.attendeeName,
        ticketTypes: [],
        confirmationIds: [],
      };
    }

    const ticketType = event.ticketTypes.find(
      (t) => t.id === ticket.ticketTypeId
    );

    if (ticketType) {
      groups[ticket.attendeeEmail].ticketTypes.push(ticketType.name);
    }
    groups[ticket.attendeeEmail].confirmationIds.push(ticket.confirmationId);
  });

  return Object.values(groups);
}
