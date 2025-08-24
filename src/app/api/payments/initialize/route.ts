import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculatePaymentBreakdown,
  validatePaymentAmount,
  createPayment,
} from "@/lib/payment-utils";
import type { PaymentBreakdown } from "@/lib/payment-utils";
import { paymentInitSchema } from "@/lib/validation";
import { ZodError } from "zod";

interface PaymentMetadata {
  tickets: {
    ticketTypeId: string;
    quantity: number;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone?: string;
  }[];
  event: {
    title: string;
    date: string;
    location: string;
  };
  paymentBreakdown: PaymentBreakdown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = paymentInitSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid input data",
            errors: error.errors.map(
              (e) => `${e.path.join(".")}: ${e.message}`
            ),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const { eventId, tickets, amount, customerEmail } = validatedData;

    // Validate event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        organizer: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // Validate ticket types and availability
    for (const ticket of tickets) {
      const ticketType = event.ticketTypes.find(
        (t) => t.id === ticket.ticketTypeId
      );
      if (!ticketType) {
        return NextResponse.json(
          {
            success: false,
            message: `Ticket type not found: ${ticket.ticketTypeId}`,
          },
          { status: 400 }
        );
      }

      // Check availability if quantity is limited
      if (ticketType.quantity) {
        const soldTickets = await db.ticket.count({
          where: {
            ticketTypeId: ticket.ticketTypeId,
            status: { in: ["ACTIVE", "USED"] },
          },
        });

        if (soldTickets + ticket.quantity > ticketType.quantity) {
          return NextResponse.json(
            {
              success: false,
              message: `Not enough tickets available for ${ticketType.name}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Calculate actual amounts using utility function
    const ticketSubtotal = tickets.reduce((sum, ticket) => {
      const ticketType = event.ticketTypes.find(
        (t) => t.id === ticket.ticketTypeId
      )!;
      return sum + ticketType.price * ticket.quantity;
    }, 0);

    const paymentBreakdown = calculatePaymentBreakdown(ticketSubtotal);

    // Verify the amount matches what client sent
    if (!validatePaymentAmount(amount, paymentBreakdown.totalAmount)) {
      return NextResponse.json(
        { success: false, message: "Amount mismatch" },
        { status: 400 }
      );
    }

    // Generate unique reference
    const reference = `COMF_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 11)}`;

    // Create payment record
    const paymentMetadata: PaymentMetadata = {
      tickets,
      event: {
        title: event.title,
        date: event.date.toISOString(),
        location: event.location,
      },
      paymentBreakdown: {
        ticketSubtotal: paymentBreakdown.ticketSubtotal,
        paystackFee: paymentBreakdown.paystackFee,
        totalAmount: paymentBreakdown.totalAmount,
        organizerAmount: paymentBreakdown.organizerAmount,
        platformAmount: paymentBreakdown.platformAmount,
      },
    };

    const payment = await createPayment({
      paystackRef: reference,
      amount: paymentBreakdown.totalAmount,
      platformFee: paymentBreakdown.paystackFee,
      organizerAmount: paymentBreakdown.organizerAmount,
      customerEmail,
      eventId,
      status: "PENDING",
      metadata: paymentMetadata,
    });

    // Initialize Paystack payment
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference,
          email: customerEmail,
          amount: paymentBreakdown.totalAmount,
          currency: "NGN",
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
          metadata: {
            payment_id: payment.id,
            event_id: eventId,
            event_title: event.title,
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      // Delete the payment record if Paystack initialization fails
      await db.payment.delete({ where: { id: payment.id } });

      return NextResponse.json(
        { success: false, message: "Payment initialization failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      access_code: paystackData.data.access_code,
      reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
