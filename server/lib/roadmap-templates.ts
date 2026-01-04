// Roadmap stage templates by visa type
// These are the standard stages for each visa type that get auto-generated for new applications

export interface RoadmapStageTemplate {
    title: string;
    description: string;
    order: number;
    estimatedDays?: number;
}

export const roadmapTemplates: Record<string, RoadmapStageTemplate[]> = {
    "Skilled Worker": [
        {
            title: "Eligibility Assessment",
            description: "Check your eligibility for Skilled Worker visa",
            order: 0,
            estimatedDays: 3,
        },
        {
            title: "Job Offer Secure",
            description: "Obtain a job offer from a UK sponsor",
            order: 1,
            estimatedDays: 30,
        },
        {
            title: "Certificate of Sponsorship",
            description: "Employer provides Certificate of Sponsorship",
            order: 2,
            estimatedDays: 7,
        },
        {
            title: "Document Collection",
            description: "Gather required documents (passport, qualifications, TB test, etc.)",
            order: 3,
            estimatedDays: 14,
        },
        {
            title: "Application Submission",
            description: "Submit visa application online and pay fees",
            order: 4,
            estimatedDays: 1,
        },
        {
            title: "Biometrics Appointment", title: "Biometrics Appointment",
            description: "Attend biometrics appointment at visa application center",
            order: 5,
            estimatedDays: 7,
        },
        {
            title: "Decision Awaited",
            description: "Wait for Home Office decision",
            order: 6,
            estimatedDays: 21,
        },
    ],

    "Student Visa": [
        {
            title: "University Acceptance",
            description: "Receive offer from UK university",
            order: 0,
            estimatedDays: 30,
        },
        {
            title: "CAS Number",
            description: "Obtain Confirmation of Acceptance for Studies (CAS)",
            order: 1,
            estimatedDays: 7,
        },
        {
            title: "Financial Proof",
            description: "Demonstrate sufficient funds for tuition and living costs",
            order: 2,
            estimatedDays: 14,
        },
        {
            title: "Document Collection",
            description: "Gather required documents (passport, qualifications, TB test, IELTS, etc.)",
            order: 3,
            estimatedDays: 14,
        },
        {
            title: "Application Submission",
            description: "Submit visa application online and pay fees",
            order: 4,
            estimatedDays: 1,
        },
        {
            title: "Biometrics Appointment",
            description: "Attend biometrics appointment",
            order: 5,
            estimatedDays: 7,
        },
        {
            title: "Decision Awaited",
            description: "Wait for Home Office decision",
            order: 6,
            estimatedDays: 21,
        },
    ],

    "Family Visa": [
        {
            title: "Eligibility Check",
            description: "Verify relationship and financial requirements",
            order: 0,
            estimatedDays: 7,
        },
        {
            title: "Relationship Evidence",
            description: "Gather proof of relationship (marriage certificate, photos, communications)",
            order: 1,
            estimatedDays: 14,
        },
        {
            title: "Financial Requirements",
            description: "Demonstrate sponsor meets financial threshold (£18,600+)",
            order: 2,
            estimatedDays: 14,
        },
        {
            title: "Accommodation Proof",
            description: "Evidence of suitable accommodation in UK",
            order: 3,
            estimatedDays: 7,
        },
        {
            title: "English Language Test",
            description: "Pass approved English language test",
            order: 4,
            estimatedDays: 14,
        },
        {
            title: "Application Submission",
            description: "Submit visa application and pay fees",
            order: 5,
            estimatedDays: 1,
        },
        {
            title: "Biometrics \u0026 Documents",
            description: "Attend appointment and submit supporting documents",
            order: 6,
            estimatedDays: 7,
        },
        {
            title: "Decision Awaited",
            description: "Wait for Home Office decision",
            order: 7,
            estimatedDays: 84, // 12 weeks for family visa
        },
    ],

    "Tourist Visa": [
        {
            title: "Eligibility Check",
            description: "Ensure you meet tourist visa requirements",
            order: 0,
            estimatedDays: 1,
        },
        {
            title: "Travel Planning",
            description: "Book flights and accommodation",
            order: 1,
            estimatedDays: 7,
        },
        {
            title: "Financial Proof",
            description: "Bank statements and proof of funds",
            order: 2,
            estimatedDays: 3,
        },
        {
            title: "Application Submission",
            description: "Complete online application and pay fees",
            order: 3,
            estimatedDays: 1,
        },
        {
            title: "Biometrics Appointment",
            description: "Attend appointment at visa application center",
            order: 4,
            estimatedDays: 7,
        },
        {
            title: "Decision Awaited",
            description: "Wait for decision",
            order: 5,
            estimatedDays: 21,
        },
    ],

    "Germany Opportunity Card": [
        {
            title: "Points Assessment",
            description: "Calculate your points based on qualifications and experience",
            order: 0,
            estimatedDays: 3,
        },
        {
            title: "Document Translation",
            description: "Translate qualifications to German",
            order: 1,
            estimatedDays: 14,
        },
        {
            title: "Financial Proof",
            description: "Demonstrate sufficient funds (blocked account)",
            order: 2,
            estimatedDays: 7,
        },
        {
            title: "Health Insurance",
            description: "Obtain travel health insurance",
            order: 3,
            estimatedDays: 3,
        },
        {
            title: "Application Submission",
            description: "Submit application at German embassy",
            order: 4,
            estimatedDays: 1,
        },
        {
            title: "Decision Awaited",
            description: "Wait for decision",
            order: 5,
            estimatedDays: 28,
        },
    ],

    // Default template for unknown visa types
    default: [
        {
            title: "Eligibility Assessment",
            description: "Check your eligibility",
            order: 0,
            estimatedDays: 3,
        },
        {
            title: "Document Collection",
            description: "Gather required documents",
            order: 1,
            estimatedDays: 14,
        },
        {
            title: "Application Submission",
            description: "Submit visa application",
            order: 2,
            estimatedDays: 1,
        },
        {
            title: "Decision Awaited",
            description: "Wait for decision",
            order: 3,
            estimatedDays: 21,
        },
    ],
};

/**
 * Get roadmap template for a visa type
 */
export function getRoadmapTemplate(visaType: string): RoadmapStageTemplate[] {
    return roadmapTemplates[visaType] || roadmapTemplates.default;
}
