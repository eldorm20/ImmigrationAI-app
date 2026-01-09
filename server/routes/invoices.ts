import { Router } from "express";
import { db } from "../db";
import { invoices, insertInvoiceSchema, users } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { logger } from "../lib/logger";
import { enqueueJob } from "../lib/queue";

const router = Router();

router.use(authenticate);

// Get invoices (Lawyers get all they created, applicants get theirs)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const role = req.user!.role;

        try {
            let where;
            if (role === "applicant") {
                where = eq(invoices.applicantId, userId);
            } else {
                where = eq(invoices.lawyerId, userId);
            }

            const allInvoices = await db.query.invoices.findMany({
                where,
                orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
            });

            // Enrich with applicant details
            const applicantIds = Array.from(new Set(allInvoices.map(i => i.applicantId)));
            if (!applicantIds.length) return res.json(allInvoices);

            const applicantList = await db.query.users.findMany({
                where: or(...applicantIds.map(id => eq(users.id, id))),
                columns: { id: true, firstName: true, lastName: true, email: true }
            });

            const userMap: Record<string, any> = {};
            applicantList.forEach(u => userMap[u.id] = u);

            const enriched = allInvoices.map(inv => ({
                ...inv,
                applicant: userMap[inv.applicantId]
            }));

            res.json(enriched);
        } catch (error) {
            logger.error({ error, userId, role }, "Failed to fetch invoices");
            res.status(500).json({
                error: "Failed to fetch invoices",
                details: error instanceof Error ? error.message : "Unknown error"
            });
        }
    })
);

// Create a new invoice (Lawyers only)
router.post(
    "/",
    requireRole("lawyer", "admin"),
    validateBody(insertInvoiceSchema),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        try {
            const invoiceData = { ...req.body };

            // Default to UZS if not specified
            if (!invoiceData.currency) {
                invoiceData.currency = 'UZS';
            }

            // Auto-calculate 12% VAT for Uzbekistan (UZS) invoices
            if (invoiceData.currency === 'UZS') {
                const baseAmount = parseFloat(invoiceData.amount || '0');
                const vatAmount = baseAmount * 0.12;
                invoiceData.taxRate = '12';
                invoiceData.taxAmount = Math.round(vatAmount).toString(); // UZS usually rounded
                invoiceData.totalAmount = Math.round(baseAmount + vatAmount).toString();

                // Add VAT line item if not already included
                if (Array.isArray(invoiceData.items)) {
                    const hasVat = invoiceData.items.some((item: any) =>
                        item.description.includes('VAT') || item.description.includes('НДС')
                    );
                    if (!hasVat) {
                        invoiceData.items.push({
                            description: 'VAT (12%) / НДС (12%)',
                            amount: Math.round(vatAmount).toString()
                        });
                    }
                }
            }

            const [invoice] = await db
                .insert(invoices)
                .values({
                    ...invoiceData,
                    lawyerId,
                })
                .returning();
            res.status(201).json(invoice);
        } catch (error) {
            logger.error({ error, lawyerId, body: req.body }, "Failed to create invoice");
            throw error;
        }
    })
);

// Initiate Stripe payment for an invoice (Applicant version)
router.post(
    "/:id/pay",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { id } = req.params;

        try {
            const [invoice] = await db
                .select()
                .from(invoices)
                .where(and(eq(invoices.id, id), eq(invoices.applicantId, userId)));

            if (!invoice) {
                return res.status(404).json({ message: "Invoice not found or access denied" });
            }

            if (invoice.status === 'paid') {
                return res.status(400).json({ message: "Invoice already paid" });
            }

            const { getStripeClient } = await import("../lib/subscription");
            const stripe = await getStripeClient();

            if (!stripe) {
                return res.status(503).json({ message: "Stripe is not configured" });
            }

            const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
            const amount = Math.round(parseFloat(invoice.totalAmount || invoice.amount) * 1); // UZS is zero-decimal in Stripe

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: (invoice.currency || 'UZS').toLowerCase(),
                            product_data: {
                                name: `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
                                description: `Legal Services - ImmigrationAI`,
                            },
                            unit_amount: amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                success_url: `${clientUrl}/dashboard?tab=finances&payment=success&invoice=${invoice.id}`,
                cancel_url: `${clientUrl}/dashboard?tab=finances&payment=cancel`,
                metadata: {
                    invoiceId: invoice.id,
                    userId: userId,
                    type: "invoice_payment"
                },
            });

            res.json({ url: session.url });
        } catch (error) {
            logger.error({ error, userId, invoiceId: id }, "Failed to create payment session");
            throw error;
        }
    })
);

// Generate payment link for an invoice (Lawyer version)
router.post(
    "/:id/link",
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        try {
            const [invoice] = await db
                .select()
                .from(invoices)
                .where(and(eq(invoices.id, id), eq(invoices.lawyerId, lawyerId)));

            if (!invoice) {
                return res.status(404).json({ message: "Invoice not found or access denied" });
            }

            const { getStripeClient } = await import("../lib/subscription");
            const stripe = await getStripeClient();

            if (!stripe) {
                return res.status(503).json({ message: "Stripe is not configured" });
            }

            const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || req.get("origin") || "http://localhost:5173";
            const amount = Math.round(parseFloat(invoice.totalAmount || invoice.amount) * 1); // UZS is zero-decimal

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                line_items: [
                    {
                        price_data: {
                            currency: (invoice.currency || 'UZS').toLowerCase(),
                            product_data: {
                                name: `Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
                                description: `Legal Services - ImmigrationAI`,
                            },
                            unit_amount: amount,
                        },
                        quantity: 1,
                    },
                ],
                mode: "payment",
                success_url: `${clientUrl}/payment-success?invoice=${invoice.id}`,
                cancel_url: `${clientUrl}/payment-cancel`,
                metadata: {
                    invoiceId: invoice.id,
                    lawyerId: lawyerId,
                    type: "invoice_payment"
                },
            });

            res.json({ url: session.url });
        } catch (error) {
            logger.error({ error, lawyerId, invoiceId: id }, "Failed to generate payment link");
            throw error;
        }
    })
);

// Update an invoice status (Lawyer or Admin)
router.patch(
    "/:id",
    requireRole("lawyer", "admin"),
    validateBody(insertInvoiceSchema.partial()),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        try {
            const [updatedInvoice] = await db
                .update(invoices)
                .set({
                    ...req.body,
                    updatedAt: new Date(),
                })
                .where(and(eq(invoices.id, id), eq(invoices.lawyerId, lawyerId)))
                .returning();

            if (!updatedInvoice) {
                return res.status(404).json({ message: "Invoice not found or access denied" });
            }

            res.json(updatedInvoice);
        } catch (error) {
            logger.error({ error, lawyerId, invoiceId: id }, "Failed to update invoice");
            throw error;
        }
    })
);

// Send payment reminder
router.post(
    "/:id/remind",
    requireRole("lawyer", "admin"),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        try {
            const [invoice] = await db
                .select()
                .from(invoices)
                .where(and(eq(invoices.id, id), eq(invoices.lawyerId, lawyerId)));

            if (!invoice) {
                return res.status(404).json({ message: "Invoice not found" });
            }

            const [applicant] = await db
                .select()
                .from(users)
                .where(eq(users.id, invoice.applicantId));

            if (!applicant) {
                return res.status(404).json({ message: "Client not found" });
            }

            await enqueueJob(lawyerId, "email", {
                to: applicant.email,
                subject: `Payment Reminder: Invoice #${invoice.id.slice(0, 8).toUpperCase()}`,
                html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">Payment Reminder</h2>
              <p>Dear ${applicant.firstName || 'Client'},</p>
              <p>This is a friendly reminder regarding invoice <strong>#${invoice.id.slice(0, 8).toUpperCase()}</strong>.</p>
              
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Due</p>
                <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #111827;">$${invoice.amount}</p>
                <div style="margin-top: 15px;">
                  <span style="background: ${invoice.status === 'overdue' ? '#fee2e2' : '#dbeafe'}; color: ${invoice.status === 'overdue' ? '#991b1b' : '#1e40af'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                    ${invoice.status}
                  </span>
                </div>
              </div>

              <p>Please arrange payment at your earliest convenience to avoid any service interruptions.</p>
              <br/>
              <p>Best regards,</p>
              <p>The ImmigrationAI Team</p>
            </div>
            `
            });

            res.json({ message: "Reminder sent successfully" });
        } catch (error) {
            logger.error({ error, lawyerId, invoiceId: id }, "Failed to send reminder");
            throw error;
        }
    })
);

export default router;
