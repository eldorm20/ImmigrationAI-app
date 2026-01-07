import { db } from "../db";
import { roadmapItems, documents } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

// Keyword mapping for auto-completion
const DOC_KEYWORDS: Record<string, string[]> = {
    "passport": ["passport"],
    "cv": ["cv", "resume", "curriculum vitae"],
    "resume": ["cv", "resume", "curriculum vitae"],
    "bank": ["bank", "financial", "statement"],
    "financial": ["bank", "financial", "statement"],
    "police": ["police", "report", "clearance"],
    "medical": ["medical", "health", "exam"],
    "photo": ["photo", "picture"],
    "motivation": ["motivation", "letter", "intent"],
    "employment": ["employment", "job", "contract", "employer", "offer"],
    "qualification": ["degree", "diploma", "certificate", "qualification", "education", "transcript"],
    "cas": ["cas", "acceptance", "university", "admission"],
    "relationship": ["marriage", "birth", "family", "relationship", "spouse", "partner"],
    "language": ["english", "ielts", "toefl", "pte", "language"],
    "insurance": ["insurance", "health", "medical"],
    "itinerary": ["flight", "itinerary", "booking", "travel"],
};

export async function updateRoadmapProgress(applicationId: string): Promise<boolean> {
    try {
        // Fetch application for metadata and status
        const application = await db.query.applications.findFirst({
            where: eq(roadmapItems.applicationId, applicationId), // roadmapItems.applicationId is same as applications.id
        });

        if (!application) return false;

        // Fetch roadmap items (ordered)
        let items = await db.query.roadmapItems.findMany({
            where: eq(roadmapItems.applicationId, applicationId),
            orderBy: (items, { asc }) => asc(items.order),
        });

        if (items.length === 0) return false;

        // Fetch uploaded documents
        const uploadedDocs = await db.query.documents.findMany({
            where: eq(documents.applicationId, applicationId),
        });

        const metadata = (application.metadata || {}) as any;
        const milestones = (metadata.milestones || {}) as Record<string, boolean>;
        let hasUpdates = false;

        // 1. Update status based on documents, milestones, and application status
        for (const item of items) {
            if (item.status === "completed") continue;

            const lowerTitle = item.title.toLowerCase();
            let isCompleted = false;

            // Stage 1: Assessment
            if (lowerTitle.includes("assessment") && milestones.assessment) {
                isCompleted = true;
            }
            // Stage 2: Visa Simulator
            else if (lowerTitle.includes("simulator") && milestones.simulator) {
                isCompleted = true;
            }
            // Stage 3: Documents
            else if (lowerTitle.includes("documents")) {
                // Check if any required doc or significant number of docs are uploaded
                if (uploadedDocs.length > 0) isCompleted = true;
            }
            // Stage 4: AI Review
            else if (lowerTitle.includes("ai review") && milestones.aiReview) {
                isCompleted = true;
            }
            // Stage 5: Gov Checks
            else if (lowerTitle.includes("gov check") && milestones.govChecks) {
                isCompleted = true;
            }
            // Stage 6: Interview Coach
            else if (lowerTitle.includes("interview") && milestones.interviewCoach) {
                isCompleted = true;
            }
            // Stage 7: Lawyer Review
            else if (lowerTitle.includes("lawyer review")) {
                if (application.status === 'approved' || application.status === 'submitted_to_gov') {
                    isCompleted = true;
                }
            }
            // Stage 8: Submission
            else if (lowerTitle.includes("submission")) {
                if (application.status === 'submitted_to_gov') {
                    isCompleted = true;
                }
            }

            // Fallback: Check keywords in documents (original logic)
            if (!isCompleted) {
                for (const [key, variants] of Object.entries(DOC_KEYWORDS)) {
                    if (variants.some(v => lowerTitle.includes(v))) {
                        const hasDoc = uploadedDocs.some(d => {
                            const dType = d.documentType?.toLowerCase() || "";
                            const dName = d.fileName.toLowerCase();
                            return dType.includes(key) || dName.includes(key) || variants.some(v => dType.includes(v) || dName.includes(v));
                        });

                        if (hasDoc) {
                            isCompleted = true;
                            break;
                        }
                    }
                }
            }

            if (isCompleted) {
                await db.update(roadmapItems)
                    .set({ status: "completed", completedAt: new Date() })
                    .where(eq(roadmapItems.id, item.id));
                item.status = "completed";
                hasUpdates = true;
            }
        }

        // 2. Logic to maintain "Pending" -> "Current" flow.
        if (hasUpdates) {
            items = await db.query.roadmapItems.findMany({
                where: eq(roadmapItems.applicationId, applicationId),
                orderBy: (items, { asc }) => asc(items.order),
            });
        }

        const firstPendingIndex = items.findIndex(i => i.status !== "completed");

        if (firstPendingIndex !== -1) {
            const currentItem = items[firstPendingIndex];
            if (currentItem.status === "pending") {
                await db.update(roadmapItems)
                    .set({ status: "current" })
                    .where(eq(roadmapItems.id, currentItem.id));
                hasUpdates = true;
            }

            for (let i = firstPendingIndex + 1; i < items.length; i++) {
                if (items[i].status === "current") {
                    await db.update(roadmapItems)
                        .set({ status: "pending" })
                        .where(eq(roadmapItems.id, items[i].id));
                    hasUpdates = true;
                }
            }
        }

        return hasUpdates;
    } catch (error) {
        logger.error({ error, applicationId }, "Failed to update roadmap progress");
        return false;
    }
}

/**
 * Update a milestone in application metadata and trigger roadmap recalculation
 */
export async function updateMilestone(applicationId: string, milestone: string): Promise<void> {
    try {
        const { applications } = await import("@shared/schema");
        const app = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId)
        });

        if (app) {
            const metadata = (app.metadata || {}) as any;
            if (!metadata.milestones) metadata.milestones = {};
            metadata.milestones[milestone] = true;

            await db.update(applications)
                .set({ metadata, updatedAt: new Date() })
                .where(eq(applications.id, applicationId));

            await updateRoadmapProgress(applicationId);
            logger.info({ applicationId, milestone }, "Updated milestone and roadmap");
        }
    } catch (err) {
        logger.error({ err, applicationId, milestone }, "Failed to update milestone");
    }
}

/**
 * Generate default roadmap stages for a new application based on visa type
 */
export function getDefaultRoadmapStages(visaType: string): Array<{
    title: string;
    description: string;
    estimatedDays?: number;
}> {
    // Standard 8-stage journey for all applications as per client requirement
    const journeyStages = [
        {
            title: "Assessment",
            description: "Initial profile assessment and eligibility scoring.",
            estimatedDays: 1
        },
        {
            title: "Visa Simulator",
            description: "AI-powered probability check for visa success.",
            estimatedDays: 1
        },
        {
            title: "Documents",
            description: "Collection and preliminary upload of required documentation.",
            estimatedDays: 5
        },
        {
            title: "AI Review",
            description: "Automated analysis of uploaded documents for compliance.",
            estimatedDays: 1
        },
        {
            title: "Gov Checks",
            description: "Identity and background verification against government databases.",
            estimatedDays: 7
        },
        {
            title: "Interview Coach",
            description: "AI-guided training sessions for embassy or consulate interviews.",
            estimatedDays: 14
        },
        {
            title: "Lawyer Review",
            description: "Final case verification and authorization by immigration counsel.",
            estimatedDays: 3
        },
        {
            title: "Submission",
            description: "Official submission to immigration authorities.",
            estimatedDays: 1
        }
    ];

    return journeyStages;
}

/**
 * Create default roadmap items for an application
 */
export async function createDefaultRoadmap(applicationId: string, visaType: string): Promise<void> {
    try {
        const stages = getDefaultRoadmapStages(visaType);

        const itemsToCreate = stages.map((stage, idx) => ({
            applicationId,
            title: stage.title,
            description: stage.description,
            status: idx === 0 ? "current" : "pending",
            order: idx,
            estimatedDays: stage.estimatedDays,
        }));

        await db.insert(roadmapItems).values(itemsToCreate);
        logger.info({ applicationId, visaType, stageCount: stages.length }, "Created default roadmap");
    } catch (error) {
        logger.error({ error, applicationId }, "Failed to create default roadmap");
    }
}

/**
 * Get default document checklist items for a visa type
 */
export function getDefaultChecklistItems(visaType: string): Array<{
    name: string;
    category: string;
    isRequired: boolean;
    description: string;
    templateUrl?: string;
}> {
    const baseItems: Array<{ name: string; category: string; isRequired: boolean; description: string; templateUrl?: string }> = [
        { name: "Passport", category: "Identity", isRequired: true, description: "Valid passport with at least 6 months validity" },
        { name: "Passport Photos", category: "Identity", isRequired: true, description: "Recent passport-sized color photographs" },
        { name: "Bank Statements", category: "Financial", isRequired: true, description: "Last 3-6 months of bank statements showing sufficient funds" },
    ];

    const visaItems: Record<string, typeof baseItems> = {
        "Skilled Worker": [
            ...baseItems,
            { name: "Certificate of Sponsorship", category: "Employment", isRequired: true, description: "Valid CoS from your employer" },
            { name: "Job Offer Letter", category: "Employment", isRequired: true, description: "Signed employment contract or offer" },
            { name: "Degree Certificate", category: "Qualifications", isRequired: true, description: "Original degree or diploma certificate" },
            { name: "English Proficiency Result", category: "Language", isRequired: true, description: "IELTS/UKVI or equivalent result" },
            { name: "TB Test Certificate", category: "Health", isRequired: true, description: "Required for certain countries" },
        ],
        "Student": [
            ...baseItems,
            { name: "CAS Letter", category: "Academic", isRequired: true, description: "Confirmation of Acceptance for Studies" },
            { name: "Academic Transcripts", category: "Academic", isRequired: true, description: "Transcripts from previous institutions" },
            { name: "University Admission Letter", category: "Academic", isRequired: true, description: "Official letter of admission" },
            { name: "English Proficiency Result", category: "Language", isRequired: true, description: "IELTS/UKVI or equivalent result" },
            { name: "TB Test Certificate", category: "Health", isRequired: true, description: "Required for certain countries" },
            { name: "ATAS Certificate", category: "Academic", isRequired: false, description: "Academic Technology Approval Scheme certificate if required for your course" },
        ],
        "Tourist": [
            ...baseItems,
            { name: "Travel Itinerary", category: "Travel", isRequired: true, description: "Flight bookings and travel schedule", templateUrl: "/templates/itinerary_template.docx" },
            { name: "Hotel Bookings", category: "Travel", isRequired: true, description: "Proof of accommodation" },
            { name: "Travel Insurance", category: "Travel", isRequired: true, description: "Proof of medical/travel insurance" },
            { name: "Letter of Invitation", category: "Travel", isRequired: false, description: "If staying with a host", templateUrl: "/templates/invitation_letter.docx" },
            { name: "Proof of Ties to Home Country", category: "Employment", isRequired: true, description: "Employment letter, property documents, etc.", templateUrl: "/templates/employment_letter.docx" },
            { name: "Cover Letter", category: "Identity", isRequired: false, description: "Explaining the purpose of your visit", templateUrl: "/templates/cover_letter.docx" },
        ],
        "Family": [
            ...baseItems,
            { name: "Marriage/Birth Certificate", category: "Relationship", isRequired: true, description: "Proof of relationship to sponsor" },
            { name: "Sponsor's ID", category: "Sponsor", isRequired: true, description: "Passport or ID of your sponsor" },
            { name: "Proof of Accommodation", category: "Sponsor", isRequired: true, description: "Tenancy agreement or Land Registry doc" },
            { name: "Sponsor's Bank Statements", category: "Financial", isRequired: true, description: "Proof of sponsor's financial support" },
            { name: "Support Letter", category: "Relationship", isRequired: true, description: "Letter from sponsor supporting your application", templateUrl: "/templates/support_letter.docx" },
        ]
    };

    return visaItems[visaType] || [...baseItems, { name: "Supporting Documents", category: "Other", isRequired: false, description: "Any other documents that support your application" }];
}

/**
 * Create default checklist items for an application
 */
export async function createDefaultChecklist(applicationId: string, visaType: string): Promise<void> {
    try {
        const { checklistItems: checklistTable } = await import("@shared/schema");
        const items = getDefaultChecklistItems(visaType);

        const itemsToCreate = items.map((item, idx) => ({
            applicationId,
            name: item.name,
            category: item.category,
            isRequired: item.isRequired,
            description: item.description,
            order: idx,
            isCompleted: false,
            notes: item.templateUrl ? `Template available: ${item.templateUrl}` : undefined,
        }));

        await db.insert(checklistTable).values(itemsToCreate);
        logger.info({ applicationId, visaType, itemCount: items.length }, "Created default checklist items");
    } catch (error) {
        logger.error({ error, applicationId }, "Failed to create default checklist items");
    }
}
