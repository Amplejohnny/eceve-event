import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  
  console.log("=== WEBHOOK DEBUG RECEIVED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Headers:", JSON.stringify(headers, null, 2));
  console.log("Body:", body);
  console.log("=== END WEBHOOK DEBUG ===");
  
  return NextResponse.json({ 
    received: true, 
    timestamp: new Date().toISOString() 
  });
}

export async function GET() {
  return NextResponse.json({ 
    message: "Webhook debug endpoint is working",
    timestamp: new Date().toISOString()
  });
}