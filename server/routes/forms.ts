/**
 * Forms Routes
 * Endpoints for auto-filling and downloading government forms
 */

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { fillPdfForm, generateInvoicePdf } from "../lib/form-filler";
import { z } from "zod";

const router = Router();

// Schema for form fill request
const fillFormSchema = z.object({
    templateId: z.string(),
    data: z.record(z.string())
});

// Get available form templates (mock list)
router.get("/templates", authenticate, (req, res) => {
    res.json([
        { id: "uz_visa_app", name: "Uzbekistan Visa Application Form" },
        { id: "uk_standard_visitor", name: "UK Standard Visitor Visa Form" },
        { id: "us_ds160_draft", name: "US DS-160 Draft Worksheet" }
    ]);
});

// Fill a form and download PDF
router.post("/fill", authenticate, asyncHandler(async (req, res) => {
    // Validate body
    const { templateId, data } = fillFormSchema.parse(req.body);

    // Generate PDF
    const pdfBytes = await fillPdfForm(templateId, data);

    // Send as file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${templateId}_filled.pdf`);
    res.send(Buffer.from(pdfBytes));
}));

// Route for invoice PDF (used by invoice system)
router.get("/invoice/:id/pdf", authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    // Mock fetching invoice data - specific implementation should use db
    // This is just a utility endpoint if needed, but likely better in invoices.ts
    // We'll skip DB check here for simplicity and assume data passed in body or just mock

    // For now, let's just make a generic receipt
    const pdfBytes = await generateInvoicePdf({
        id,
        applicantName: 'Client', // Simplified for now as username might not be on req.user
        amount: 0,
        currency: 'USD',
        status: 'draft'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${id}.pdf`);
    res.send(Buffer.from(pdfBytes));
}));

export default router;
