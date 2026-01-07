import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { db } from "../db";
import { auditLogs, users } from "@shared/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";

const router = Router();

router.use(authenticate);

// Middleware: Admin only
const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== "admin") {
        return next(new AppError(403, "Admin access required"));
    }
    next();
};

router.use(requireAdmin);

// Get Audit Logs (Paginated, Filtered)
router.get(
    "/",
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 50, action, userId, resourceType } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const conditions = [];
        if (action) conditions.push(ilike(auditLogs.action, `%${action}%`));
        if (userId) conditions.push(eq(auditLogs.userId, String(userId)));
        if (resourceType) conditions.push(eq(auditLogs.resourceType, String(resourceType)));

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const logs = await db.query.auditLogs.findMany({
            where: whereClause,
            limit: Number(limit),
            offset: offset,
            orderBy: [desc(auditLogs.timestamp)],
            with: {
                // We can't easily join in drizzle query builder if relations aren't set up perfectly,
                // but let's assume raw data is okay or fetch users separately if needed.
                // For now, let's just return raw logs.
            }
        });

        // Get total count for pagination
        const totalRes = await db
            .select({ count: sql<number>`count(*)` })
            .from(auditLogs)
            .where(whereClause);

        const total = Number(totalRes[0]?.count || 0);

        // Fetch user details manually for the logs if needed (optimization: only fetch unique UserIDs)
        // Or just let frontend resolve user IDs if we want simple implementation.
        // Let's attach user email if possible.

        // Improved: Join manually or simpler, just return logs.
        // Admin dashboard can lookup users.

        res.json({
            data: logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    })
);

// Get specific log details
router.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const log = await db.query.auditLogs.findFirst({
            where: eq(auditLogs.id, req.params.id)
        });
        if (!log) throw new AppError(404, "Log not found");
        res.json(log);
    })
);

export default router;
