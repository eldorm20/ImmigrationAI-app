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
