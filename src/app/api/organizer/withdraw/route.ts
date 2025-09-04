import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { db } from "@/lib/db";

// Paystack bank verification function
async function verifyBankAccount(accountNumber: string, bankCode: string) {
  try {
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Bank verification failed");
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Bank verification error:", error);
    throw error;
  }
}

// Paystack transfer initiation function
async function initiateTransfer(data: {
  amount: number;
  recipient: string;
  reason: string;
}) {
  try {
    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "balance",
        amount: data.amount * 100, // Convert to kobo
        recipient: data.recipient,
        reason: data.reason,
      }),
    });

    if (!response.ok) {
      throw new Error("Transfer initiation failed");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Transfer initiation error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { amount, bankCode, accountNumber, accountName, reason } = body;

    // Validate input
    if (!amount || !bankCode || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Check available balance
    const earnings = await db.payment.aggregate({
      where: {
        event: { organizerId: userId },
        status: "COMPLETED",
      },
      _sum: { organizerAmount: true },
    });

    const totalEarnings = earnings._sum.organizerAmount || 0;

    const pendingWithdrawals = await db.payout.aggregate({
      where: {
        organizerId: userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amount: true },
    });

    const pendingAmount = pendingWithdrawals._sum.amount || 0;
    const availableBalance = totalEarnings - pendingAmount;

    if (amount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Verify bank account
    let bankVerification;
    try {
      bankVerification = await verifyBankAccount(accountNumber, bankCode);
    } catch (error) {
      console.error("Bank verification error:", error);
      return NextResponse.json(
        { error: "Invalid bank account details" },
        { status: 400 }
      );
    }

    // Verify account name matches
    if (
      bankVerification.account_name.toLowerCase() !== accountName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Account name does not match bank records" },
        { status: 400 }
      );
    }

    // Create withdrawal request with PENDING status for admin approval
    const withdrawal = await db.payout.create({
      data: {
        amount,
        bankAccount: accountNumber,
        bankCode,
        accountName: bankVerification.account_name,
        reason: reason || "Withdrawal request",
        organizerId: userId,
        status: "PENDING", // Always start as pending for admin approval
      },
    });

    return NextResponse.json({
      message:
        "Withdrawal request submitted successfully and pending admin approval",
      withdrawal,
    });
  } catch (error) {
    console.error("Error creating withdrawal request:", error);
    return NextResponse.json(
      { error: "Failed to create withdrawal request" },
      { status: 500 }
    );
  }
}
