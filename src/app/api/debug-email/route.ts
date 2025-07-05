// app/api/debug-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmailWithDebug } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is required' 
      }, { status: 400 });
    }

    console.log('🚀 Starting debug email send to:', email);
    
    const result = await sendTestEmailWithDebug(email);

    return NextResponse.json({ 
      success: true, 
      message: `Debug email sent to ${email}`,
      details: {
        messageId: result.messageId,
        response: result.response,
        accepted: result.accepted,
        rejected: result.rejected
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Debug email API error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to send debug email',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}