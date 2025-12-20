import { Router } from "express";
import { db } from "../db";
import { tasks, insertTaskSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validate";

const router = Router();

router.use(authenticate);
router.use(requireRole("lawyer", "admin"));

// Get all tasks for the lawyer
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const allTasks = await db.query.tasks.findMany({
            where: eq(tasks.lawyerId, lawyerId),
            orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
        });
        res.json(allTasks);
    })
);

// Create a new task
router.post(
    "/",
    validateBody(insertTaskSchema),
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const [task] = await db
            .insert(tasks)
            .values({
                ...req.body,
                lawyerId,
            })
            .returning();
        res.status(201).json(task);
    })
);

// Update a task
router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

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
    })
);

// Delete a task
router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
        const lawyerId = req.user!.userId;
        const { id } = req.params;

        const [deletedTask] = await db
            .delete(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.lawyerId, lawyerId)))
            .returning();

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.json({ message: "Task deleted successfully" });
    })
);

export default router;
