import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";


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

    if (!paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({
        success: false,
        message: "Payment not successful",
        paystackStatus: paystackData.data?.status,
      });
    }

    // Find payment in database
    const payment = await db.payment.findUnique({
      where: { paystackRef: reference },
      include: {
        event: true,
        tickets: true,
      },
    });

    if (!payment) {
      return NextResponse.json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Get confirmation IDs for the tickets
    const confirmationIds = payment.tickets.map(
      (ticket) => ticket.confirmationId
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
}
