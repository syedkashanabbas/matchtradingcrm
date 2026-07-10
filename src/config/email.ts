import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: (process.env.SMTP_SECURE ?? 'true') !== 'false', // true for 465, false for 587/STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'no-reply@eidos.local';
const BRAND = 'EIDOS';

const layout = (title: string, body: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">${title}</h2>
    ${body}
    <hr style="border: 1px solid #eee; margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      This is an automated message from ${BRAND}. Please do not reply to this email.
    </p>
  </div>
`;

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn(`✉️  SMTP not configured - skipping email "${subject}" to ${to}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
  console.log(`✉️  Email "${subject}" sent to ${to}`);
};

export const sendWelcomeEmail = async (email: string, firstName: string) => {
  const html = layout(
    `Welcome to ${BRAND}!`,
    `
      <p>Hi ${firstName},</p>
      <p>Your ${BRAND} account has been created. Here's how to get started:</p>
      <ol>
        <li>Choose your subscription plan (card or crypto)</li>
        <li>Enter your MT5 broker credentials</li>
        <li>Enter your prop firm credentials</li>
      </ol>
      <p>Once done, we provision your trading service automatically - no manual setup needed.</p>
      <p>You can also start earning right away by sharing your referral link from the Network page.</p>
    `
  );
  try {
    await sendEmail(email, `Welcome to ${BRAND}`, html);
  } catch (error) {
    console.error("Error sending welcome email:", error);
  }
};

export const sendProvisioningCompletedEmail = async (email: string, firstName: string) => {
  const html = layout(
    "Your trading service is active",
    `
      <p>Hi ${firstName},</p>
      <p>Good news - your MT5 accounts have been connected and your hedge setup is now <strong>active</strong>.</p>
      <p>You can follow your service status from your dashboard at any time.</p>
    `
  );
  try {
    await sendEmail(email, `Your ${BRAND} service is active`, html);
  } catch (error) {
    console.error("Error sending provisioning completed email:", error);
  }
};

export const sendProvisioningFailedEmail = async (email: string, firstName: string) => {
  const html = layout(
    "We hit a snag setting up your service",
    `
      <p>Hi ${firstName},</p>
      <p>Something went wrong while setting up your trading service. Our team has been notified
      automatically and is working on it - no action is needed from you right now.</p>
      <p>If you don't hear from us within one business day, please contact support.</p>
    `
  );
  try {
    await sendEmail(email, `${BRAND}: action ongoing on your service setup`, html);
  } catch (error) {
    console.error("Error sending provisioning failed email:", error);
  }
};

export const sendCommissionEarnedEmail = async (
  email: string,
  firstName: string,
  amount: number,
  currency: string
) => {
  const html = layout(
    "You earned a commission!",
    `
      <p>Hi ${firstName},</p>
      <p>A client in your network just completed a payment and you earned
      <strong>${amount.toFixed(2)} ${currency}</strong>.</p>
      <p>Track your balance and history on the Commissions page of your dashboard.</p>
    `
  );
  try {
    await sendEmail(email, `${BRAND}: commission earned (+${amount.toFixed(2)} ${currency})`, html);
  } catch (error) {
    console.error("Error sending commission email:", error);
  }
};

export const sendPasswordResetEmail = async (email: string, otp: string) => {
  const html = layout(
    'Password Reset Request',
    `
      <p>Hi there,</p>
      <p>You requested to reset your password for your ${BRAND} account.</p>
      <p>Your OTP code is:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #007bff;">${otp}</span>
      </div>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
    `
  );

  try {
    await sendEmail(email, `Password Reset OTP - ${BRAND}`, html);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
