import { Router } from "express";
import { db } from "../db";
import { tasks, insertTaskSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("lawyer", "admin"));

// Get all tasks for the lawyer
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        try {
            const allTasks = await db.query.tasks.findMany({
                where: eq(tasks.lawyerId, lawyerId),
                orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
            });
            res.json(allTasks);
        } catch (error) {
            logger.error({ error, lawyerId }, "Failed to fetch tasks");
            throw error;
        }
    })
);

// Create a new task
router.post(
    "/",
    validateBody(insertTaskSchema),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        try {
            const [task] = await db
                .insert(tasks)
                .values({
                    ...req.body,
                    lawyerId,
                })
                .returning();
            res.status(201).json(task);
        } catch (error) {
            logger.error({ error, lawyerId, body: req.body }, "Failed to create task");
            throw error;
        }
    })
);

// Update a task
router.patch(
    "/:id",
    validateBody(insertTaskSchema.partial()),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        try {
            const [updatedTask] = await db
                .update(tasks)
                .set({
                    ...req.body,
                    updatedAt: new Date(),
                })
                .where(and(eq(tasks.id, id), eq(tasks.lawyerId, lawyerId)))
                .returning();

            if (!updatedTask) {
                return res.status(404).json({ message: "Task not found" });
            }

            res.json(updatedTask);
        } catch (error) {
            logger.error({ error, lawyerId, taskId: id }, "Failed to update task");
            throw error;
        }
    })
);

// Delete a task
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        try {
            const [deletedTask] = await db
                .delete(tasks)
                .where(and(eq(tasks.id, id), eq(tasks.lawyerId, lawyerId)))
                .returning();

            if (!deletedTask) {
                return res.status(404).json({ message: "Task not found" });
            }

            res.json({ message: "Task deleted successfully" });
        } catch (error) {
            logger.error({ error, lawyerId, taskId: id }, "Failed to delete task");
            throw error;
        }
    })
);

export default router;
