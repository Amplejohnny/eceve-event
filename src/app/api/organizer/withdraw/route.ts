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

    // Create withdrawal request
    const withdrawal = await db.payout.create({
      data: {
        amount,
        bankAccount: accountNumber,
        bankCode,
        accountName: bankVerification.account_name,
        reason: reason || "Withdrawal request",
        organizerId: userId,
        status: "PENDING",
      },
    });

    // Try to initiate transfer immediately
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
            name: bankVerification.account_name,
            account_number: accountNumber,
            bank_code: bankCode,
          }),
        }
      );

      if (recipientResponse.ok) {
        const recipientData = await recipientResponse.json();

        // Initiate transfer
        const transferData = await initiateTransfer({
          amount,
          recipient: recipientData.data.recipient_code,
          reason: reason || "Event ticket sales withdrawal",
        });

        // Update withdrawal with Paystack reference
        await db.payout.update({
          where: { id: withdrawal.id },
          data: {
            paystackRef: transferData.reference,
            transferCode: transferData.transfer_code,
            status: "PROCESSING",
          },
        });

        return NextResponse.json({
          message: "Withdrawal request submitted successfully",
          withdrawal: {
            ...withdrawal,
            paystackRef: transferData.reference,
            transferCode: transferData.transfer_code,
            status: "PROCESSING",
          },
        });
      }
    } catch (transferError) {
      console.error("Transfer initiation failed:", transferError);
      // Withdrawal is still created but marked as pending
      // It will be processed manually or retried later
    }

    return NextResponse.json({
      message: "Withdrawal request submitted successfully",
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
