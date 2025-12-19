import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { tasks, documentTemplates, applications, users } from "@shared/schema";
import { eq, and, desc, asc, like } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";

const router = Router();

router.use(authenticate);

// === TASKS MANAGEMENT ===

// Get tasks
router.get(
    "/tasks",
    asyncHandler(async (req, res) => {
        const user = req.user!;

        // Filters
        const status = req.query.status as string; // 'todo', 'in_progress', 'review', 'done', 'all'
        const priority = req.query.priority as string;
        const applicationId = req.query.applicationId as string;

        let conditions = [];

        // Lawyers see their tasks, users might not have tasks yet but theoretically could
        // For now assume lawyer tool
        if (user.role === "lawyer") {
            conditions.push(eq(tasks.lawyerId, user.userId));
        } else {
            // Clients might see tasks assigned to them? Or tasks related to their app?
            // For now, restrict to lawyers
            throw new AppError(403, "Access denied");
        }

        if (status && status !== "all") conditions.push(eq(tasks.status, status));
        if (priority) conditions.push(eq(tasks.priority, priority));
        if (applicationId) conditions.push(eq(tasks.applicationId, applicationId));

        const results = await db.query.tasks.findMany({
            where: and(...conditions),
            orderBy: [desc(tasks.priority), asc(tasks.dueDate)],
        });

        res.json(results);
    })
);

// Create Task
const createTaskSchema = z.object({
    title: z.string().min(1, "Title required"),
    description: z.string().optional(),
    clientId: z.string().optional(),
    applicationId: z.string().optional(),
    status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    dueDate: z.string().optional(),
    assignedTo: z.string().optional(),
});

router.post(
    "/tasks",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can create tasks");

        const body = createTaskSchema.parse(req.body);

        const [task] = await db.insert(tasks).values({
            lawyerId: user.userId,
            clientId: body.clientId,
            applicationId: body.applicationId,
            title: body.title,
            description: body.description,
            status: body.status,
            priority: body.priority,
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            assignedTo: body.assignedTo,
        }).returning();

        res.status(201).json(task);
    })
);

// Update Task
const updateTaskSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z.string().optional(),
});

router.patch(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        const { id } = req.params;
        const body = updateTaskSchema.parse(req.body);

        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, id),
        });

        if (!task) throw new AppError(404, "Task not found");
        if (task.lawyerId !== user.userId) throw new AppError(403, "Access denied");

        const updates: any = { ...body };
        if (body.dueDate) updates.dueDate = new Date(body.dueDate);
        if (body.status === "done" && task.status !== "done") {
            updates.completedAt = new Date();
        }

        const [updated] = await db.update(tasks)
            .set(updates)
            .where(eq(tasks.id, id))
            .returning();

        res.json(updated);
    })
);

// Delete Task
router.delete(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        const { id } = req.params;

        const task = await db.query.tasks.findFirst({
            where: eq(tasks.id, id),
        });

        if (!task) throw new AppError(404, "Task not found");
        if (task.lawyerId !== user.userId) throw new AppError(403, "Access denied");

        await db.delete(tasks).where(eq(tasks.id, id));

        res.status(204).send();
    })
);

// === DOCUMENT TEMPLATES ===

// Get templates
router.get(
    "/templates",
    asyncHandler(async (req, res) => {
        const user = req.user!;

        // Filters
        const category = req.query.category as string;
        const search = req.query.search as string;

        let conditions = [
            user.role === "lawyer"
                ? eq(documentTemplates.lawyerId, user.userId) // Lawyers see their own
                : eq(documentTemplates.isSystem, true)        // Others might see system templates? 
        ];

        // For now let's say lawyers can also see system templates
        if (user.role === "lawyer") {
            // Logic: lawyerId = me OR isSystem = true
            // But Drizzle OR doesn't work easily with `and` array spread if mixing OR.
            // Let's just fetch lawyer's templates for now.
        }

        if (category) conditions.push(eq(documentTemplates.category, category));
        if (search) conditions.push(like(documentTemplates.title, `%${search}%`));

        const results = await db.query.documentTemplates.findMany({
            where: and(...conditions),
            orderBy: desc(documentTemplates.createdAt),
        });

        res.json(results);
    })
);

// Create Template
router.post(
    "/templates",
    asyncHandler(async (req, res) => {
        const user = req.user!;
        if (user.role !== "lawyer") throw new AppError(403, "Only lawyers can create templates");

        const body = z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            category: z.string().optional(),
            description: z.string().optional(),
        }).parse(req.body);

        const [template] = await db.insert(documentTemplates).values({
            lawyerId: user.userId,
            title: body.title,
            content: body.content,
            category: body.category,
            description: body.description,
            isSystem: false,
        }).returning();

        res.status(201).json(template);
    })
);

export default router;
