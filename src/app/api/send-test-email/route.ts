import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sendVerificationRequest } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      }, { status: 400 });
    }

    // Send a test verification email
    await sendVerificationRequest({
      identifier: email,
      url: `${process.env.NEXTAUTH_URL}/auth/verify-request?token=test-token&email=${email}`,
      token: 'test-token',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      provider: {
        id: 'email',
        type: 'email',
        name: 'Email',
        server: {},
        from: process.env.FROM_EMAIL || process.env.SMTP_USER || '',
        maxAge: 24 * 60 * 60, 
        options: {},
        sendVerificationRequest,
      },
      theme: { colorScheme: 'light' }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Test verification email sent to ${email}` 
    }, { status: 200 });

  } catch (error) {
    console.error('Send test email error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}