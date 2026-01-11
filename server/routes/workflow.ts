import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { workflowService } from "../lib/workflow";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

// POST /api/workflow/create - Create workflow
router.post(
    "/create",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { documentId, type } = z.object({
            documentId: z.string(),
            type: z.enum(["review", "signature"])
        }).parse(req.body);

        const workflowId = await workflowService.createWorkflow(documentId, userId, type);
        res.json({ success: true, workflowId });
    })
);

// POST /api/workflow/:id/approve - Approve step
router.post(
    "/:id/approve",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const workflowId = req.params.id;
        const { comments } = req.body;

        const success = await workflowService.approveStep(workflowId, userId, comments);
        res.json({ success });
    })
);

// POST /api/workflow/:id/reject - Reject step
router.post(
    "/:id/reject",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const workflowId = req.params.id;
        const { comments } = z.object({ comments: z.string() }).parse(req.body);

        const success = await workflowService.rejectStep(workflowId, userId, comments);
        res.json({ success });
    })
);

// GET /api/workflow/:id - Get status
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const workflowId = req.params.id;
        const workflow = await workflowService.getWorkflowStatus(workflowId);

        if (!workflow) {
            return res.status(404).json({ message: "Workflow not found" });
        }

        res.json(workflow);
    })
);

export default router;
