export const getResetPasswordEmailHtml = (link: string, email: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/images/beespo-logo-full.svg`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Beespo password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9faf9; margin: 0; padding: 0; color: #6e5345;">
  <div style="max-width: 480px; margin: 40px auto; background-color: #f1ece2; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(110, 83, 69, 0.08);">
    <div style="padding: 32px 32px 0 32px; text-align: center;">
      <img src="${logoUrl}" alt="Beespo" style="height: 32px; width: auto; margin-bottom: 8px;" />
    </div>
    <div style="padding: 24px 32px 32px 32px; text-align: left;">
      <h1 style="font-size: 26px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 16px 0; color: #6e5345;">
        Reset your <em style="font-family: Georgia, 'Times New Roman', ui-serif, serif; font-style: italic; font-weight: 600; color: #cb6538;">password</em>.
      </h1>
      <p style="font-size: 16px; line-height: 24px; color: #6e5345; margin: 0 0 24px 0;">
        We received a request to reset the password for <strong style="color: #6e5345;">${email}</strong>. If you didn't make this request, you can safely ignore this email.
      </p>
      <div style="text-align: center;">
        <a href="${link}"
           style="display: inline-block; background-color: #cb6538; color: #ffffff !important; font-size: 16px; font-weight: 600; text-decoration: none !important; padding: 12px 28px; border-radius: 8px; margin-bottom: 24px;">
          Reset password
        </a>
      </div>
      <p style="font-size: 14px; line-height: 22px; color: #988d7a; margin: 0 0 8px 0;">
        If the button doesn't work, paste this link into your browser:
      </p>
      <p style="color: #988d7a; font-size: 13px; word-break: break-all; margin: 0 0 24px 0;">
        ${link}
      </p>
      <p style="font-size: 13px; line-height: 20px; color: #988d7a; margin: 0;">
        This link expires in 1 hour. For security, it can only be used once.
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
  `;
};

export const getFailedLoginNoticeHtml = (email: string, ip: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beespo.com';
  const logoUrl = `${appUrl}/images/beespo-logo-full.svg`;
  const resetUrl = `${appUrl}/forgot-password`;
  const securityUrl = `${appUrl}/settings/account`;
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suspicious sign-in attempts on your Beespo account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9faf9; margin: 0; padding: 0; color: #6e5345;">
  <div style="max-width: 480px; margin: 40px auto; background-color: #f1ece2; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(110, 83, 69, 0.08);">
    <div style="padding: 32px 32px 0 32px; text-align: center;">
      <img src="${logoUrl}" alt="Beespo" style="height: 32px; width: auto; margin-bottom: 8px;" />
    </div>
    <div style="padding: 24px 32px 32px 32px; text-align: left;">
      <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 16px 0; color: #6e5345;">
        Suspicious <em style="font-family: Georgia, 'Times New Roman', ui-serif, serif; font-style: italic; font-weight: 600; color: #cb6538;">sign-in attempts</em>.
      </h1>
      <p style="font-size: 16px; line-height: 24px; color: #6e5345; margin: 0 0 16px 0;">
        We blocked multiple failed sign-in attempts on the account <strong style="color: #6e5345;">${email}</strong> from IP <code style="background: rgba(110, 83, 69, 0.08); padding: 2px 6px; border-radius: 4px; font-size: 14px;">${ip}</code>.
      </p>
      <p style="font-size: 16px; line-height: 24px; color: #6e5345; margin: 0 0 24px 0;">
        Your account is safe. Rate limits stopped the attacker — they have not gained access.
      </p>
      <p style="font-size: 16px; line-height: 24px; color: #6e5345; margin: 0 0 12px 0;"><strong>What to do:</strong></p>
      <ul style="margin: 0 0 24px 0; padding-left: 20px; font-size: 16px; line-height: 24px; color: #6e5345;">
        <li style="margin-bottom: 8px;"><strong>If this was you</strong>, you may have mistyped your password — try again, or
          <a href="${resetUrl}" style="color: #cb6538; text-decoration: underline;">reset it</a>.</li>
        <li><strong>If this was not you</strong>, your password may have been exposed in a breach on another site. Reset it and enable two-factor authentication in
          <a href="${securityUrl}" style="color: #cb6538; text-decoration: underline;">your account settings</a>.</li>
      </ul>
      <p style="font-size: 13px; line-height: 20px; color: #988d7a; margin: 0;">
        You'll only receive one of these emails per hour, even if attacks continue.
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
  `;
};
