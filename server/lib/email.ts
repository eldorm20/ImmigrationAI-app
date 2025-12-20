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