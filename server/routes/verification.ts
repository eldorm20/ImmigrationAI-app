import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { verificationChain, documents } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

// Helper: Calculate SHA-256 hash
function calculateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Mint a new verification block
router.post(
    "/mint",
    authenticate,
    asyncHandler(async (req, res) => {
        const { documentId } = req.body;
        if (!documentId) throw new AppError(400, "Document ID required");

        // 1. Get Document
        const doc = await db.query.documents.findFirst({
            where: eq(documents.id, documentId)
        });
        if (!doc) throw new AppError(404, "Document not found");

        // 2. Check if already verified
        const existing = await db.query.verificationChain.findFirst({
            where: eq(verificationChain.documentId, documentId)
        });
        if (existing) {
            return res.json(existing);
        }

        // 3. Get Last Block Hash (Genesis if none)
        const lastBlock = await db.query.verificationChain.findFirst({
            orderBy: [desc(verificationChain.createdAt)]
        });
        const previousHash = lastBlock ? lastBlock.blockHash : "GENESIS_BLOCK_HASH_0000000000000000000000000";

        // 4. Create Block Data
        const fileHash = calculateHash(doc.url + doc.fileName + (doc.fileSize || 0)); // specific logic
        const blockData = `${documentId}:${fileHash}:${previousHash}:${new Date().toISOString()}`;
        const blockHash = calculateHash(blockData);

        // 5. Store
        const newBlock = await db.insert(verificationChain).values({
            documentId,
            fileHash,
            previousHash,
            blockHash,
            metadata: { timestamp: new Date().toISOString() }
        }).returning();

        res.json(newBlock[0]);
    })
);

// Verify a document
router.get(
    "/:documentId",
    asyncHandler(async (req, res) => {
        const { documentId } = req.params;
        const block = await db.query.verificationChain.findFirst({
            where: eq(verificationChain.documentId, documentId)
        });

        if (!block) {
            return res.status(404).json({ verified: false, message: "Not verified on chain" });
        }

        res.json({ verified: true, block });
    })
);

export default router;
