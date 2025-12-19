import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { users, referrals } from "@shared/schema";
import { eq, count, sum } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// Helper to generate code
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Get or Create Referral Code
router.get(
    "/code",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        try {
            // Check if user already has a code
            const user = await db.query.users.findFirst({
                where: eq(users.id, userId),
            });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.referralCode) {
                return res.json({ code: user.referralCode });
            }

            // Generate new unique code
            let code = generateCode();
            let isUnique = false;

            // Retry logic (simple)
            for (let i = 0; i < 5; i++) {
                const existing = await db.query.users.findFirst({
                    where: eq(users.referralCode, code)
                });
                if (!existing) {
                    isUnique = true;
                    break;
                }
                code = generateCode();
            }

            if (!isUnique) {
                logger.error({ userId }, "Failed to generate unique referral code");
                return res.status(500).json({
                    message: "Failed to generate referral code. Please try again later."
                });
            }

            await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));

            res.json({ code });
        } catch (err: any) {
            logger.error({ err: err.message, stack: err.stack, userId }, "Referral code endpoint error");

            // Check if it's a database column error
            if (err.message?.includes('referralCode') || err.message?.includes('referral_code') || err.message?.includes('column')) {
                return res.status(503).json({
                    message: "Referral system is currently being set up. Please check back soon.",
                    error: "FEATURE_UNAVAILABLE"
                });
            }

            return res.status(500).json({
                message: "Failed to load referral data. Please try again later."
            });
        }
    })
);

// Get Referral Stats
router.get(
    "/stats",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;

        const referralCount = await db
            .select({ count: count() })
            .from(referrals)
            .where(eq(referrals.referrerId, userId));

        const earnings = await db
            .select({ total: sum(referrals.rewardAmount) })
            .from(referrals)
            .where(eq(referrals.referrerId, userId));

        res.json({
            invites: referralCount[0]?.count || 0,
            earnings: earnings[0]?.total || 0,
            currency: "USD"
        });
    })
);

// Validate Code (Public)
router.post(
    "/validate",
    asyncHandler(async (req, res) => {
        const { code } = z.object({ code: z.string().min(3).max(20) }).parse(req.body);

        const referrer = await db.query.users.findFirst({
            where: eq(users.referralCode, code.toUpperCase())
        });

        if (!referrer) {
            return res.status(404).json({ valid: false, message: "Invalid code" });
        }

        res.json({ valid: true, referrerName: referrer.firstName });
    })
);

export default router;
