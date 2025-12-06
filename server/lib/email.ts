import nodemailer from "nodemailer";
import { logger } from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_HOST) {
      logger.warn("Email service not configured, skipping email send");
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@immigrationai.com",
      ...options,
    });

    logger.info({ to: options.to }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error, to: options.to }, "Failed to send email");
    return false;
  }
}

export function generateEmailVerificationEmail(
  token: string,
  appUrl: string
): string {
  const verificationLink = `${appUrl}/verify-email?token=${token}`;
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
          <p style="color: #666; line-height: 1.6;">Please verify your email address by clicking the button below:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">This link will expire in 24 hours.</p>
          <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}

export function generatePasswordResetEmail(
  token: string,
  appUrl: string
): string {
  const resetLink = `${appUrl}/reset-password?token=${token}`;
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #666; line-height: 1.6;">You requested a password reset. Click the button below to proceed:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">This link will expire in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}

export function generateApplicationStatusEmail(
  status: string,
  applicantName: string,
  applicationId: string
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Application Status Update</h2>
          <p style="color: #666; line-height: 1.6;">Hi ${applicantName},</p>
          <p style="color: #666; line-height: 1.6;">Your application status has been updated to: <strong>${status}</strong></p>
          <p style="color: #666; line-height: 1.6;">Application ID: ${applicationId}</p>
          <p style="color: #666; line-height: 1.6;">Log in to your dashboard to view more details.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Best regards,<br/>ImmigrationAI Team</p>
        </div>
      </body>
    </html>
  `;
}

export function generateConsultationEmail(
  lawyerName: string,
  scheduledTime: Date,
  meetingLink?: string
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Consultation Scheduled</h2>
          <p style="color: #666; line-height: 1.6;">Your consultation with <strong>${lawyerName}</strong> has been scheduled.</p>
          <p style="color: #666; line-height: 1.6;"><strong>Date & Time:</strong> ${scheduledTime.toLocaleString()}</p>
          ${meetingLink ? `<p style="color: #666; line-height: 1.6;"><strong>Meeting Link:</strong> <a href="${meetingLink}">${meetingLink}</a></p>` : ""}
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Best regards,<br/>ImmigrationAI Team</p>
        </div>
      </body>
    </html>
  `;
}

export function generatePaymentConfirmationEmail(
  planName: string,
  amount: string,
  nextBillingDate: Date
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #28a745; margin-bottom: 20px;">✓ Payment Confirmed</h2>
          <p style="color: #666; line-height: 1.6;">Thank you for your payment!</p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #28a745; border-radius: 4px;">
            <p style="color: #333; margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Next Billing:</strong> ${nextBillingDate.toLocaleDateString()}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">Your subscription is now active and you can access all premium features.</p>
          <p style="color: #666; line-height: 1.6;">
            <a href="https://immigrationai.com/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
              Go to Dashboard
            </a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you have any questions, contact our support team.</p>
          <p style="color: #999; font-size: 12px;">Best regards,<br/>ImmigrationAI Team</p>
        </div>
      </body>
    </html>
  `;
}

export function generateDocumentUploadConfirmationEmail(
  documentCount: number,
  applicationId: string
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Documents Received</h2>
          <p style="color: #666; line-height: 1.6;">We've received <strong>${documentCount}</strong> document(s) for your application.</p>
          <p style="color: #666; line-height: 1.6;"><strong>Application ID:</strong> ${applicationId}</p>
          <p style="color: #666; line-height: 1.6;">Our team is reviewing your documents. You'll receive an update within 24-48 hours.</p>
          <p style="color: #666; line-height: 1.6;">
            <a href="https://immigrationai.com/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 15px;">
              Check Application Status
            </a>
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Best regards,<br/>ImmigrationAI Team</p>
        </div>
      </body>
    </html>
  `;
}