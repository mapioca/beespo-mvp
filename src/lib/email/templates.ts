export const getResetPasswordEmailHtml = (link: string, email: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/images/beespo-logo-full.svg`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
      background-color: #f4f4f5;
      margin: 0;
      padding: 0;
      color: #09090b;
    }
    .container {
      max-width: 480px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      padding: 32px 32px 0 32px;
      text-align: center;
    }
    .logo {
      height: 32px;
      width: auto;
      margin-bottom: 16px;
    }
    .content {
      padding: 32px;
      text-align: left;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px 0;
      color: #09090b;
    }
    p {
      font-size: 16px;
      line-height: 24px;
      color: #52525b;
      margin: 0 0 24px 0;
    }
    .button {
      display: inline-block;
      background-color: #09090b;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 500;
      text-decoration: none !important;
      padding: 12px 24px;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .link-text {
      color: #52525b;
      font-size: 14px;
      word-break: break-all;
    }
    .footer {
      padding: 24px 32px;
      background-color: #fafafa;
      text-align: center;
      border-top: 1px solid #e4e4e7;
    }
    .footer p {
      font-size: 12px;
      color: #71717a;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
       <img src="${logoUrl}" alt="Beespo" class="logo" />
    </div>
    <div class="content">
      <h1>Reset your password</h1>
      <p>Hello,</p>
      <p>We received a request to reset the password for the account associated with <strong>${email}</strong>. If you didn't make this request, you can safely ignore this email.</p>
      <div style="text-align: center;">
        <a href="${link}" class="button">Reset Password</a>
      </div>
      <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
      <p class="link-text">${link}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Beespo. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const getFailedLoginNoticeHtml = (email: string, ip: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beespo.com';
  const resetUrl = `${appUrl}/forgot-password`;
  const securityUrl = `${appUrl}/settings/account`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suspicious sign-in attempts on your Beespo account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; color: #09090b;">
  <div style="max-width: 480px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
    <div style="padding: 32px;">
      <h1 style="font-size: 20px; margin: 0 0 16px 0;">Suspicious sign-in attempts</h1>
      <p style="margin: 0 0 16px 0; line-height: 1.5;">
        We blocked multiple failed sign-in attempts on the Beespo account for
        <strong>${email}</strong> from IP <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${ip}</code>.
      </p>
      <p style="margin: 0 0 16px 0; line-height: 1.5;">
        Your account is safe. We've slowed the attacker down with rate limits, and they have not gained access.
      </p>
      <p style="margin: 0 0 16px 0; line-height: 1.5;"><strong>What to do:</strong></p>
      <ul style="margin: 0 0 16px 0; padding-left: 20px; line-height: 1.6;">
        <li><strong>If this was you</strong>, you may have mistyped your password — try again, or
          <a href="${resetUrl}" style="color: #c2410c;">reset it</a>.</li>
        <li><strong>If this was not you</strong>, your password may have been exposed in a breach
          on another site. We recommend resetting it and enabling two-factor authentication
          in <a href="${securityUrl}" style="color: #c2410c;">your account settings</a>.</li>
      </ul>
      <p style="margin: 0; line-height: 1.5; color: #71717a; font-size: 13px;">
        You will only receive one of these emails per hour, even if attacks continue.
      </p>
    </div>
    <div style="padding: 16px 32px; background-color: #fafafa; text-align: center;">
      <p style="font-size: 12px; color: #71717a; margin: 0;">
        &copy; ${new Date().getFullYear()} Beespo. Sent because of activity on your account.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};
