import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  // console.log("Email verification API called");

  try {
    const { token, email } = await request.json();
    // console.log("Token:", token ? "present" : "missing");
    // console.log("Email:", email);

    if (!token || !email) {
      // console.log("Missing required fields:", { token: !!token, email: !!email });
      return NextResponse.json(
        {
          success: false,
          message: "Token and email are required",
        },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(token, email);

    if (result.success) {
      // console.log("Email verification successful for:", email);
      return NextResponse.json(result, { status: 200 });
    } else {
      // console.log("Email verification failed:", result.message);
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error("Email verification API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during email verification",
      },
      { status: 500 }
    );
  }
}

// Alternative GET method for direct URL verification (fallback)
export async function GET(request: NextRequest) {
  // console.log("=== EMAIL VERIFICATION GET REQUEST ===");

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    // console.log("GET request params:", {
    //   hasToken: !!token,
    //   tokenLength: token?.length || 0,
    //   email: email || "missing",
    //   fullUrl: request.url
    // });

    if (!token || !email) {
      // console.log("GET request missing params, redirecting to error page");
      return NextResponse.redirect(
        new URL("/auth/email-verified?error=missing_params", request.url)
      );
    }

    const result = await verifyEmailToken(token, email);

    if (result.success) {
      // console.log("GET verification successful, redirecting to success page");
      return NextResponse.redirect(
        new URL("/auth/email-verified?verified=true", request.url)
      );
    } else {
      // console.log("GET verification failed, redirecting to error page");
      return NextResponse.redirect(
        new URL(
          `/auth/email-verified?error=${encodeURIComponent(result.message)}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error("Email verification GET error:", error);
    // console.error("GET Error stack:", error instanceof Error ? error.stack : "No stack trace");

    return NextResponse.redirect(
      new URL("/auth/email-verified?error=server_error", request.url)
    );
  }
}
