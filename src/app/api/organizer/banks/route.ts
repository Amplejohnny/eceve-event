import { type NextRequest, NextResponse } from "next/server";

// Cache banks data to avoid repeated API calls
let banksCache: any[] = [];
let cacheExpiry: number = 0;

export async function GET(_request: NextRequest) {
  try {
    // Check if cache is still valid (cache for 24 hours)
    const now = Date.now();
    if (banksCache.length > 0 && now < cacheExpiry) {
      return NextResponse.json({ banks: banksCache });
    }

    // Fetch banks from Paystack
    const response = await fetch("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch banks");
    }

    const data = await response.json();

    // Filter only Nigerian banks and sort by name
    const banks = data.data
      .filter((bank: any) => bank.country === "Nigeria")
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map((bank: any) => ({
        id: bank.id,
        name: bank.name,
        code: bank.code,
        active: bank.active,
        country: bank.country,
        currency: bank.currency,
        type: bank.type,
      }));

    // Update cache
    banksCache = banks;
    cacheExpiry = now + 24 * 60 * 60 * 1000; // 24 hours

    return NextResponse.json({ banks });
  } catch (error) {
    console.error("Error fetching banks:", error);
    return NextResponse.json(
      { error: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
