import { resend } from './resend';

interface InviteEmailParams {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  inviteLink: string;
}

export async function sendInviteEmail({
  toEmail,
  inviterName,
  workspaceName,
  role,
  inviteLink,
}: InviteEmailParams): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log('------------------------------------------');
    console.log(`📧 [DEV MODE] Workspace Invitation Email`);
    console.log(`To: ${toEmail}`);
    console.log(`From: ${inviterName}`);
    console.log(`Workspace: ${workspaceName}`);
    console.log(`Role: ${role}`);
    console.log(`Link: ${inviteLink}`);
    console.log('------------------------------------------');
    return { success: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Beespo <onboarding@resend.dev>',
      to: toEmail,
      subject: `You've been invited to join ${workspaceName} on Beespo`,
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
                <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #111827; letter-spacing: -0.025em;">You've been invited</h1>
                
                <p style="font-size: 16px; line-height: 24px; color: #4b5563; margin: 0 0 32px 0;">
                  <strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Beespo as a <strong>${role}</strong>.
                </p>
                
                <!-- Action Button -->
                <div style="margin-bottom: 32px;">
                  <a href="${inviteLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; transition: background-color 0.2s ease;">
                    Join Workspace
                  </a>
                </div>
                
                <div style="height: 1px; background-color: #f3f4f6; margin-bottom: 32px;"></div>
                
                <p style="font-size: 14px; line-height: 20px; color: #6b7280; margin: 0;">
                  Beespo is a leadership management platform designed to help you organize meetings, sync on discussions, and track assignments seamlessly.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; padding: 0 24px;">
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
      console.error('Failed to send invite email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to send invite email:', err);
    return { success: false, error: 'Failed to send email' };
  }
}
