// AI-Powered Email Automation System
import { ollamaClient } from '../ai/ollama/client';
import nodemailer from 'nodemailer';

interface EmailTemplate {
    type: 'welcome' | 'document-ready' | 'interview-reminder' | 'case-update' | 'payment-reminder' | 'consultation-scheduled';
    subject: string;
    context: Record<string, any>;
}

interface EmailRecipient {
    email: string;
    name: string;
    language: 'en' | 'uz' | 'ru';
}

export class AIEmailAutomation {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * Generate personalized email content using AI
     */
    async generateEmailContent(
        template: EmailTemplate,
        recipient: EmailRecipient
    ): Promise<{ subject: string; html: string; text: string }> {
        const prompt = this.buildEmailPrompt(template, recipient);

        const content = await ollamaClient.generate(prompt, {
            model: template.context.language === 'uz' || template.context.language === 'ru'
                ? 'aya:8b'
                : 'llama3:8b',
            temperature: 0.7,
        });

        return {
            subject: this.generateSubject(template, recipient),
            html: this.formatAsHTML(content),
            text: content,
        };
    }

    /**
     * Send automated email
     */
    async sendEmail(
        recipient: EmailRecipient,
        template: EmailTemplate
    ): Promise<boolean> {
        try {
            const { subject, html, text } = await this.generateEmailContent(template, recipient);

            await this.transporter.sendMail({
                from: `Immigration AI Platform <${process.env.SMTP_USER}>`,
                to: recipient.email,
                subject,
                text,
                html,
            });

            console.log(`Email sent to ${recipient.email}: ${template.type}`);
            return true;
        } catch (error) {
            console.error('Email send error:', error);
            return false;
        }
    }

    /**
     * Send bulk emails with AI personalization
     */
    async sendBulkEmails(
        recipients: EmailRecipient[],
        template: EmailTemplate
    ): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;

        for (const recipient of recipients) {
            const success = await this.sendEmail(recipient, template);
            if (success) {
                sent++;
            } else {
                failed++;
            }
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return { sent, failed };
    }

    /**
     * Schedule automated email reminders
     */
    async scheduleReminder(
        recipient: EmailRecipient,
        reminderType: 'interview' | 'document-deadline' | 'payment-due',
        scheduledDate: Date,
        context: Record<string, any>
    ): Promise<void> {
        // Store in database for cron job to process
        const reminder = {
            recipient,
            type: reminderType,
            scheduledDate,
            context,
            status: 'pending',
        };

        // In production, save to database
        console.log('Reminder scheduled:', reminder);
    }

    /**
     * Build email prompt for AI generation
     */
    private buildEmailPrompt(template: EmailTemplate, recipient: EmailRecipient): string {
        const languageInstruction = recipient.language !== 'en'
            ? `Write the ENTIRE email in ${recipient.language === 'uz' ? 'Uzbek' : 'Russian'} language.`
            : '';

        const prompts: Record<EmailTemplate['type'], string> = {
            welcome: `Write a warm welcome email for a new immigration platform user.
      
User: ${recipient.name}
Platform: Immigration AI

Include:
- Warm greeting
- Brief platform introduction
- Key features overview
- Next steps
- Support contact

${languageInstruction}`,

            'document-ready': `Write a professional email notifying that generated documents are ready.

User: ${recipient.name}
Document Type: ${template.context.documentType}
Status: Ready for download

Include:
- Notification of completion
- Download link placeholder
- Review instructions
- Next steps

${languageInstruction}`,

            'interview-reminder': `Write a friendly reminder email for upcoming interview.

User: ${recipient.name}
Interview Date: ${template.context.interviewDate}
Interview Type: ${template.context.interviewType}

Include:
- Reminder of interview
- Preparation tips
- What to bring
- Encouragement

${languageInstruction}`,

            'case-update': `Write an informative case status update email.

User: ${recipient.name}
Case Status: ${template.context.status}
Update: ${template.context.update}

Include:
- Status update
- What this means
- Next steps
- Timeline if applicable

${languageInstruction}`,

            'payment-reminder': `Write a polite payment reminder email.

User: ${recipient.name}
Amount Due: ${template.context.amount}
Due Date: ${template.context.dueDate}
Service: ${template.context.service}

Include:
- Friendly reminder
- Amount and due date
- Payment methods
- Payment link placeholder

${languageInstruction}`,

            'consultation-scheduled': `Write a confirmation email for scheduled video consultation.

User: ${recipient.name}
Lawyer: ${template.context.lawyerName}
Date: ${template.context.consultationDate}
Meeting Link: ${template.context.meetingLink}

Include:
- Confirmation details
- Date and time
- Meeting link
- Preparation suggestions

${languageInstruction}`,
        };

        return prompts[template.type] + '\n\nWrite a professional, friendly email:';
    }

    /**
     * Generate email subject
     */
    private generateSubject(template: EmailTemplate, recipient: EmailRecipient): string {
        const subjects: Record<EmailTemplate['type'], Record<string, string>> = {
            welcome: {
                en: `Welcome to Immigration AI, ${recipient.name}!`,
                uz: `Immigration AI'ga xush kelibsiz, ${recipient.name}!`,
                ru: `Добро пожаловать в Immigration AI, ${recipient.name}!`,
            },
            'document-ready': {
                en: `Your ${template.context.documentType} is Ready!`,
                uz: `Sizning ${template.context.documentType} tayyor!`,
                ru: `Ваш ${template.context.documentType} готов!`,
            },
            'interview-reminder': {
                en: `Reminder: Interview on ${template.context.interviewDate}`,
                uz: `Eslatma: Intervyu ${template.context.interviewDate}`,
                ru: `Напоминание: Интервью ${template.context.interviewDate}`,
            },
            'case-update': {
                en: `Case Update: ${template.context.status}`,
                uz: `Ish yangilanishi: ${template.context.status}`,
                ru: `Обновление дела: ${template.context.status}`,
            },
            'payment-reminder': {
                en: `Payment Reminder: ${template.context.amount} Due`,
                uz: `To'lov eslatmasi: ${template.context.amount}`,
                ru: `Напоминание об оплате: ${template.context.amount}`,
            },
            'consultation-scheduled': {
                en: `Video Consultation Confirmed with ${template.context.lawyerName}`,
                uz: `Video konsultatsiya tasdiqlandi - ${template.context.lawyerName}`,
                ru: `Видеоконсультация подтверждена с ${template.context.lawyerName}`,
            },
        };

        return subjects[template.type][recipient.language];
    }

    /**
     * Format text as HTML email
     */
    private formatAsHTML(text: string): string {
        const paragraphs = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`);

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #2563eb; }
    p { margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 0.875rem; color: #6b7280; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 10px 0; }
  </style>
</head>
<body>
  ${paragraphs.join('\n')}
  <div class="footer">
    <p>Immigration AI Platform<br>
    <a href="https://your-domain.com">Visit Dashboard</a> | <a href="mailto:support@your-domain.com">Contact Support</a></p>
  </div>
</body>
</html>`;
    }
}

// Singleton instance
export const aiEmailAutomation = new AIEmailAutomation();
