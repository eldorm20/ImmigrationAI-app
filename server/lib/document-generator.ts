/**
 * Document Generator Service
 * Handles templates and instructions for AI-powered document generation
 */

import { agentsManager } from "./agents";
import { logger } from "./logger";
import { RagClient } from "./rag-client";

export interface DocumentTemplate {
    id: string;
    name: string;
    category: "submission" | "personal" | "legal";
    description: string;
    requiredFields: string[];
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
    {
        id: "motivation_letter",
        name: "Motivation Letter",
        category: "submission",
        description: "A formal letter explaining your reasons for immigration and qualifications.",
        requiredFields: ["name", "visaType", "experience", "education", "reasonForChoice"]
    },
    {
        id: "cover_letter",
        name: "Cover Letter (Job + Visa)",
        category: "submission",
        description: "Combined cover letter for both employer and immigration office.",
        requiredFields: ["name", "jobTitle", "employer", "keySkills"]
    },
    {
        id: "sponsorship_support",
        name: "Letter of Support / Sponsorship",
        category: "legal",
        description: "Formal letter from a sponsor (relative or business) supporting the application.",
        requiredFields: ["sponsorName", "relationship", "financialDetails"]
    },
    {
        id: "visa_form_helper",
        name: "Visa Form Draft (Draft Builder)",
        category: "submission",
        description: "Detailed draft content to copy into official government forms.",
        requiredFields: ["fullName", "passportNo", "address", "stayDuration"]
    },
    {
        id: "student_personal_statement",
        name: "Student Visa Personal Statement",
        category: "submission",
        description: "Statement of purpose for Student Visa (CAS) application.",
        requiredFields: ["fullName", "university", "course", "futurePlans", "fundingSource"]
    },
    {
        id: "family_relationship_proof",
        name: "Family Relationship Letter",
        category: "personal",
        description: "Letter explaining relationship history for Family/Spouse Visa.",
        requiredFields: ["applicantName", "sponsorName", "relationshipHistory", "futurePlans"]
    },
    {
        id: "tourist_itinerary",
        name: "Tourist Visa Itinerary Cover Letter",
        category: "submission",
        description: "Cover letter outlining travel itinerary and intent to return.",
        requiredFields: ["fullName", "travelDates", "destinations", "tiesToHomeCountry", "funding"]
    },
    {
        id: "employer_reference",
        name: "Employer Reference Letter",
        category: "legal",
        description: "Letter from current employer confirming employment and leave.",
        requiredFields: ["employerName", "employeeName", "jobTitle", "salary", "leaveDates"]
    }
];

/**
 * Generates a document based on template and data
 */
export async function generateLegalDocument(
    templateId: string,
    data: Record<string, any>,
    language = "en"
): Promise<string> {
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId || t.name === templateId);

    const systemPrompt = `You are a professional legal assistant specializing in international immigration. 
  Your goal is to generate a high-quality, formal ${template?.name || templateId} document.
  Use precise legal terminology and ensure the tone is appropriate for government officials.
  Respond in ${language}. Generate ONLY the document content, no talk.`;

    // RAG Integration: Fetch specific legal requirements for this template/visa
    let legalContext = "";
    try {
        const visaType = data.visaType || data.targetVisa || "immigration";
        const ragRes = await RagClient.getAnswer(`Legal requirements and key clauses for ${template?.name} for a ${visaType} visa`, "UK");
        legalContext = `\nOfficial Requirements/Guidance Policy:\n${ragRes.answer}`;
    } catch (err) {
        logger.warn({ err }, "RAG context retrieval failed for document generation");
    }

    const userPrompt = `
    Template: ${template?.name || templateId}
    Description: ${template?.description || 'N/A'}
    
    ${legalContext}
    
    User Data:
    ${Object.entries(data).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
    
    Please generate a complete, professional draft. Ensure all official requirements mentioned above are addressed.
  `;

    try {
        const response = await agentsManager.processRequest(
            "immigration-law",
            "handleUserQuery", // Reusing the expert legal agent
            [userPrompt, { context: "document generation", systemPrompt, language }]
        );

        if (response.success) {
            return response.data;
        }
        throw new Error(response.error || "Generation failed");
    } catch (error) {
        logger.error({ error, templateId }, "Document generation failed");
        return `Error generating document: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}
