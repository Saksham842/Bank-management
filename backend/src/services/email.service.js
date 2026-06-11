const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, text, html }) => {
  // Support both OAuth2 Gmail transport and standard SMTP configuration
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const refreshToken = process.env.REFRESH_TOKEN;

  const isOAuth2 = !!(clientId && clientSecret && refreshToken && user);

  if (!isOAuth2 && (!host || host.includes('your-'))) {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Text: ${text}`);
    return { success: true, message: 'Mock email sent successfully.' };
  }

  try {
    let transporter;
    if (isOAuth2) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user,
          clientId,
          clientSecret,
          refreshToken
        }
      });
    } else {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port || '2525'),
        auth: {
          user,
          pass
        }
      });
    }

    const info = await transporter.sendMail({
      from: isOAuth2 ? `"${user}" <${user}>` : '"Ledger App" <no-reply@ledger.app>',
      to,
      subject,
      text,
      html
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email sending failed:', err.message);
    return { success: false, error: err.message };
  }
};

const sendBudgetAlert = async (userEmail, category, limit, spent) => {
  const percent = Math.round((spent / limit) * 100);
  return sendEmail({
    to: userEmail,
    subject: `Budget Warning: ${category} budget reached ${percent}%`,
    text: `Your monthly budget limit for "${category}" is ₹${limit}. You have spent ₹${spent} (${percent}%). Please review your expenditures.`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e;">Budget Limit Warning</h2>
        <p>You have consumed <strong>${percent}%</strong> of your monthly limit for category <strong>${category}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; color: #718096;">Category Limit:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right;">₹${limit}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #718096;">Total Spent:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #e53e3e;">₹${spent}</td>
          </tr>
        </table>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0;">This is an automated alert from your Ledger App. You can customize limits in the Budget panel.</p>
      </div>
    `
  });
};

module.exports = { sendEmail, sendBudgetAlert };
