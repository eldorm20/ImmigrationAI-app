import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { applications, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { agentsManager } from "../lib/agents";

const router = Router();

router.use(authenticate);

// Form templates for different visa types
const FORM_TEMPLATES = {
    "uk_skilled_worker": {
        name: "UK Skilled Worker Visa",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "passportExpiry", "currentAddress",
            "employer", "jobTitle", "salary", "cosNumber", "startDate", "qualifications", "englishProficiency"],
        requiredDocuments: ["Passport", "Certificate of Sponsorship", "Bank Statements", "English Test Results", "Qualifications"]
    },
    "uk_student": {
        name: "UK Student Visa (Tier 4)",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "passportExpiry", "currentAddress",
            "casNumber", "university", "course", "courseStart", "courseEnd", "financialEvidence", "atasNumber"],
        requiredDocuments: ["Passport", "CAS Letter", "Bank Statements", "Academic Transcripts", "ATAS Certificate"]
    },
    "uk_family": {
        name: "UK Family Visa (Spouse/Partner)",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "sponsorName", "sponsorDateOfBirth",
            "relationshipStart", "marriageDate", "cohabitationEvidence", "financialRequirement", "accommodationDetails"],
        requiredDocuments: ["Passport", "Marriage Certificate", "Cohabitation Evidence", "Sponsor Bank Statements", "Accommodation Proof"]
    },
    "us_h1b": {
        name: "US H-1B Visa",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "petitionerName", "petitionerAddress",
            "jobTitle", "lcaNumber", "prevailingWage", "actualWage", "qualifications", "previousH1BHistory"],
        requiredDocuments: ["Passport", "LCA", "Degree Certificates", "Resume", "Job Offer Letter"]
    },
    "us_f1": {
        name: "US F-1 Student Visa",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "sevisId", "i20Number",
            "university", "program", "programStart", "estimatedCost", "financialSupport", "tiesToHomeCountry"],
        requiredDocuments: ["Passport", "I-20", "SEVIS Fee Receipt", "Bank Statements", "Admission Letter"]
    },
    "schengen_tourist": {
        name: "Schengen Tourist Visa",
        fields: ["fullName", "dateOfBirth", "nationality", "passportNumber", "travelDates", "countriesVisiting",
            "accommodation", "travelInsurance", "employmentStatus", "financialMeans", "returnFlightBooking"],
        requiredDocuments: ["Passport", "Flight Booking", "Hotel Reservations", "Travel Insurance", "Bank Statements"]
    }
};

// GET /api/form-prefill/templates - List available templates
router.get(
    "/templates",
    asyncHandler(async (req, res) => {
        const templates = Object.entries(FORM_TEMPLATES).map(([id, template]) => ({
            id,
            name: template.name,
            fieldCount: template.fields.length,
            documentsRequired: template.requiredDocuments.length
        }));
        res.json({ templates });
    })
);

// GET /api/form-prefill/template/:id - Get specific template details
router.get(
    "/template/:id",
    asyncHandler(async (req, res) => {
        const templateId = req.params.id as keyof typeof FORM_TEMPLATES;
        const template = FORM_TEMPLATES[templateId];

        if (!template) {
            throw new AppError(404, "Template not found");
        }

        res.json({
            id: templateId,
            ...template
        });
    })
);

// POST /api/form-prefill/generate - Generate pre-filled form data
router.post(
    "/generate",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { clientId, templateId, additionalData } = req.body;

        if (!clientId || !templateId) {
            throw new AppError(400, "clientId and templateId are required");
        }

        const template = FORM_TEMPLATES[templateId as keyof typeof FORM_TEMPLATES];
        if (!template) {
            throw new AppError(404, "Template not found");
        }

        // Fetch client data
        const [client] = await db
            .select()
            .from(users)
            .where(eq(users.id, clientId));

        if (!client) {
            throw new AppError(404, "Client not found");
        }

        // Fetch client's application if exists
        const [application] = await db
            .select()
            .from(applications)
            .where(eq(applications.userId, clientId));

        // Build context for AI
        const clientContext = {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phone: client.phone,
            metadata: client.metadata || {},
            application: application ? {
                visaType: application.visaType,
                country: application.country,
                status: application.status,
                metadata: application.metadata || {}
            } : null,
            ...additionalData
        };

        // Generate form data using AI
        const prompt = `You are an expert immigration form assistant. Based on the following client information, generate pre-filled form data for a ${template.name} application.

Client Information:
${JSON.stringify(clientContext, null, 2)}

Required Form Fields: ${template.fields.join(', ')}

Instructions:
1. Extract and format data from the client information to fill each field
2. Use proper formatting (dates as DD/MM/YYYY, names in UPPERCASE where appropriate)
3. For missing information, provide a placeholder like "[REQUIRED: Field Name]"
4. Return a JSON object with each field name as a key

Return ONLY the JSON object, no explanation.`;

        try {
            const aiResponse = await agentsManager.processRequest(
                "immigration-law",
                "handleUserQuery",
                [prompt, { context: "form-prefill", language: "en" }]
            );

            let formData: Record<string, string> = {};

            if (aiResponse.success && aiResponse.data) {
                // Try to parse AI response as JSON
                try {
                    const jsonMatch = aiResponse.data.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        formData = JSON.parse(jsonMatch[0]);
                    }
                } catch (parseErr) {
                    logger.warn({ parseErr }, "Failed to parse AI form data, using fallback");
                }
            }

            // Ensure all fields have at least a placeholder value
            for (const field of template.fields) {
                if (!formData[field]) {
                    // Try to infer from client data
                    if (field === 'fullName') formData[field] = `${client.firstName || ''} ${client.lastName || ''}`.trim().toUpperCase() || '[REQUIRED]';
                    else if (field === 'dateOfBirth') formData[field] = (clientContext.metadata as any)?.dateOfBirth || '[REQUIRED: Date of Birth]';
                    else if (field === 'nationality') formData[field] = (clientContext.metadata as any)?.nationality || '[REQUIRED: Nationality]';
                    else if (field === 'passportNumber') formData[field] = (clientContext.metadata as any)?.passportNumber || '[REQUIRED: Passport Number]';
                    else if (field === 'currentAddress') formData[field] = (clientContext.metadata as any)?.address || '[REQUIRED: Current Address]';
                    else formData[field] = `[REQUIRED: ${field.replace(/([A-Z])/g, ' $1').trim()}]`;
                }
            }

            logger.info({ lawyerId, clientId, templateId }, "Form pre-fill generated");

            res.json({
                success: true,
                template: template.name,
                formData,
                requiredDocuments: template.requiredDocuments,
                generatedAt: new Date().toISOString()
            });

        } catch (err: any) {
            logger.error({ err, templateId }, "Form pre-fill generation failed");

            // Return a basic structure even if AI fails
            const fallbackData: Record<string, string> = {};
            for (const field of template.fields) {
                if (field === 'fullName') fallbackData[field] = `${client.firstName || ''} ${client.lastName || ''}`.trim().toUpperCase() || '[REQUIRED]';
                else fallbackData[field] = `[REQUIRED: ${field.replace(/([A-Z])/g, ' $1').trim()}]`;
            }

            res.json({
                success: true,
                template: template.name,
                formData: fallbackData,
                requiredDocuments: template.requiredDocuments,
                generatedAt: new Date().toISOString(),
                note: "AI generation unavailable, using basic fallback"
            });
        }
    })
);

// POST /api/form-prefill/export - Export form data as PDF-friendly format
router.post(
    "/export",
    asyncHandler(async (req, res) => {
        const { formData, templateId, format = "json" } = req.body;

        const template = FORM_TEMPLATES[templateId as keyof typeof FORM_TEMPLATES];
        if (!template) {
            throw new AppError(404, "Template not found");
        }

        if (format === "json") {
            res.json({
                templateName: template.name,
                exportedAt: new Date().toISOString(),
                fields: formData
            });
        } else if (format === "text") {
            // Generate a text/markdown version for copying
            let textOutput = `# ${template.name}\n\n`;
            textOutput += `Generated: ${new Date().toISOString()}\n\n`;
            textOutput += `## Form Fields\n\n`;

            for (const [field, value] of Object.entries(formData)) {
                const label = field.replace(/([A-Z])/g, ' $1').trim();
                textOutput += `**${label}**: ${value}\n\n`;
            }

            textOutput += `## Required Documents\n\n`;
            for (const doc of template.requiredDocuments) {
                textOutput += `- [ ] ${doc}\n`;
            }

            res.type("text/plain").send(textOutput);
        } else {
            throw new AppError(400, "Unsupported format. Use 'json' or 'text'");
        }
    })
);

export default router;
