import { resend } from './resend';

interface ZoomInviteEmailParams {
  toEmail: string;
  inviterName: string;
  meetingTitle: string;
  scheduledDate: string;  // ISO string
  joinUrl: string;
  passcode?: string;
}

export async function sendZoomInviteEmail({
  toEmail,
  inviterName,
  meetingTitle,
  scheduledDate,
  joinUrl,
  passcode,
}: ZoomInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'Date TBD';

  if (!resend) {
    console.log('------------------------------------------');
    console.log(`📧 [DEV MODE] Zoom Meeting Invite Email`);
    console.log(`To: ${toEmail}`);
    console.log(`From: ${inviterName}`);
    console.log(`Meeting: ${meetingTitle}`);
    console.log(`Date: ${formattedDate}`);
    console.log(`Join URL: ${joinUrl}`);
    if (passcode) console.log(`Passcode: ${passcode}`);
    console.log('------------------------------------------');
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Beespo <no-reply@beespo.com>',
      to: toEmail,
      subject: `${inviterName} invited you to a Zoom meeting`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            </style>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; color: #111827; -webkit-font-smoothing: antialiased;">
            <div style="max-width: 600px; margin: 0 auto; padding: 48px 24px;">
              <!-- Logo/Header -->
              <div style="margin-bottom: 48px; text-align: left;">
                <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #111827;">Beespo</div>
              </div>

              <!-- Content Card -->
              <div style="background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);">
                <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #111827; letter-spacing: -0.025em;">You're invited to a Zoom meeting</h1>

                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 24px 0;">
                  <strong>${inviterName}</strong> has invited you to join a meeting via Zoom.
                </p>

                <!-- Meeting Details -->
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <div style="font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 8px;">Meeting</div>
                  <div style="font-size: 18px; font-weight: 600; color: #111827;">${meetingTitle}</div>
                  <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">${formattedDate}</div>
                  ${passcode ? `
                  <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                    <span style="font-size: 13px; color: #6b7280;">Passcode: </span>
                    <span style="font-size: 14px; font-weight: 700; color: #111827; letter-spacing: 0.1em; font-family: monospace;">${passcode}</span>
                  </div>` : ''}
                </div>

                <!-- Action Button -->
                <div style="margin-bottom: 32px;">
                  <a href="${joinUrl}" style="display: inline-block; background-color: #2D8CFF; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Join Zoom Meeting
                  </a>
                </div>

                <div style="height: 1px; background-color: #f3f4f6; margin-bottom: 24px;"></div>

                <p style="font-size: 13px; color: #6b7280; margin: 0;">
                  Or copy this link into your browser:<br>
                  <a href="${joinUrl}" style="color: #6366f1; word-break: break-all;">${joinUrl}</a>
                </p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; padding: 0 24px;">
                <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
                <div style="margin-top: 32px; font-size: 12px; color: #d1d5db;">
                  &copy; ${new Date().getFullYear()} Beespo. All rights reserved.
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Failed to send Zoom invite email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send Zoom invite email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
