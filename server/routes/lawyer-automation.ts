/**
 * Lawyer Automation Routes
 */

import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { LawyerAutomationService } from "../lib/lawyer-automation";

const router = Router();

// Require lawyer or admin role for these automations
router.use(authenticate, requireRole("lawyer", "admin"));

/**
 * POST /lawyer/brief/:applicationId
 * Generates an AI case brief for an application
 */
router.post(
    "/brief/:applicationId",
    asyncHandler(async (req, res) => {
        const { applicationId } = req.params;
        const brief = await LawyerAutomationService.generateCaseBrief(applicationId);
        res.json({ brief });
    })
);

/**
 * POST /lawyer/compliance/:packId
 * Scans a document pack for compliance using RAG
 */
router.post(
    "/compliance/:packId",
    asyncHandler(async (req, res) => {
        const { packId } = req.params;
        const analysis = await LawyerAutomationService.scanPackCompliance(packId);
        res.json(analysis);
    })
);

/**
 * GET /lawyer/policy-updates
 * Fetches latest policy updates from RAG
 */
router.get(
    "/policy-updates",
    asyncHandler(async (req, res) => {
        const updates = await LawyerAutomationService.getPolicyUpdatesForLawyer(req.user!.userId);
        res.json({ updates });
    })
);

export default router;
