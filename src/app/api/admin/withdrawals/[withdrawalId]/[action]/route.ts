import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import {
  sendWithdrawalApprovedEmail,
  sendWithdrawalRejectedEmail,
  sendWithdrawalCompletedEmail,
} from "@/lib/email";
import { fromKobo } from "@/lib/utils";

// Paystack transfer initiation function
async function initiatePaystackTransfer(data: {
  amount: number;
  recipient: string;
  bankCode: string;
  accountName: string;
  reason: string;
}) {
  try {
    // First, create recipient if not exists
    const recipientResponse = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: data.accountName,
          account_number: data.recipient,
          bank_code: data.bankCode,
        }),
      }
    );

    if (!recipientResponse.ok) {
      throw new Error("Failed to create transfer recipient");
    }

    const recipientData = await recipientResponse.json();

    // Initiate transfer
    const transferResponse = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: data.amount * 100, // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reason: data.reason,
      }),
    });

    if (!transferResponse.ok) {
      throw new Error("Transfer initiation failed");
    }

    const result = await transferResponse.json();
    return result.data;
  } catch (error) {
    console.error("Paystack transfer error:", error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ withdrawalId: string; action: string }> }
) {
  // Declare action and withdrawalId in outer scope for catch block access
  let action: string | undefined = undefined;
  let withdrawalId: string | undefined = undefined;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Await the params
    const params = await context.params;
    withdrawalId = params.withdrawalId;
    action = params.action;

    // const { withdrawalId, action } = await context.params;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Get the withdrawal request with organizer information
    const withdrawal = await db.payout.findUnique({
      where: { id: withdrawalId },
      include: {
        organizer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal not found" },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: "Withdrawal is not in pending status" },
        { status: 400 }
      );
    }

    let newStatus: string;
    let processedAt: Date | undefined;
    let paystackRef: string | undefined;
    let transferCode: string | undefined;

    if (action === "approve") {
      // Check for required fields
      if (
        !withdrawal.bankAccount ||
        !withdrawal.bankCode ||
        !withdrawal.accountName
      ) {
        return NextResponse.json(
          { error: "Missing required bank account information" },
          { status: 400 }
        );
      }

      try {
        // Initiate Paystack transfer
        const transferData = await initiatePaystackTransfer({
          amount: withdrawal.amount,
          recipient: withdrawal.bankAccount,
          bankCode: withdrawal.bankCode,
          accountName: withdrawal.accountName,
          reason: withdrawal.reason || "Event ticket sales withdrawal",
        });

        // Update withdrawal with Paystack reference
        paystackRef = transferData.reference;
        transferCode = transferData.transfer_code;

        // Check if transfer was successful
        if (transferData.status === "success") {
          newStatus = "COMPLETED";
        } else {
          newStatus = "PROCESSING";
        }

        processedAt = new Date();

        // Send approval email notification
        try {
          await sendWithdrawalApprovedEmail({
            organizerEmail: withdrawal.organizer.email,
            organizerName: withdrawal.organizer.name || "Organizer",
            amount: fromKobo(withdrawal.amount),
            accountName: withdrawal.accountName!,
            bankAccount: withdrawal.bankAccount!,
            bankName: withdrawal.bankCode!,
            withdrawalId: withdrawal.id,
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
          // Don't fail the whole operation if email fails
        }
      } catch (transferError) {
        console.error("Paystack transfer failed:", transferError);
        // Mark as processing for manual review
        newStatus = "PROCESSING";
        processedAt = new Date();

        // Still send approval email but mention manual processing
        try {
          await sendWithdrawalApprovedEmail({
            organizerEmail: withdrawal.organizer.email,
            organizerName: withdrawal.organizer.name || "Organizer",
            amount: fromKobo(withdrawal.amount),
            accountName: withdrawal.accountName!,
            bankAccount: withdrawal.bankAccount!,
            bankName: withdrawal.bankCode!,
            withdrawalId: withdrawal.id,
          });
        } catch (emailError) {
          console.error("Failed to send approval email:", emailError);
        }
      }
    } else {
      // For rejection
      newStatus = "CANCELLED";
      processedAt = new Date();

      // Send rejection email notification
      try {
        await sendWithdrawalRejectedEmail({
          organizerEmail: withdrawal.organizer.email,
          organizerName: withdrawal.organizer.name || "Organizer",
          amount: fromKobo(withdrawal.amount),
          reason: "Rejected by admin",
          withdrawalId: withdrawal.id,
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Don't fail the whole operation if email fails
      }
    }

    // Update the withdrawal status
    const updatedWithdrawal = await db.payout.update({
      where: { id: withdrawalId },
      data: {
        status: newStatus as any, // Type assertion for enum compatibility
        processedAt,
        paystackRef,
        transferCode,
        reason: action === "reject" ? "Rejected by admin" : undefined,
      },
    });

    // If transfer was completed, send completion email
    if (newStatus === "COMPLETED" && paystackRef) {
      try {
        await sendWithdrawalCompletedEmail({
          organizerEmail: withdrawal.organizer.email,
          organizerName: withdrawal.organizer.name || "Organizer",
          amount: fromKobo(withdrawal.amount),
          accountName: withdrawal.accountName!,
          bankAccount: withdrawal.bankAccount!,
          bankName: withdrawal.bankCode!,
          withdrawalId: withdrawal.id,
          paystackRef,
          completedAt: processedAt!.toISOString(),
        });
      } catch (emailError) {
        console.error("Failed to send completion email:", emailError);
      }
    }

    return NextResponse.json({
      message: `Withdrawal ${action}d successfully`,
      withdrawal: updatedWithdrawal,
      paystackRef,
      transferCode,
    });
  } catch (error) {
    console.error(`Error ${action}ing withdrawal:`, error);
    return NextResponse.json(
      { error: `Failed to ${action} withdrawal` },
      { status: 500 }
    );
  }
}
