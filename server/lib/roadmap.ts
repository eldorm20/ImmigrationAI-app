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
};

export async function updateRoadmapProgress(applicationId: string): Promise<boolean> {
    try {
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

        let hasUpdates = false;

        // 1. Update status based on documents
        for (const item of items) {
            if (item.status === "completed") continue;

            const lowerTitle = item.title.toLowerCase();
            let isCompleted = false;

            // Check keywords
            for (const [key, variants] of Object.entries(DOC_KEYWORDS)) {
                if (variants.some(v => lowerTitle.includes(v))) {
                    // Check if corresponding document exists
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
            // Re-fetch to be safe or rely on local modifications if careful
            items = await db.query.roadmapItems.findMany({
                where: eq(roadmapItems.applicationId, applicationId),
                orderBy: (items, { asc }) => asc(items.order),
            });
        }

        // Find first non-completed
        const firstPendingIndex = items.findIndex(i => i.status !== "completed");

        if (firstPendingIndex !== -1) {
            const currentItem = items[firstPendingIndex];
            // If it's pending, mark it as current
            if (currentItem.status === "pending") {
                await db.update(roadmapItems)
                    .set({ status: "current" })
                    .where(eq(roadmapItems.id, currentItem.id));
                hasUpdates = true;
            }

            // Ensure subsequent items are pending (if they were somehow current?)
            for (let i = firstPendingIndex + 1; i < items.length; i++) {
                if (items[i].status === "current") {
                    await db.update(roadmapItems)
                        .set({ status: "pending" })
                        .where(eq(roadmapItems.id, items[i].id));
                    hasUpdates = true;
                }
            }
        } else {
            // All completed?
            // Optionally mark application as 'pending_review' or similar
        }

        return hasUpdates;
    } catch (error) {
        logger.error({ error, applicationId }, "Failed to update roadmap progress");
        return false;
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
    // Common base stages for all visa types
    const baseStages = [
        {
            title: "Initial Assessment",
            description: "Complete eligibility quiz and get AI assessment of your application chances",
            estimatedDays: 1
        },
        {
            title: "Identity Documents",
            description: "Upload passport copy and passport-sized photos",
            estimatedDays: 2
        },
        {
            title: "Financial Documents",
            description: "Bank statements, proof of funds, and financial evidence",
            estimatedDays: 5
        },
    ];

    // Visa-specific stages
    const visaSpecificStages: Record<string, Array<{ title: string; description: string; estimatedDays?: number }>> = {
        "Skilled Worker": [
            ...baseStages,
            { title: "Employment Evidence", description: "Job offer letter, Certificate of Sponsorship (CoS), employment contracts", estimatedDays: 7 },
            { title: "Qualification Documents", description: "Degrees, certificates, professional qualifications", estimatedDays: 5 },
            { title: "English Language Test", description: "IELTS, TOEFL, or equivalent test results", estimatedDays: 14 },
            { title: "TB Test Certificate", description: "Tuberculosis test from approved clinic", estimatedDays: 7 },
            { title: "Application Review", description: "Lawyer reviews complete application", estimatedDays: 3 },
            { title: "Submission", description: "Application submitted to immigration authority", estimatedDays: 1 },
            { title: "Biometrics Appointment", description: "Attend biometrics enrollment appointment", estimatedDays: 14 },
            { title: "Decision", description: "Await and receive visa decision", estimatedDays: 56 },
        ],
        "Student": [
            ...baseStages,
            { title: "CAS Letter", description: "Confirmation of Acceptance for Studies from university", estimatedDays: 14 },
            { title: "Academic Documents", description: "Transcripts, diplomas, admission letter", estimatedDays: 5 },
            { title: "English Language Test", description: "IELTS, TOEFL, or equivalent test results", estimatedDays: 14 },
            { title: "TB Test Certificate", description: "Tuberculosis test from approved clinic", estimatedDays: 7 },
            { title: "Application Review", description: "Final review of complete application", estimatedDays: 3 },
            { title: "Submission", description: "Application submitted to immigration authority", estimatedDays: 1 },
            { title: "Biometrics Appointment", description: "Attend biometrics enrollment appointment", estimatedDays: 14 },
            { title: "Decision", description: "Await and receive visa decision", estimatedDays: 21 },
        ],
        "Family": [
            ...baseStages,
            { title: "Relationship Evidence", description: "Marriage certificate, photos, communication history", estimatedDays: 7 },
            { title: "Sponsor Documents", description: "Sponsor's financial evidence and accommodation proof", estimatedDays: 7 },
            { title: "English Language Test", description: "A1 minimum CEFR level test results", estimatedDays: 14 },
            { title: "TB Test Certificate", description: "Tuberculosis test from approved clinic", estimatedDays: 7 },
            { title: "Application Review", description: "Lawyer reviews complete application", estimatedDays: 5 },
            { title: "Submission", description: "Application submitted to immigration authority", estimatedDays: 1 },
            { title: "Biometrics Appointment", description: "Attend biometrics enrollment appointment", estimatedDays: 14 },
            { title: "Decision", description: "Await and receive visa decision", estimatedDays: 84 },
        ],
        "Tourist": [
            ...baseStages,
            { title: "Travel Itinerary", description: "Flight bookings and travel plan", estimatedDays: 3 },
            { title: "Accommodation Proof", description: "Hotel bookings or host invitation", estimatedDays: 3 },
            { title: "Travel Insurance", description: "Valid travel insurance coverage", estimatedDays: 2 },
            { title: "Employment/Ties Evidence", description: "Proof of ties to home country", estimatedDays: 5 },
            { title: "Submission", description: "Application submitted", estimatedDays: 1 },
            { title: "Decision", description: "Await and receive visa decision", estimatedDays: 15 },
        ],
    };

    // Return visa-specific stages or default general stages
    return visaSpecificStages[visaType] || [
        ...baseStages,
        { title: "Supporting Documents", description: "Additional documents as required for your visa type", estimatedDays: 7 },
        { title: "Application Review", description: "Final review of complete application", estimatedDays: 3 },
        { title: "Submission", description: "Application submitted to immigration authority", estimatedDays: 1 },
        { title: "Decision", description: "Await and receive visa decision", estimatedDays: 30 },
    ];
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
