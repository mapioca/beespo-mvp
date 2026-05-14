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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beespo.com';
  const logoUrl = `${appUrl}/images/beespo-logo-full.svg`;
  const year = new Date().getFullYear();

  try {
    const { error } = await resend.emails.send({
      from: 'Beespo <noreply@beespo.com>',
      to: toEmail,
      subject: `Your Beespo invite code: ${inviteCode}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to Beespo</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9faf9; margin: 0; padding: 0; color: #6e5345;">
  <div style="max-width: 480px; margin: 40px auto; background-color: #f1ece2; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(110, 83, 69, 0.08);">
    <div style="padding: 32px 32px 0 32px; text-align: center;">
      <img src="${logoUrl}" alt="Beespo" style="height: 32px; width: auto; margin-bottom: 8px;" />
    </div>
    <div style="padding: 24px 32px 32px 32px; text-align: left;">
      <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 16px 0; color: #6e5345;">
        You&rsquo;re on the <em style="font-family: Georgia, 'Times New Roman', ui-serif, serif; font-style: italic; font-weight: 600; color: #cb6538;">list.</em>
      </h1>
      <p style="font-size: 16px; line-height: 24px; color: #6e5345; margin: 0 0 24px 0;">
        Beespo is currently invite-only while we ship to early bishoprics. Use the code below when you sign up.
      </p>
      <div style="background-color: #f9faf9; border: 1px solid rgba(110, 83, 69, 0.16); border-radius: 10px; padding: 18px 16px; text-align: center; margin-bottom: 24px;">
        <p style="font-size: 11px; font-weight: 600; color: #988d7a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.18em;">Your invite code</p>
        <p style="font-size: 26px; font-weight: 700; font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace; color: #6e5345; margin: 0; letter-spacing: 0.14em;">${inviteCode}</p>
      </div>
      <div style="text-align: center;">
        <a href="${signupLink}"
           style="display: inline-block; background-color: #cb6538; color: #ffffff !important; font-size: 16px; font-weight: 600; text-decoration: none !important; padding: 12px 28px; border-radius: 8px; margin-bottom: 24px;">
          Sign up now
        </a>
      </div>
      <p style="font-size: 14px; line-height: 22px; color: #988d7a; margin: 0 0 8px 0;">
        If the button doesn&rsquo;t work, paste this link into your browser:
      </p>
      <p style="color: #988d7a; font-size: 13px; word-break: break-all; margin: 0 0 24px 0;">
        ${signupLink}
      </p>
      <p style="font-size: 13px; line-height: 20px; color: #988d7a; margin: 0;">
        This invitation expires in 7 days. If you weren&rsquo;t expecting it, you can safely ignore this email.
      </p>
    </div>
    <div style="padding: 20px 32px; background-color: #f9faf9; text-align: center; border-top: 1px solid rgba(110, 83, 69, 0.12);">
      <p style="font-size: 12px; color: #988d7a; margin: 0 0 4px 0;">&copy; ${year} Beespo. All rights reserved.</p>
      <p style="font-size: 12px; color: #988d7a; margin: 0;">
        Need help? <a href="mailto:support@beespo.com" style="color: #988d7a; text-decoration: underline;">support@beespo.com</a>
      </p>
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
