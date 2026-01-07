import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// Map of template IDs to file paths (placeholders for now)
const FORM_TEMPLATES: Record<string, string> = {
    'uz_visa_app': 'forms/uz_visa_application.pdf',
    'uk_standard_visitor': 'forms/uk_visitor_visa.pdf',
    'us_ds160_draft': 'forms/us_ds160_draft.pdf'
};

/**
 * Fills a PDF form with provided data.
 * If template doesn't exist, generates a generic PDF with the data.
 */
export async function fillPdfForm(templateId: string, data: Record<string, string>): Promise<Uint8Array> {
    try {
        const templatePath = FORM_TEMPLATES[templateId];
        // Check if template exists (mock check for now)
        const fullPath = templatePath ? path.join(process.cwd(), 'server', 'assets', templatePath) : null;

        let pdfDoc: PDFDocument;

        if (fullPath && fs.existsSync(fullPath)) {
            // Load existing PDF
            const existingPdfBytes = fs.readFileSync(fullPath);
            pdfDoc = await PDFDocument.load(existingPdfBytes);
        } else {
            // Create new PDF if template missing
            pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            page.drawText(`Application Form: ${templateId}`, {
                x: 50,
                y: height - 50,
                size: 20,
                font,
                color: rgb(0, 0, 0),
            });

            let yPos = height - 100;
            for (const [key, value] of Object.entries(data)) {
                if (yPos < 50) {
                    pdfDoc.addPage();
                    yPos = height - 50;
                }
                page.drawText(`${key}:`, { x: 50, y: yPos, size: 12, font });
                page.drawText(`${value}`, { x: 200, y: yPos, size: 12, font });
                yPos -= 20;
            }
        }

        // If filling an existing form with form fields
        const form = pdfDoc.getForm();
        if (form) {
            for (const [key, value] of Object.entries(data)) {
                try {
                    const field = form.getTextField(key);
                    if (field) {
                        field.setText(value);
                    }
                } catch (e) {
                    // Field might not exist or be a checkbox
                    try {
                        const checkbox = form.getCheckBox(key);
                        if (checkbox && value === 'true') checkbox.check();
                    } catch (e2) {
                        // Ignore matching errors
                    }
                }
            }
            form.flatten(); // Flatten to prevent editing
        }

        return await pdfDoc.save();
    } catch (error) {
        logger.error({ error, templateId }, "Failed to fill PDF form");
        throw error;
    }
}

/**
 * Generates a simple Invoice PDF
 */
export async function generateInvoicePdf(invoiceData: any): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText(`INVOICE`, { x: 50, y: height - 50, size: 24, font });

    page.drawText(`Invoice ID: ${invoiceData.id}`, { x: 50, y: height - 80, size: 12, font: textFont });
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 100, size: 12, font: textFont });
    page.drawText(`To: ${invoiceData.applicantName || 'Valued Client'}`, { x: 50, y: height - 120, size: 12, font: textFont });

    page.drawText(`Amount: ${invoiceData.currency} ${invoiceData.amount}`, { x: 50, y: height - 150, size: 14, font });

    if (invoiceData.currency === 'UZS') {
        page.drawText(`VAT (12%): Included`, { x: 50, y: height - 170, size: 10, font: textFont });
        // Add QR Code placeholder or details
        page.drawText(`Tax ID (INN): 123456789`, { x: 50, y: height - 190, size: 10, font: textFont });
    }

    page.drawText(`Status: ${invoiceData.status.toUpperCase()}`, {
        x: 50,
        y: height - 220,
        size: 16,
        font,
        color: invoiceData.status === 'paid' ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0)
    });

    return await pdfDoc.save();
}
