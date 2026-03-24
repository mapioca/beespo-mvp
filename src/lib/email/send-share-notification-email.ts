import { resend } from './resend';

interface ShareNotificationEmailParams {
  toEmail: string;
  sharerName: string;
  meetingTitle: string;
  workspaceName: string;
  scheduledDate?: string | null;
  permission: 'viewer' | 'editor';
  isBeespoUser: boolean;
  viewLink: string;
}

export async function sendShareNotificationEmail({
  toEmail,
  sharerName,
  meetingTitle,
  workspaceName,
  scheduledDate,
  permission,
  isBeespoUser,
  viewLink,
}: ShareNotificationEmailParams): Promise<{ success: boolean; error?: string }> {
  const permissionLabel = permission === 'editor' ? 'edit' : 'view';
  const buttonText = isBeespoUser ? 'Open in Beespo' : 'View Meeting Agenda';

  if (!resend) {
    console.log('------------------------------------------');
    console.log(`📧 [DEV MODE] Share Notification Email`);
    console.log(`To: ${toEmail}`);
    console.log(`From: ${sharerName} (${workspaceName})`);
    console.log(`Meeting: ${meetingTitle}`);
    console.log(`Permission: ${permission}`);
    console.log(`Link: ${viewLink}`);
    console.log(`Is Beespo User: ${isBeespoUser}`);
    console.log('------------------------------------------');
    return { success: true };
  }

  const formattedDate = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  try {
    const { error } = await resend.emails.send({
      from: 'Beespo <no-reply@beespo.com>',
      to: toEmail,
      subject: `${sharerName} shared a meeting with you`,
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
              <div style="background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
                <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #111827; letter-spacing: -0.025em;">Meeting shared with you</h1>

                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 24px 0;">
                  <strong>${sharerName}</strong> from <strong>${workspaceName}</strong> has shared a meeting with you.
                </p>

                <!-- Meeting Details -->
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                  <div style="font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 8px;">Meeting</div>
                  <div style="font-size: 18px; font-weight: 600; color: #111827;">${meetingTitle}</div>
                  ${formattedDate ? `<div style="font-size: 14px; color: #6b7280; margin-top: 8px;">${formattedDate}</div>` : ''}
                  <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">
                    You have been granted <strong>${permissionLabel}</strong> access.
                  </div>
                </div>

                <!-- Action Button -->
                <div style="margin-bottom: ${isBeespoUser ? '32px' : '16px'};">
                  <a href="${viewLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    ${buttonText}
                  </a>
                </div>

                ${!isBeespoUser ? `
                <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0 0 32px 0;">
                  No Beespo account needed — this link gives you direct access.
                </p>
                ` : ''}

                <div style="height: 1px; background-color: #f3f4f6; margin-bottom: 32px;"></div>

                <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0;">
                  If you didn't expect this, you can safely ignore this email.
                </p>
              </div>

              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; padding: 0 24px;">
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
      console.error('Failed to send share notification email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send share notification email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
