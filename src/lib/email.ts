import type { SendVerificationRequestParams } from "next-auth/providers/email";
import { createTransport } from "nodemailer";
import type { Transporter } from "nodemailer";

const currentYear = new Date().getFullYear();

// Email transporter configuration
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// Email templates
const emailTemplates = {
  verification: (url: string, email: string) => ({
    subject: "Verify your email address - Comforeve",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .no-reply { background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Comforeve</h1>
            <p>Your Event Ticketing Platform</p>
          </div>
          
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello,</p>
            <p>Thank you for signing up for Comforeve! To complete your registration and start exploring amazing events, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${url}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">${url}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This verification link will expire in 30 minutes for security reasons. If you don't verify within this time, you'll need to request a new verification link.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
              <li>Purchase tickets for events</li>
              <li>Create and manage your own events</li>
              <li>Save your favorite events</li>
              <li>Access your ticket history</li>
            </ul>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
            <div class="no-reply">
              <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
            </div>
            
            <p>Best regards,<br>The Comforeve Team</p>
          </div>
          
          <div class="footer">
            <p>© ${currentYear} Comforeve. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Verify Your Email Address - Comforeve

      Hello,

      Thank you for signing up for Comforeve! To complete your registration, please verify your email address by clicking this link:

      ${url}
      
      This link will expire in 30 minutes.
      
      If you didn't create an account with us, please ignore this email.
      
      PLEASE DO NOT REPLY TO THIS EMAIL - This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
      
      Best regards,
      The Comforeve Team
    `,
  }),

  welcomeAfterVerification: (name: string, email: string) => ({
    subject: "Welcome to Comforeve - You're all set!",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Comforeve</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .feature-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .no-reply { background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Comforeve!</h1>
            <p>Your email has been verified successfully</p>
          </div>
          
          <div class="content">
            <h2>Hello ${name}</h2>
            <p>Congratulations! Your email address has been verified and your Comforeve account is now fully activated.</p>
            
            <div class="feature-box">
              <h3>🎟️ What you can do now:</h3>
              <ul>
                <li>Browse and purchase tickets for amazing events</li>
                <li>Create and manage your own events</li>
                <li>Save your favorite events for later</li>
                <li>Access your complete ticket history</li>
                <li>Receive event reminders and updates</li>
              </ul>
            </div>
            
            <p>Ready to get started? Log in to your account using your email and password to explore what's happening in your area!</p>
            
            <p>If you have any questions or need support, don't hesitate to reach out to our team.</p>
            
            <div class="no-reply">
              <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
            </div>
            
            <p>Happy event hunting!</p>
            <p>The Comforeve Team</p>
          </div>
          
          <div class="footer">
            <p>© ${currentYear} Comforeve. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordReset: (resetUrl: string, email: string) => ({
    subject: "Reset your Comforeve password",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .no-reply { background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Password Reset</h1>
            <p>Reset your Comforeve account password</p>
          </div>
          
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your Comforeve account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">${resetUrl}</p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This reset link will expire in 1 hour for security reasons. If you don't reset within this time, you'll need to request a new reset link.
            </div>
            
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, this link can only be used once.</p>
            
            <div class="no-reply">
              <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
            </div>
            
            <p>Best regards,<br>The Comforeve Team</p>
          </div>
          
          <div class="footer">
            <p>© ${currentYear} Comforeve. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  ticketConfirmation: (ticketData: {
    attendeeEmail: string;
    attendeeName: string;
    eventTitle: string;
    eventDate: string;
    eventEndDate?: string;
    eventTime: string;
    eventLocation: string;
    tickets: Array<{
      ticketType: string;
      confirmationId: string;
      quantity?: number;
    }>;
    eventId: string;
  }) => ({
    subject: `Your ticket${ticketData.tickets.length > 1 ? "s" : ""} for ${
      ticketData.eventTitle
    } - Confirmation`,
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .ticket { background: #f8f9fa; border: 2px dashed #6b7280; margin: 15px 0; padding: 20px; border-radius: 8px; }
        .confirmation-id { font-size: 20px; font-weight: bold; color: #059669; text-align: center; margin: 10px 0; }
        .ticket-type { font-size: 16px; font-weight: bold; color: #1f2937; text-align: center; margin-bottom: 10px; }
        .event-details { margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .no-reply { background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎟️ Ticket${
            ticketData.tickets.length > 1 ? "s" : ""
          } Confirmed!</h1>
          <p>Your ticket${
            ticketData.tickets.length > 1 ? "s have" : " has"
          } been successfully booked</p>
        </div>
        
        <div class="content">
          <h2>Event Details</h2>
          <div class="event-details">
            <p><strong>Event:</strong> ${ticketData.eventTitle}</p>
            <p><strong>Date:</strong> ${ticketData.eventDate}${
      ticketData.eventEndDate ? ` to ${ticketData.eventEndDate}` : ""
    }</p>
            <p><strong>Location:</strong> ${ticketData.eventLocation}</p>
            <p><strong>Time:</strong> ${ticketData.eventTime}</p>
            <p><strong>Attendee:</strong> ${ticketData.attendeeName}</p>
          </div>
          
          <h3>Your Ticket${ticketData.tickets.length > 1 ? "s" : ""}</h3>
          ${ticketData.tickets
            .map(
              (ticket) => `
            <div class="ticket">
              <div class="ticket-type">${ticket.ticketType}${
                ticket.quantity && ticket.quantity > 1
                  ? ` (${ticket.quantity} tickets)`
                  : ""
              }</div>
              <div class="confirmation-id">${ticket.confirmationId}</div>
              <p style="text-align: center; font-size: 14px; color: #666;">Confirmation ID</p>
            </div>
          `
            )
            .join("")}
          
          <p><strong>Important:</strong> Please save this email and bring it with you to the event. You may be asked to show your confirmation ID${
            ticketData.tickets.length > 1 ? "s" : ""
          } at the entrance.</p>
          
          <p>If you have any questions, please contact the event organizer or our support team.</p>
          
          <div class="no-reply">
            <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. For questions about your ticket or the event, please contact our support team through the website.
          </div>
          
          <p>Enjoy the event!</p>
          <p>The Comforeve Team</p>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} Comforeve. All rights reserved.</p>
          <p><strong>Do not reply to this email</strong> - This is an automated message</p>
        </div>
      </div>
    </body>
    </html>
  `,
  }),

  // Withdrawal emails (production-ready)
  withdrawalApproved: (organizerData: {
    organizerEmail: string;
    organizerName: string;
    amount: number;
    accountName: string;
    bankAccount: string;
    bankName: string;
    withdrawalId: string;
  }) => ({
    subject: "Your withdrawal request was approved",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Withdrawal Approved</title>
        <style>
          body { margin:0; padding:0; background:#f6f7f9; color:#111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
          .wrapper { width:100%; background:#f6f7f9; padding:24px 0; }
          .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.1); }
          .header { background:#111827; color:#ffffff; padding:20px 24px; }
          .brand { font-size:18px; font-weight:700; letter-spacing:.2px; }
          .subbrand { font-size:12px; opacity:.9; margin-top:2px; }
          .content { padding:24px; }
          h1 { font-size:20px; margin:0 0 12px; }
          p { margin:0 0 16px; line-height:1.55; }
          .success-badge { display:inline-block; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:600; font-size:12px; padding:4px 8px; border-radius:999px; }
          .card { border:1px solid #e5e7eb; border-radius:10px; padding:16px; background:#ffffff; }
          .details { width:100%; border-collapse:collapse; margin-top:8px; }
          .details th { text-align:left; font-size:12px; color:#6b7280; padding:6px 0; font-weight:600; }
          .details td { text-align:right; font-size:14px; color:#111827; padding:6px 0; font-weight:600; }
          .muted { color:#6b7280; font-weight:500; }
          .divider { height:1px; background:#e5e7eb; margin:16px 0; }
          .btn { display:inline-block; background:#2563eb; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
          .btn-secondary { background:#111827; }
          .footnote { font-size:12px; color:#6b7280; margin-top:16px; }
          .footer { padding:16px 24px 24px; color:#6b7280; font-size:12px; text-align:center; }
          .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container" role="article" aria-label="Withdrawal approved notification">
            <div class="header">
              <div class="brand">Comforeve</div>
              <div class="subbrand">Event Ticketing Platform</div>
            </div>
            <div class="content">
              <span class="success-badge" aria-label="Approved status">Approved & Processing</span>
              <h1>Withdrawal request approved</h1>
              <p>Hi ${
                organizerData.organizerName || "there"
              }, your withdrawal request has been approved and is now being processed. You'll receive another email once the transfer completes.</p>

              <div class="card" aria-label="Withdrawal summary">
                <table class="details" role="table" aria-label="Details">
                  <tr>
                    <th scope="row">Amount</th>
                    <td>₦${organizerData.amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th scope="row">Reference</th>
                    <td class="mono">${organizerData.withdrawalId}</td>
                  </tr>
                  <tr>
                    <th scope="row">Account name</th>
                    <td>${organizerData.accountName}</td>
                  </tr>
                  <tr>
                    <th scope="row">Bank</th>
                    <td>${organizerData.bankName}</td>
                  </tr>
                  <tr>
                    <th scope="row">Account number</th>
                    <td>****${organizerData.bankAccount.slice(-4)}</td>
                  </tr>
                </table>
              </div>

              <div class="divider" role="separator" aria-hidden="true"></div>

              <p class="muted">What happens next?</p>
              <ul class="muted" style="margin:8px 0 16px 18px; padding:0;">
                <li>We have initiated processing with our payment partner.</li>
                <li>Funds typically arrive within 1–2 business days.</li>
                <li>You will receive a confirmation email once completed.</li>
              </ul>

              <div>
                <a class="btn" href="${
                  process.env.NEXT_PUBLIC_APP_URL || ""
                }/dashboard/organizer" target="_blank" rel="noopener noreferrer">View withdrawal status</a>
              </div>

              <p class="footnote">If you did not request this withdrawal, please contact support immediately.</p>
              <p class="footnote">This is an automated message, please do not reply to this email.</p>
            </div>
            <div class="footer">
              <div>© ${currentYear} Comforeve. All rights reserved.</div>
              <div>You're receiving this because you have a Comforeve organizer account.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal request approved\n\n
      Hi ${
        organizerData.organizerName || "there"
      }, your withdrawal request has been approved and is now being processed. You'll receive another email once the transfer completes.\n\n
      Amount: ₦${organizerData.amount.toLocaleString()}\n
      Reference: ${organizerData.withdrawalId}\n
      Account name: ${organizerData.accountName}\n
      Bank: ${organizerData.bankName}\n
      Account number: ****${organizerData.bankAccount.slice(-4)}\n\n
      What happens next?\n
      - We have initiated processing with our payment partner.\n
      - Funds typically arrive within 1–2 business days.\n
      - You will receive a confirmation email once completed.\n\n
      View status: ${
        (process.env.NEXT_PUBLIC_APP_URL || "") + "/dashboard/organizer"
      }\n\n
      If you did not request this withdrawal, please contact support immediately.\n
      Do not reply to this email.\n
      © ${currentYear} Comforeve
    `,
  }),

  withdrawalRejected: (organizerData: {
    organizerEmail: string;
    organizerName: string;
    amount: number;
    reason: string;
    withdrawalId: string;
  }) => ({
    subject: "Your withdrawal request could not be processed",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Withdrawal Rejected</title>
        <style>
          body { margin:0; padding:0; background:#f6f7f9; color:#111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
          .wrapper { width:100%; background:#f6f7f9; padding:24px 0; }
          .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.1); }
          .header { background:#111827; color:#ffffff; padding:20px 24px; }
          .brand { font-size:18px; font-weight:700; letter-spacing:.2px; }
          .subbrand { font-size:12px; opacity:.9; margin-top:2px; }
          .content { padding:24px; }
          h1 { font-size:20px; margin:0 0 12px; }
          p { margin:0 0 16px; line-height:1.55; }
          .warn-badge { display:inline-block; background:#fff7ed; color:#c2410c; border:1px solid #fed7aa; font-weight:600; font-size:12px; padding:4px 8px; border-radius:999px; }
          .card { border:1px solid #e5e7eb; border-radius:10px; padding:16px; background:#ffffff; }
          .details { width:100%; border-collapse:collapse; margin-top:8px; }
          .details th { text-align:left; font-size:12px; color:#6b7280; padding:6px 0; font-weight:600; }
          .details td { text-align:right; font-size:14px; color:#111827; padding:6px 0; font-weight:600; }
          .muted { color:#6b7280; font-weight:500; }
          .divider { height:1px; background:#e5e7eb; margin:16px 0; }
          .btn { display:inline-block; background:#2563eb; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
          .footnote { font-size:12px; color:#6b7280; margin-top:16px; }
          .footer { padding:16px 24px 24px; color:#6b7280; font-size:12px; text-align:center; }
          .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container" role="article" aria-label="Withdrawal rejected notification">
            <div class="header">
              <div class="brand">Comforeve</div>
              <div class="subbrand">Event Ticketing Platform</div>
            </div>
            <div class="content">
              <span class="warn-badge" aria-label="Rejected status">Rejected</span>
              <h1>Withdrawal request couldn’t be processed</h1>
              <p>Hi ${
                organizerData.organizerName || "there"
              }, your withdrawal request could not be processed at this time.</p>

              <div class="card" aria-label="Withdrawal summary">
                <table class="details" role="table" aria-label="Details">
                  <tr>
                    <th scope="row">Amount</th>
                    <td>₦${organizerData.amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th scope="row">Reference</th>
                    <td class="mono">${organizerData.withdrawalId}</td>
                  </tr>
                  <tr>
                    <th scope="row">Reason</th>
                    <td>${organizerData.reason || "Not specified"}</td>
                  </tr>
                </table>
              </div>

              <div class="divider" role="separator" aria-hidden="true"></div>

              <p class="muted">What you can do</p>
              <ul class="muted" style="margin:8px 0 16px 18px; padding:0;">
                <li>Review the reason above and correct any issues.</li>
                <li>Submit a new withdrawal request from your dashboard.</li>
                <li>Contact support if you need clarification.</li>
              </ul>

              <div>
                <a class="btn" href="${
                  process.env.NEXT_PUBLIC_APP_URL || ""
                }/dashboard/organizer" target="_blank" rel="noopener noreferrer">Submit a new request</a>
              </div>

              <p class="footnote">If you believe this decision was made in error, please contact support and include the reference shown above.</p>
              <p class="footnote">This is an automated message, please do not reply to this email.</p>
            </div>
            <div class="footer">
              <div>© ${currentYear} Comforeve. All rights reserved.</div>
              <div>You're receiving this because you have a Comforeve organizer account.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal request couldn’t be processed\n\n
      Hi ${
        organizerData.organizerName || "there"
      }, your withdrawal request could not be processed at this time.\n\n
      Amount: ₦${organizerData.amount.toLocaleString()}\n
      Reference: ${organizerData.withdrawalId}\n
      Reason: ${organizerData.reason || "Not specified"}\n\n
      What you can do\n
      - Review the reason above and correct any issues.\n
      - Submit a new withdrawal request from your dashboard.\n
      - Contact support if you need clarification.\n\n
      Dashboard: ${
        (process.env.NEXT_PUBLIC_APP_URL || "") + "/dashboard/organizer"
      }\n\n
      If you believe this decision was made in error, please contact support and include the reference shown above.\n
      Do not reply to this email.\n
      © ${currentYear} Comforeve
    `,
  }),

  withdrawalCompleted: (organizerData: {
    organizerEmail: string;
    organizerName: string;
    amount: number;
    accountName: string;
    bankAccount: string;
    bankName: string;
    withdrawalId: string;
    paystackRef?: string;
    completedAt: string;
  }) => ({
    subject: "Your withdrawal has been completed",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Withdrawal Completed</title>
        <style>
          body { margin:0; padding:0; background:#f6f7f9; color:#111827; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; }
          .wrapper { width:100%; background:#f6f7f9; padding:24px 0; }
          .container { max-width:640px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.1); }
          .header { background:#111827; color:#ffffff; padding:20px 24px; }
          .brand { font-size:18px; font-weight:700; letter-spacing:.2px; }
          .subbrand { font-size:12px; opacity:.9; margin-top:2px; }
          .content { padding:24px; }
          h1 { font-size:20px; margin:0 0 12px; }
          p { margin:0 0 16px; line-height:1.55; }
          .ok-badge { display:inline-block; background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; font-weight:600; font-size:12px; padding:4px 8px; border-radius:999px; }
          .card { border:1px solid #e5e7eb; border-radius:10px; padding:16px; background:#ffffff; }
          .details { width:100%; border-collapse:collapse; margin-top:8px; }
          .details th { text-align:left; font-size:12px; color:#6b7280; padding:6px 0; font-weight:600; }
          .details td { text-align:right; font-size:14px; color:#111827; padding:6px 0; font-weight:600; }
          .muted { color:#6b7280; font-weight:500; }
          .divider { height:1px; background:#e5e7eb; margin:16px 0; }
          .btn { display:inline-block; background:#2563eb; color:#ffffff !important; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600; font-size:14px; }
          .footnote { font-size:12px; color:#6b7280; margin-top:16px; }
          .footer { padding:16px 24px 24px; color:#6b7280; font-size:12px; text-align:center; }
          .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container" role="article" aria-label="Withdrawal completed notification">
            <div class="header">
              <div class="brand">Comforeve</div>
              <div class="subbrand">Event Ticketing Platform</div>
            </div>
            <div class="content">
              <span class="ok-badge" aria-label="Completed status">Completed</span>
              <h1>Withdrawal completed successfully</h1>
              <p>Hi ${
                organizerData.organizerName || "there"
              }, your withdrawal has been completed and the funds have been transferred to your bank account.</p>

              <div class="card" aria-label="Withdrawal summary">
                <table class="details" role="table" aria-label="Details">
                  <tr>
                    <th scope="row">Amount</th>
                    <td>₦${organizerData.amount.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th scope="row">Reference</th>
                    <td class="mono">${organizerData.withdrawalId}</td>
                  </tr>
                  <tr>
                    <th scope="row">Completed</th>
                    <td>${organizerData.completedAt}</td>
                  </tr>
                  ${
                    organizerData.paystackRef
                      ? `
                  <tr>
                    <th scope="row">Paystack Ref</th>
                    <td class="mono">${organizerData.paystackRef}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <th scope="row">Account name</th>
                    <td>${organizerData.accountName}</td>
                  </tr>
                  <tr>
                    <th scope="row">Bank</th>
                    <td>${organizerData.bankName}</td>
                  </tr>
                  <tr>
                    <th scope="row">Account number</th>
                    <td>****${organizerData.bankAccount.slice(-4)}</td>
                  </tr>
                </table>
              </div>

              <div class="divider" role="separator" aria-hidden="true"></div>

              <p class="muted">What next?</p>
              <ul class="muted" style="margin:8px 0 16px 18px; padding:0;">
                <li>Funds usually appear on statements within 24–48 hours, depending on your bank.</li>
                <li>If you don't see the funds after 48 hours, contact your bank first, then reach out to our support with the reference above.</li>
              </ul>

              <div>
                <a class="btn" href="${
                  process.env.NEXT_PUBLIC_APP_URL || ""
                }/dashboard/organizer" target="_blank" rel="noopener noreferrer">View in dashboard</a>
              </div>

              <p class="footnote">Thanks for using Comforeve. We’re here to help if you need anything.</p>
              <p class="footnote">This is an automated message, please do not reply to this email.</p>
            </div>
            <div class="footer">
              <div>© ${currentYear} Comforeve. All rights reserved.</div>
              <div>You're receiving this because you have a Comforeve organizer account.</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Withdrawal completed successfully\n\n
      Hi ${
        organizerData.organizerName || "there"
      }, your withdrawal has been completed and the funds have been transferred to your bank account.\n\n
      Amount: ₦${organizerData.amount.toLocaleString()}\n
      Reference: ${organizerData.withdrawalId}\n
      Completed: ${organizerData.completedAt}\n
      ${
        organizerData.paystackRef
          ? `Paystack Ref: ${organizerData.paystackRef}\n`
          : ""
      }
      Account name: ${organizerData.accountName}\n
      Bank: ${organizerData.bankName}\n
      Account number: ****${organizerData.bankAccount.slice(-4)}\n\n
      What next?\n
      - Funds usually appear on statements within 24–48 hours, depending on your bank.\n
      - If you don't see the funds after 48 hours, contact your bank first, then reach out to our support with the reference above.\n\n
      View: ${
        (process.env.NEXT_PUBLIC_APP_URL || "") + "/dashboard/organizer"
      }\n\n
      Thanks for using Comforeve. Do not reply to this email.\n
      © ${currentYear} Comforeve
    `,
  }),
};

// NextAuth email verification function
export async function sendVerificationRequest(
  params: SendVerificationRequestParams
) {
  const { identifier: email, url } = params;
  const { subject, html, text } = emailTemplates.verification(url, email);
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: email,
      subject,
      html,
      text,
      replyTo: "noreply@comforeve.com",
    });

    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
}

// Welcome email sent after successful email verification
export async function sendWelcomeEmail(userData: {
  email: string;
  name: string;
}) {
  const { subject, html } = emailTemplates.welcomeAfterVerification(
    userData.name,
    userData.email
  );

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: userData.email,
      subject,
      html,
      replyTo: "noreply@comforeve.com",
    });

    console.log(`Welcome email sent to ${userData.email}`);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
}

// Password reset email
export async function sendPasswordResetEmail(userData: {
  email: string;
  resetUrl: string;
}) {
  const { subject, html } = emailTemplates.passwordReset(
    userData.resetUrl,
    userData.email
  );

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: userData.email,
      subject,
      html,
      replyTo: "noreply@comforeve.com",
    });

    console.log(`Password reset email sent to ${userData.email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}

// Send ticket confirmation email
export async function sendTicketConfirmation(ticketData: {
  attendeeEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventEndDate?: string;
  eventTime: string;
  eventLocation: string;
  tickets: Array<{
    ticketType: string;
    confirmationId: string;
    quantity?: number;
  }>;
  eventId: string;
}) {
  const { subject, html } = emailTemplates.ticketConfirmation(ticketData);

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL_2 || process.env.SMTP_USER || "",
      to: ticketData.attendeeEmail,
      subject,
      html,
      replyTo: "noreply@comforeve.com",
      // attachments: [
      //   {
      //     filename: `ticket-${ticketData.confirmationId}.pdf`,
      //       content: await generateTicketPDF(ticketData),
      //   },
      // ],
    });

    console.log(`Ticket confirmation sent to ${ticketData.attendeeEmail}`);
  } catch (error) {
    console.error("Error sending ticket confirmation:", error);
    throw new Error("Failed to send ticket confirmation");
  }
}

// Send event reminder email
export async function sendEventReminder(eventData: {
  attendeeEmail: string;
  attendeeName: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  confirmationId: string;
}) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: eventData.attendeeEmail,
      subject: `Reminder: ${eventData.eventTitle} is tomorrow!`,
      replyTo: "noreply@comforeve.com", // Set a no-reply address
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>📅 Event Reminder</h2>
          <p>Hello ${eventData.attendeeName},</p>
          <p>This is a friendly reminder that <strong>${eventData.eventTitle}</strong> is happening tomorrow!</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Event:</strong> ${eventData.eventTitle}</p>
            <p><strong>Date:</strong> ${eventData.eventDate}</p>
            <p><strong>Location:</strong> ${eventData.eventLocation}</p>
            <p><strong>Your Confirmation ID:</strong> ${eventData.confirmationId}</p>
          </div>
          
          <p>Don't forget to bring your confirmation ID with you!</p>
          
          <div style="background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px;">
            <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
          </div>
          
          <p>See you there!</p>
          <p>The Comforeve Team</p>
          
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      `,
    });

    console.log(`Event reminder sent to ${eventData.attendeeEmail}`);
  } catch (error) {
    console.error("Error sending event reminder:", error);
  }
}

// Generate PDF ticket (placeholder - you'll need to implement PDF generation)
// interface TicketData {
//   attendeeEmail: string;
//   attendeeName: string;
//   eventTitle: string;
//   eventDate: string;
//   eventLocation: string;
//   ticketType: string;
//   confirmationId: string;
//   eventId: string;
// }

// async function generateTicketPDF(ticketData: TicketData): Promise<Buffer> {
//   // TODO: Implement PDF generation using libraries like jsPDF or puppeteer
//   // For now, return empty buffer
//   return Buffer.from("");
// }

// Send organizer notification
export async function sendOrganizerNotification(organizerData: {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  ticketsSold: number;
  attendeeName: string;
}) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: organizerData.organizerEmail,
      subject: `New ticket sold for ${organizerData.eventTitle}`,
      replyTo: "noreply@comforeve.com", // Set a no-reply address
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>🎉 New Ticket Sale!</h2>
          <p>Hello ${organizerData.organizerName},</p>
          <p>Great news! A new ticket has been sold for your event.</p>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Event:</strong> ${organizerData.eventTitle}</p>
            <p><strong>Attendee:</strong> ${organizerData.attendeeName}</p>
            <p><strong>Total Tickets Sold:</strong> ${organizerData.ticketsSold}</p>
          </div>
          
          <p>You can view more details in your organizer dashboard.</p>
          
          <div style="background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px;">
            <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address. If you need assistance, please contact our support team through the website.
          </div>
          
          <p>Keep up the great work!</p>
          <p>The Comforeve Team</p>
          
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending organizer notification:", error);
  }
}

// Test email connection
export async function testEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log("Email connection successful");
    return true;
  } catch (error) {
    console.error("Email connection failed:", error);
    return false;
  }
}

export async function sendVerificationRequestWithDebug(
  params: SendVerificationRequestParams
) {
  const { identifier: email, url } = params;

  console.log("🔍 Email Debug Info:");
  console.log("- To:", email);
  console.log("- SMTP Host:", process.env.SMTP_HOST);
  console.log("- SMTP Port:", process.env.SMTP_PORT);
  console.log("- SMTP User:", process.env.SMTP_USER);
  console.log("- From Email:", process.env.FROM_EMAIL || process.env.SMTP_USER);

  try {
    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true, // Enable debug output
      logger: true, // Log to console
    });

    // Test the connection first
    console.log("🔗 Testing SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: "Test Email - Comforeve",
      replyTo: "noreply@comforeve.com", // Set a no-reply address
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>🧪 Test Email from Comforeve</h2>
          <p>Hello,</p>
          <p>This is a test email to verify your email configuration is working.</p>
          <p><strong>Verification URL:</strong> <a href="${url}">${url}</a></p>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          
          <div style="background: #fee2e2; border: 1px solid #f87171; color: #dc2626; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; font-size: 13px;">
            <strong>📧 Please do not reply to this email.</strong> This is an automated message sent from an unmonitored email address.
          </div>
          
          <p>Best regards,<br>The Comforeve Team</p>
          
          <div style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
            <p><strong>Do not reply to this email</strong> - This is an automated message</p>
          </div>
        </div>
      `,
      text: `
        Test Email from Comforeve

        Hello,
        
        This is a test email to verify your email configuration is working.
        
        Verification URL: ${url}
        
        If you received this email, your SMTP configuration is working correctly!
        
        PLEASE DO NOT REPLY TO THIS EMAIL - This is an automated message sent from an unmonitored email address.
        
        Best regards,
        The Comforeve Team
      `,
    };

    console.log("📧 Sending email with options:", {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const result = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    console.log("📊 Send result:", {
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending,
    });

    return result;
  } catch (error) {
    console.error("❌ Email sending failed:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    throw error;
  }
}

// Create a test API endpoint that uses this debug version
export async function sendTestEmailWithDebug(email: string) {
  return sendVerificationRequestWithDebug({
    identifier: email,
    url: `http://localhost:3000/auth/verify-request?token=test-token&email=${email}`,
    expires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    token: "test-token",
    provider: {
      id: "email",
      type: "email",
      name: "Email",
      server: {},
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      sendVerificationRequest: async () => {},
      options: {},
    },
    theme: { colorScheme: "light" },
  });
}

// Send withdrawal approved notification
export async function sendWithdrawalApprovedEmail(organizerData: {
  organizerEmail: string;
  organizerName: string;
  amount: number;
  accountName: string;
  bankAccount: string;
  bankName: string;
  withdrawalId: string;
}) {
  const { subject, html, text } =
    emailTemplates.withdrawalApproved(organizerData);

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: organizerData.organizerEmail,
      subject,
      html,
      text,
      replyTo: "noreply@comforeve.com",
    });

    console.log(
      `Withdrawal approved email sent to ${organizerData.organizerEmail}`
    );
  } catch (error) {
    console.error("Error sending withdrawal approved email:", error);
    throw new Error("Failed to send withdrawal approved email");
  }
}

// Send withdrawal rejected notification
export async function sendWithdrawalRejectedEmail(organizerData: {
  organizerEmail: string;
  organizerName: string;
  amount: number;
  reason: string;
  withdrawalId: string;
}) {
  const { subject, html, text } =
    emailTemplates.withdrawalRejected(organizerData);

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: organizerData.organizerEmail,
      subject,
      html,
      text,
      replyTo: "noreply@comforeve.com",
    });

    console.log(
      `Withdrawal rejected email sent to ${organizerData.organizerEmail}`
    );
  } catch (error) {
    console.error("Error sending withdrawal rejected email:", error);
    throw new Error("Failed to send withdrawal rejected email");
  }
}

// Send withdrawal completed notification
export async function sendWithdrawalCompletedEmail(organizerData: {
  organizerEmail: string;
  organizerName: string;
  amount: number;
  accountName: string;
  bankAccount: string;
  bankName: string;
  withdrawalId: string;
  paystackRef?: string;
  completedAt: string;
}) {
  const { subject, html, text } =
    emailTemplates.withdrawalCompleted(organizerData);

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || process.env.SMTP_USER || "",
      to: organizerData.organizerEmail,
      subject,
      html,
      text,
      replyTo: "noreply@comforeve.com",
    });

    console.log(
      `Withdrawal completed email sent to ${organizerData.organizerEmail}`
    );
  } catch (error) {
    console.error("Error sending withdrawal completed email:", error);
    throw new Error("Failed to send withdrawal completed email");
  }
}
