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
    },
    {
        id: "business_plan_exec",
        name: "Business Visa Plan (Executive Summary)",
        category: "submission",
        description: "Executive summary for Innovator or Expansion Worker visa business plans.",
        requiredFields: ["businessName", "sector", "innovationPoint", "investmentAmount", "jobCreation"]
    },
    {
        id: "global_talent_cv",
        name: "Global Talent Tech Nation CV",
        category: "submission",
        description: "Specialized CV for Global Talent tech endorsements.",
        requiredFields: ["fullName", "techExpertise", "impactSummary", "awards", "publications"]
    },
    {
        id: "refusal_appeal_letter",
        name: "Refusal Appeal / Administrative Review",
        category: "legal",
        description: "Formal letter appealing a visa refusal or requesting review.",
        requiredFields: ["refusalReference", "groundsForAppeal", "evidenceProvided", "rebuttalPoints"]
    },
    // UK Student Visa (Tier 4 / Student Route)
    {
        id: "uk_student_visa",
        name: "UK Student Visa - Tier 4/Student Route Cover Letter",
        category: "submission",
        description: "Cover letter and statement of purpose for UK Student Visa application with CAS.",
        requiredFields: ["fullName", "casNumber", "university", "course", "startDate", "fundingSource", "englishProficiency"]
    },
    // US F-1 Student Visa
    {
        id: "us_f1_visa",
        name: "US F-1 Student Visa - DS-160 Support Letter",
        category: "submission",
        description: "Statement for F-1 visa interview demonstrating non-immigrant intent and ties to home country.",
        requiredFields: ["fullName", "i20Number", "sevisId", "university", "major", "tiesToHomeCountry", "financialSupport"]
    },
    // Canada Study Permit
    {
        id: "canada_study_permit",
        name: "Canada Study Permit - Letter of Explanation",
        category: "submission",
        description: "Letter explaining intent to study in Canada and return to home country after completion.",
        requiredFields: ["fullName", "diNumber", "institution", "program", "studyStart", "studyEnd", "proofOfFunds", "tiesToHome"]
    },
    // UK Standard Visitor Visa (Tourist)
    {
        id: "uk_tourist_visa",
        name: "UK Standard Visitor Visa Cover Letter",
        category: "submission",
        description: "Cover letter for UK tourist visa explaining travel purpose and intent to return.",
        requiredFields: ["fullName", "travelDates", "destinationsInUK", "accommodationType", "financialProof", "employment", "familyTies"]
    },
    // Schengen Tourist Visa
    {
        id: "schengen_tourist_visa",
        name: "Schengen Tourist Visa Application Letter",
        category: "submission",
        description: "Cover letter for Schengen area short-stay visa with detailed itinerary.",
        requiredFields: ["fullName", "passportNumber", "countriesVisiting", "travelDates", "itinerary", "accommodation", "travelInsurance", "financialMeans", "employment"]
    },
    // UK Skilled Worker Visa (work visa)
    {
        id: "uk_skilled_worker",
        name: "UK Skilled Worker Visa Support Letter",
        category: "submission",
        description: "Application support letter for UK Skilled Worker visa with CoS details.",
        requiredFields: ["fullName", "cosNumber", "employer", "jobTitle", "salary", "soc2020Code", "startDate", "qualifications"]
    },
    {
        id: "us_h1b_visa",
        name: "US H-1B Work Visa - Petition Support Letter",
        category: "legal",
        description: "Support letter for H-1B specialty occupation visa petition.",
        requiredFields: ["beneficiaryName", "petitionerName", "jobTitle", "lca", "prevailingWage", "qualifications", "jobDuties"]
    },
    // Uzbekistan -> UK Outbound Templates
    {
        id: "uz_uk_tb_test",
        name: "TB Test Certificate Request (Tashkent)",
        category: "submission",
        description: "Letter to IOM/Clinic in Tashkent requesting TB screening appointment for UK Visa.",
        requiredFields: ["fullName", "passportDetails", "intendedTravelDate", "ukVisasApplicationNumber"]
    },
    {
        id: "uz_uk_bank_statement_letter",
        name: "Bank Statement Verification (Uzbek Banks)",
        category: "submission",
        description: "Template for Uzbek banks (NBU, Kapitalbank, Ipak Yuli) to verify funds meeting UKVI Appendix Finance rules.",
        requiredFields: ["bankName", "accountHolderName", "accountNumber", "balanceAmountLCY", "exchangeRate", "fundsHeldDate"]
    },
    {
        id: "uz_uk_consent_letter",
        name: "Parental Consent Affidavit (Uzbek Notary)",
        category: "legal",
        description: "Notarized affidavit of consent for minor traveling to UK, formatted for Uzbekistan notary standards.",
        requiredFields: ["parentName", "childName", "childPassport", "accompanyingAdult", "travelDates", "ukAddress"]
    },
    {
        id: "uz_uk_employment_ref",
        name: "Employment Reference (Uzbek Employer for UKVI)",
        category: "submission",
        description: "Employer reference letter from Uzbek company in English, meeting UK Skilled Worker verification standards.",
        requiredFields: ["employerName", "employeeName", "role", "salaryUZS", "taxIdSTIR", "employmentDates", "contactDetails"]
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
