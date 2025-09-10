import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";
import {
  sendWithdrawalApprovedEmail,
  sendWithdrawalRejectedEmail,
} from "@/lib/email";
import { fromKobo } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { action } = await params;

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { withdrawalIds } = await request.json();

    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal IDs" },
        { status: 400 }
      );
    }

    // Verify all withdrawals exist and are in pending status
    const withdrawals = await db.payout.findMany({
      where: {
        id: { in: withdrawalIds },
        status: "PENDING",
      },
      include: {
        organizer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (withdrawals.length !== withdrawalIds.length) {
      return NextResponse.json(
        { error: "Some withdrawals are not found or not in pending status" },
        { status: 400 }
      );
    }

    let newStatus: "PROCESSING" | "CANCELLED";
    let processedAt: Date | undefined;

    if (action === "approve") {
      newStatus = "PROCESSING";
      processedAt = new Date();

      // TODO: Integrate with Paystack bulk transfer API
      // For now, we'll mark them as processing
    } else {
      newStatus = "CANCELLED";
      processedAt = new Date();
    }

    // Update all withdrawals in a transaction
    const updatedWithdrawals = await db.$transaction(
      withdrawalIds.map((id) =>
        db.payout.update({
          where: { id },
          data: {
            status: newStatus,
            processedAt,
            reason: action === "reject" ? "Bulk rejected by admin" : undefined,
          },
        })
      )
    );

    // Send email notifications for each processed withdrawal
    const emailPromises = withdrawals.map(async (withdrawal) => {
      try {
        if (action === "approve") {
          // Check for required fields before sending email
          if (
            withdrawal.accountName &&
            withdrawal.bankAccount &&
            withdrawal.bankCode
          ) {
            await sendWithdrawalApprovedEmail({
              organizerEmail: withdrawal.organizer.email,
              organizerName: withdrawal.organizer.name || "Organizer",
              amount: fromKobo(withdrawal.amount),
              accountName: withdrawal.accountName,
              bankAccount: withdrawal.bankAccount,
              bankName: withdrawal.bankCode,
              withdrawalId: withdrawal.id,
            });
          }
        } else {
          await sendWithdrawalRejectedEmail({
            organizerEmail: withdrawal.organizer.email,
            organizerName: withdrawal.organizer.name || "Organizer",
            amount: fromKobo(withdrawal.amount),
            reason: "Bulk rejected by admin",
            withdrawalId: withdrawal.id,
          });
        }
      } catch (emailError) {
        console.error(
          `Failed to send ${action} email for withdrawal ${withdrawal.id}:`,
          emailError
        );
        // Don't fail the whole operation if emails fail
      }
    });

    // Wait for all emails to be sent (but don't fail if some fail)
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      message: `Bulk ${action} completed successfully`,
      count: updatedWithdrawals.length,
      withdrawals: updatedWithdrawals,
    });
  } catch (error) {
    console.error(`Error bulk ${(await params).action}ing withdrawals:`, error);
    return NextResponse.json(
      { error: `Failed to bulk ${(await params).action} withdrawals` },
      { status: 500 }
    );
  }
}
