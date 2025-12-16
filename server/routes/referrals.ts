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

        // Check if user already has a code
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (user?.referralCode) {
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

        if (!isUnique) throw new AppError(500, "Failed to generate unique referral code");

        await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));

        res.json({ code });
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
