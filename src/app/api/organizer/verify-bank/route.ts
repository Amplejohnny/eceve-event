import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: "Account number and bank code are required" },
        { status: 400 }
      );
    }

    // Validate account number format (10 digits for Nigerian banks)
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Invalid account number format" },
        { status: 400 }
      );
    }

    // Verify bank account using Paystack
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
      const errorData = await response.json();
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "Bank verification failed",
        },
        { status: 400 }
      );
    }

    const data = await response.json();

    if (data.status && data.data) {
      return NextResponse.json({
        success: true,
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
        bankId: data.data.bank_id,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid account details",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying bank account:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Bank verification failed",
      },
      { status: 500 }
    );
  }
}
