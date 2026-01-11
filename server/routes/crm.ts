import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { crmService } from "../lib/crm";
import { emailAutomation } from "../lib/email-automation";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

/**
 * Sync Current User to CRM
 */
router.post(
    "/sync",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        // In a real app we'd fetch the full user object from DB
        // const user = await db.query... 
        const user = { id: userId, email: "user@example.com" }; // Mock

        const crmId = await crmService.syncUser(user);

        if (crmId) {
            res.json({ success: true, crmId });
        } else {
            res.status(500).json({ success: false, message: "Sync failed" });
        }
    })
);

/**
 * Get CRM Status (Pipeline Stage) - Mock
 */
router.get(
    "/status",
    asyncHandler(async (req, res) => {
        // Mock response
        res.json({
            connected: true,
            stage: "Qualified Lead",
            lastInteraction: new Date()
        });
    })
);

/**
 * Subscribe to Newsletter/Updates
 */
router.post(
    "/subscribe",
    asyncHandler(async (req, res) => {
        const { listId } = req.body;
        // Mock
        logger.info({ userId: req.user!.userId, listId }, "Subscribed to list");
        res.json({ success: true });
    })
);

export default router;
