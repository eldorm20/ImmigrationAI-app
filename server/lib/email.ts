import { logger } from "./logger";

const RESEND_API_KEY = "re_YBRu1tXb_5Rp37cT7D3c4S2YKbAFae89J";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from = "ImmigrationAI <billing@immigrationai.app>" }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    logger.warn("Resend API key not found. Email sending skipped.");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", // Using default testing domain for reliability until custom domain is set
        to, // In test mode, this must be the verified email or use resend.dev
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, "Resend API error");
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    const data = await response.json();
    logger.info({ id: data.id, to }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error }, "Failed to send email");
    return false;
  }
}

export function generatePasswordResetEmail(resetToken: string, appUrl: string): string {
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset for your ImmigrationAI account.</p>
      <p>Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
        Reset Password
      </a>
      <p style="margin-top: 24px; color: #666;">
        If you didn't request this, you can safely ignore this email.
        The link expires in 1 hour.
      </p>
    </div>
  `;
}

export function generateApplicationStatusEmail(status: string, name: string, applicationId: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Application Status Update</h2>
      <p>Hello ${name},</p>
      <p>The status of your application (ID: ${applicationId}) has been updated.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <strong>New Status: ${status}</strong>
      </div>
      <p>Log in to your dashboard to view more details.</p>
    </div>
  `;
}

export function generateConsultationEmail(lawyerName: string, scheduledTime: Date | string, meetingLink?: string): string {
  const dateStr = new Date(scheduledTime).toLocaleString();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Consultation Scheduled</h2>
      <p>Your consultation with ${lawyerName} has been confirmed.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Time:</strong> ${dateStr}</p>
        ${meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ''}
      </div>
      <p>Please make sure to be on time.</p>
    </div>
  `;
}

export function generatePaymentConfirmationEmail(description: string, amount: string, nextBillingDate?: Date): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Confirmation</h2>
      <p>Thank you for your payment.</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Item:</strong> ${description}</p>
        <p><strong>Amount:</strong> ${amount}</p>
        ${nextBillingDate ? `<p><strong>Next Billing Date:</strong> ${new Date(nextBillingDate).toLocaleDateString()}</p>` : ''}
      </div>
      <p>A receipt is available in your dashboard.</p>
    </div>
  `;
}

export function generateDocumentUploadConfirmationEmail(userName: string, documentName: string): string {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Document Uploaded</h2>
        <p>Hello ${userName},</p>
        <p>We have received your document: <strong>${documentName}</strong>.</p>
        <p>Our team or AI will review it shortly.</p>
      </div>
    `;
}