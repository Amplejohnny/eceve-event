/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateConfirmationId, formatDate, formatTime } from "@/lib/utils";
import { sendTicketConfirmation } from "@/lib/email";
import type { TicketStatus } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Reference is required" },
        { status: 400 }
      );
    }

    // console.log(`Verifying payment for reference: ${reference}`);

    // Verify with Paystack first
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackData = await paystackResponse.json();
    // console.log(`Paystack verification result:`, paystackData);

    if (!paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({
        success: false,
        message: "Payment not successful",
        paystackStatus: paystackData.data?.status,
      });
    }

    // Find payment in database
    let payment = await db.payment.findUnique({
      where: { paystackRef: reference },
      include: {
        event: true,
        tickets: true,
      },
    });

    if (!payment) {
      // console.log(`Payment record not found for reference: ${reference}`);
      return NextResponse.json({
        success: false,
        message: "Payment record not found",
      });
    }

    console.log(
      `Payment found. Status: ${payment.status}, Tickets count: ${payment.tickets.length}`
    );

    // If payment is successful but no tickets exist, wait for webhook processing
    if (payment.status === "COMPLETED" && payment.tickets.length === 0) {
      console.log(
        "Payment completed but no tickets found. Waiting for webhook processing..."
      );

      // Wait up to 10 seconds for webhook processing
      let retries = 20; // 20 * 500ms = 10 seconds

      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        payment = await db.payment.findUnique({
          where: { paystackRef: reference },
          include: {
            event: true,
            tickets: true,
          },
        });

        if (!payment) {
          console.log("Payment record disappeared during retry");
          break;
        }

        console.log(
          `Retry ${21 - retries}: Payment status: ${payment.status}, Tickets: ${
            payment.tickets.length
          }`
        );

        if (payment.tickets.length > 0) {
          console.log("Tickets found after waiting!");
          break;
        }

        retries--;
      }
    }

    // If payment is still PENDING, it might mean webhook hasn't been called yet
    if (payment && payment.status === "PENDING") {
      console.log(
        "Payment still pending. Webhook may not have been called yet."
      );

      // Try to trigger webhook processing manually by checking if we should update status
      // This is a fallback in case webhook delivery failed
      try {
        await db.payment.update({
          where: { paystackRef: reference },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            webhookData: paystackData.data as any,
          },
        });
        console.log("Manually updated payment status to COMPLETED");

        // Since webhook didn't work, create tickets manually
        console.log("Webhook failed - creating tickets manually...");
        await createTicketsManually(reference);

        // Force refresh payment data
        payment = await db.payment.findUnique({
          where: { paystackRef: reference },
          include: {
            event: true,
            tickets: true,
          },
        });

        // Force refresh payment data
        payment = await db.payment.findUnique({
          where: { paystackRef: reference },
          include: {
            event: true,
            tickets: true,
          },
        });
      } catch (updateError) {
        console.error("Failed to manually update payment status:", updateError);
      }
    }

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Payment record not found after processing",
      });
    }

    // If we still don't have tickets, return more specific error info
    if (payment.tickets.length === 0) {
      console.error(
        `No tickets found for payment ${payment.id} with reference ${reference}`
      );

      return NextResponse.json({
        success: false,
        message:
          "Tickets are being processed. Please wait a moment and refresh the page.",
        status: payment.status,
        eventTitle: payment.event.title,
        paymentId: payment.id,
        debug: {
          paymentStatus: payment.status,
          paidAt: payment.paidAt,
          webhookData: payment.webhookData ? "Present" : "Missing",
        },
      });
    }

    // Success case - tickets exist
    const confirmationIds = payment.tickets.map(
      (ticket) => ticket.confirmationId
    );

    console.log(
      `Successfully verified payment. Confirmation IDs: ${confirmationIds.join(
        ", "
      )}`
    );

    return NextResponse.json({
      success: true,
      status: payment.status,
      eventTitle: payment.event.title,
      confirmationIds,
      ticketCount: payment.tickets.length,
      amount: payment.amount,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed" },
      { status: 500 }
    );
  }

  async function createTicketsManually(reference: string) {
    try {
      const payment = await db.payment.findUnique({
        where: { paystackRef: reference },
        include: {
          event: {
            include: {
              ticketTypes: true,
            },
          },
        },
      });

      if (!payment || !payment.metadata) {
        throw new Error("Payment or metadata not found");
      }

      console.log("Creating tickets manually for payment:", payment.id);

      // Parse metadata
      let ticketData: any;
      if (typeof payment.metadata === "string") {
        ticketData = JSON.parse(payment.metadata);
      } else {
        ticketData = payment.metadata;
      }

      if (!ticketData?.tickets || !Array.isArray(ticketData.tickets)) {
        throw new Error("Invalid ticket data in payment metadata");
      }

      // Create tickets
      const ticketsToCreate = [];

      for (const ticketOrder of ticketData.tickets) {
        const ticketType = payment.event.ticketTypes.find(
          (t) => t.id === ticketOrder.ticketTypeId
        );

        if (!ticketType) {
          console.warn(`Ticket type ${ticketOrder.ticketTypeId} not found`);
          continue;
        }

        for (let i = 0; i < ticketOrder.quantity; i++) {
          ticketsToCreate.push({
            eventId: payment.eventId,
            ticketTypeId: ticketOrder.ticketTypeId,
            paymentId: payment.id,
            price: ticketType.price,
            quantity: 1,
            attendeeName: ticketOrder.attendeeName,
            attendeeEmail: ticketOrder.attendeeEmail,
            attendeePhone: ticketOrder.attendeePhone || null,
            confirmationId: generateConfirmationId(),
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

      console.log(`Created ${ticketsToCreate.length} tickets manually`);

      // Send confirmation emails
      const emailGroups: { [email: string]: any } = {};

      ticketsToCreate.forEach((ticket) => {
        if (!emailGroups[ticket.attendeeEmail]) {
          emailGroups[ticket.attendeeEmail] = {
            email: ticket.attendeeEmail,
            name: ticket.attendeeName,
            confirmationIds: [],
            ticketTypes: [],
          };
        }
        emailGroups[ticket.attendeeEmail].confirmationIds.push(
          ticket.confirmationId
        );

        const ticketType = payment.event.ticketTypes.find(
          (t) => t.id === ticket.ticketTypeId
        );
        if (
          ticketType &&
          !emailGroups[ticket.attendeeEmail].ticketTypes.includes(
            ticketType.name
          )
        ) {
          emailGroups[ticket.attendeeEmail].ticketTypes.push(ticketType.name);
        }
      });

      // Send confirmation emails
      for (const group of Object.values(emailGroups)) {
        try {
          await sendTicketConfirmation({
            attendeeEmail: group.email,
            attendeeName: group.name,
            eventTitle: payment.event.title,
            eventDate: formatDate(payment.event.date.toISOString()),
            eventEndDate: payment.event.endDate
              ? formatDate(payment.event.endDate.toISOString())
              : "TBA",
            eventLocation: payment.event.venue || payment.event.location,
            eventTime: formatTime(payment.event.startTime) || "TBA",
            ticketType: group.ticketTypes.join(", "),
            confirmationId: group.confirmationIds.join(", "),
            eventId: payment.event.id,
          });
          console.log(`Sent confirmation email to ${group.email}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${group.email}:`, emailError);
        }
      }
    } catch (error) {
      console.error("Manual ticket creation failed:", error);
      throw error;
    }
  }
}
