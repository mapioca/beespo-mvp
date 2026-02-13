import { resend } from './resend';

interface PlatformInviteEmailParams {
  toEmail: string;
  inviteCode: string;
  signupLink: string;
}

export async function sendAdminPlatformInviteEmail({
  toEmail,
  inviteCode,
  signupLink,
}: PlatformInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('------------------------------------------');
    console.log(`📧 [DEV MODE] Platform Invitation Email`);
    console.log(`To: ${toEmail}`);
    console.log(`Invite Code: ${inviteCode}`);
    console.log(`Signup Link: ${signupLink}`);
    console.log('------------------------------------------');
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Beespo <onboarding@resend.dev>',
      to: toEmail,
      subject: "You've been invited to join Beespo",
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; color: #111827;">
            <div style="max-width: 600px; margin: 0 auto; padding: 48px 24px;">
              <div style="margin-bottom: 48px; text-align: left;">
                <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #111827;">Beespo</div>
              </div>

              <div style="background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #111827;">You've been invited to Beespo</h1>

                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 24px 0;">
                  A Beespo administrator has invited you to join the platform. Use the invite code below when signing up.
                </p>

                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 24px;">
                  <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your Invite Code</p>
                  <p style="font-size: 28px; font-weight: 700; font-family: monospace; color: #111827; margin: 0; letter-spacing: 0.1em;">${inviteCode}</p>
                </div>

                <div style="margin-bottom: 32px; text-align: center;">
                  <a href="${signupLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Sign Up Now
                  </a>
                </div>

                <div style="height: 1px; background-color: #f3f4f6; margin-bottom: 24px;"></div>

                <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0;">
                  Beespo is a leadership management platform designed to help you organize meetings, sync on discussions, and track assignments seamlessly.
                </p>
              </div>

              <div style="margin-top: 40px; text-align: center;">
                <p style="font-size: 13px; color: #9ca3af; margin: 0 0 12px 0;">
                  This invitation will expire in 7 days.
                </p>
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
      console.error('Failed to send platform invite email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send platform invite email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
