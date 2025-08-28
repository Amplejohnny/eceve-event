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
// import { updatePayment } from "@/lib/payment-utils";
import { generateConfirmationId, formatDate, formatTime } from "@/lib/utils";

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

interface PaymentMetadataFromDB {
  tickets: TicketOrderData[];
  event: {
    title: string;
    date: string;
    location: string;
  };
  paymentBreakdown: {
    ticketSubtotal: number;
    paystackFee: number;
    totalAmount: number;
    organizerAmount: number;
    platformAmount: number;
  };
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
  tickets: Array<{
    ticketType: string;
    confirmationId: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    console.log("Webhook received:", {
      hasSignature: !!signature,
      bodyLength: body.length,
    });

    // Verify webhook signature
    if (!signature || !verifyPaystackWebhook(body, signature)) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 }
      );
    }

    const event: PaystackWebhookEvent = JSON.parse(body);
    console.log("Webhook event:", {
      event: event.event,
      reference: event.data?.reference,
      status: event.data?.status,
    });

    if (event.event === "charge.success") {
      console.log("Processing charge.success webhook...");
      await handlePaymentSuccess(event.data);
      console.log("Charge.success webhook processed successfully");
    } else {
      console.log(`Ignoring webhook event: ${event.event}`);
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
  console.log(
    `Processing payment success for reference: ${reference}, status: ${status}`
  );

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

    if (!payment) {
      console.log(`Payment not found for reference: ${reference}`);
      return;
    }

    console.log(
      `Payment found: ${payment.id}, current status: ${payment.status}`
    );

    if (payment.status === "COMPLETED") {
      console.log(`Payment already processed for reference: ${reference}`);
      return; // Already processed
    }

    console.log("Starting transaction to update payment and create tickets...");

    // Start transaction for atomic operations
    await db.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { paystackRef: reference },
        data: {
          status: "COMPLETED" as PaymentStatus,
          paidAt: new Date(),
          webhookData: data as any,
        },
      });

      // Parse metadata and create tickets (same as before)
      let ticketData: PaymentMetadataFromDB;
      try {
        const rawMetadata = payment.metadata as unknown;
        if (typeof rawMetadata === "string") {
          ticketData = JSON.parse(rawMetadata) as PaymentMetadataFromDB;
        } else if (rawMetadata && typeof rawMetadata === "object") {
          ticketData = rawMetadata as PaymentMetadataFromDB;
        } else {
          throw new Error("Invalid metadata format");
        }

        if (!ticketData?.tickets || !Array.isArray(ticketData.tickets)) {
          throw new Error("Invalid ticket data in payment metadata");
        }
      } catch (parseError) {
        console.error("Failed to parse payment metadata:", parseError);
        throw new Error("Failed to parse payment metadata");
      }

      // Create tickets (as shown in previous fix)
      const ticketsToCreate: TicketCreateData[] = [];

      for (const ticketOrder of ticketData.tickets) {
        if (
          !ticketOrder.ticketTypeId ||
          !ticketOrder.attendeeName ||
          !ticketOrder.attendeeEmail
        ) {
          console.warn("Incomplete ticket order data:", ticketOrder);
          continue;
        }

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

      // Create tickets within transaction
      await tx.ticket.createMany({
        data: ticketsToCreate,
      });

      console.log(
        `Created ${ticketsToCreate.length} tickets for payment ${payment.id}`
      );
    });

    // After successful transaction, send emails
    const finalPayment = await db.payment.findUnique({
      where: { paystackRef: reference },
      include: {
        event: {
          include: { ticketTypes: true },
        },
        tickets: true,
      },
    });

    if (finalPayment && finalPayment.tickets.length > 0) {
      const emailGroups = groupTicketsByEmail(
        finalPayment.tickets.map((t) => ({
          eventId: t.eventId,
          ticketTypeId: t.ticketTypeId,
          paymentId: t.paymentId || "",
          price: t.price,
          quantity: t.quantity,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          attendeePhone: t.attendeePhone,
          confirmationId: t.confirmationId,
          status: t.status,
        })),
        finalPayment.event
      );

      // Send emails (as shown in previous fix)
      for (const emailGroup of emailGroups) {
        try {
          await sendTicketConfirmation({
            attendeeEmail: emailGroup.email,
            attendeeName: emailGroup.name,
            eventTitle: finalPayment.event.title,
            eventDate: formatDate(finalPayment.event.date.toISOString()),
            eventEndDate: finalPayment.event.endDate
              ? formatDate(finalPayment.event.endDate.toISOString())
              : "TBA",
            eventLocation:
              finalPayment.event.venue || finalPayment.event.location,
            eventTime: formatTime(finalPayment.event.startTime) || "TBA",
            tickets: emailGroup.tickets,
            eventId: finalPayment.event.id,
          });
          console.log(`Sent ticket confirmation to ${emailGroup.email}`);
        } catch (emailError) {
          console.error(
            `Failed to send confirmation email to ${emailGroup.email}:`,
            emailError
          );
        }
      }
    }

    console.log(`Payment processing completed for reference: ${reference}`);
  } catch (error) {
    console.error("Error processing successful payment:", error);
    // Mark payment as failed if ticket creation fails
    try {
      await db.payment.update({
        where: { paystackRef: reference },
        data: {
          status: "FAILED" as PaymentStatus,
          webhookData: {
            error: error instanceof Error ? error.message : String(error),
            originalData: data,
          } as any,
        },
      });
    } catch (updateError) {
      console.error("Failed to update payment status to FAILED:", updateError);
    }
    throw error;
  }
}

function groupTicketsByEmail(
  tickets: TicketCreateData[],
  event: Event & { ticketTypes: TicketType[] }
): EmailGroup[] {
  const groups: Record<string, EmailGroup> = {};

  tickets.forEach((ticket) => {
    const email = ticket.attendeeEmail.toLowerCase(); // Normalize email for grouping

    if (!groups[email]) {
      groups[email] = {
        email: ticket.attendeeEmail,
        name: ticket.attendeeName,
        tickets: [],
      };
    }

    const ticketType = event.ticketTypes.find(
      (t) => t.id === ticket.ticketTypeId
    );

    if (ticketType) {
      groups[email].tickets.push({
        ticketType: ticketType.name,
        confirmationId: ticket.confirmationId,
        quantity: 1, // Each ticket is quantity 1
      });
    }
  });

  return Object.values(groups);
}
