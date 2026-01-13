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
