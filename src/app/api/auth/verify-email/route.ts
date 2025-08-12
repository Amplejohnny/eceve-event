import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();

    if (!token || !email) {
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
      if (result.message !== "Email already verified") {
        try {
          await sendWelcomeEmail({
            email: email,
            name: result.user?.name || "User",
          });
        } catch (error) {
          console.error("Failed to send welcome email:", error);
        }
      }

      return NextResponse.json(result, { status: 200 });
    } else {
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
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(
        new URL("/auth/email-verified?error=missing_params", request.url)
      );
    }

    const result = await verifyEmailToken(token, email);

    if (result.success) {
      if (result.message !== "Email already verified") {
        try {
          await sendWelcomeEmail({
            email: email,
            name: result.user?.name || "User",
          });
        } catch (error) {
          console.error("Failed to send welcome email:", error);
        }
      }

      return NextResponse.redirect(
        new URL("/auth/email-verified?verified=true", request.url)
      );
    } else {
      return NextResponse.redirect(
        new URL(
          `/auth/email-verified?error=${encodeURIComponent(result.message)}`,
          request.url
        )
      );
    }
  } catch (error) {
    console.error("Email verification GET error:", error);
    return NextResponse.redirect(
      new URL("/auth/email-verified?error=server_error", request.url)
    );
  }
}
