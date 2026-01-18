import { Router } from "express";
import { db } from "../db";
import {
    communityPosts,
    communityComments,
    insertCommunityPostSchema,
    insertCommunityCommentSchema,
    users
} from "@shared/schema";
import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError, ErrorCode } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

// Get all posts (with filtering)
router.get(
    "/posts",
    asyncHandler(async (req, res) => {
        const { category, search } = req.query;

        const whereClause = [];

        // Filter by status (always published unless admin)
        whereClause.push(eq(communityPosts.status, "published"));

        if (category && category !== "all") {
            whereClause.push(eq(communityPosts.category, category as string));
        }

        if (search) {
            whereClause.push(ilike(communityPosts.title, `%${search}%`));
        }

        const results = await db.query.communityPosts.findMany({
            where: whereClause.length > 0 ? and(...whereClause) : undefined,
            orderBy: [desc(communityPosts.createdAt)],
            with: {
                // We'll need user details for the author
                // Assuming 'users' relation is not explicitly defined in schema helper but we can query it separately 
                // or rely on frontend to fetch user info if needed. 
                // Better to join if possible.
                // Let's rely on standard query for now.
            },
            limit: 50
        });

        // Enrich with user names manually if relation isn't auto-mapped by Drizzle ORM helpers yet
        // A optimized way is to gather userIds and fetch them in one go
        const userIds = Array.from(new Set(results.map(p => p.userId))) as string[];
        const usersData = await db.query.users.findMany({
            where: (users, { inArray }) => inArray(users.id, userIds),
            columns: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                role: true
            }
        });

        const userMap = new Map(usersData.map(u => [u.id, u]));

        const enrichedResults = results.map(post => ({
            ...post,
            author: userMap.get(post.userId) || { firstName: "Unknown", lastName: "User" }
        }));

        res.json(enrichedResults);
    })
);

// Create a post
router.post(
    "/posts",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        let data;
        try {
            data = insertCommunityPostSchema.omit({ userId: true, status: true, images: true }).parse(req.body);
        } catch (error: any) {
            logger.error({ error: error.issues, body: req.body }, "Community Post Validation Failed");
            return res.status(400).json({ message: "Validation error", details: error.issues });
        }

        const [post] = await db
            .insert(communityPosts)
            .values({
                ...data,
                userId,
                status: "published" // Auto-publish for now
            })
            .returning();

        res.status(201).json(post);
    })
);

// Get single post details (with comments)
router.get(
    "/posts/:id",
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, id)
        });

        if (!post) {
            throw new AppError(404, "Post not found", ErrorCode.NOT_FOUND);
        }

        // Fetch author
        const author = await db.query.users.findFirst({
            where: eq(users.id, post.userId),
            columns: { id: true, firstName: true, lastName: true, avatar: true, role: true }
        });

        // Fetch comments
        const comments = await db.query.communityComments.findMany({
            where: eq(communityComments.postId, id),
            orderBy: (comments, { asc }) => [asc(comments.createdAt)],
        });

        // Enrich comments with authors
        const commentUserIds = Array.from(new Set(comments.map((c: any) => c.userId)));
        let commentAuthors: any[] = [];
        if (commentUserIds.length > 0) {
            commentAuthors = await db.query.users.findMany({
                where: (users, { inArray }) => inArray(users.id, commentUserIds as string[]),
                columns: { id: true, firstName: true, lastName: true, avatar: true }
            });
        }
        const commentAuthorMap = new Map(commentAuthors.map(u => [u.id, u]));

        const enrichedComments = comments.map(c => ({
            ...c,
            author: commentAuthorMap.get(c.userId) || { firstName: "Unknown", lastName: "User" }
        }));

        // Increment view count (fire and forget)
        db.update(communityPosts)
            .set({ views: sql`${communityPosts.views} + 1` })
            .where(eq(communityPosts.id, id))
            .execute()
            .catch(err => logger.warn({ err }, "Failed to update view count"));

        res.json({
            ...post,
            author,
            comments: enrichedComments
        });
    })
);

// Add a comment
router.post(
    "/posts/:id/comments",
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const data = insertCommunityCommentSchema.pick({ content: true, parentId: true }).parse(req.body);

        // Verify post exists
        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, id)
        });
        if (!post) throw new AppError(404, "Post not found");

        const [comment] = await db
            .insert(communityComments)
            .values({
                ...data,
                postId: id,
                userId
            })
            .returning();

        // Return comment with author info
        const author = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, firstName: true, lastName: true, avatar: true }
        });

        res.status(201).json({
            ...comment,
            author
        });
    })
);

// Like a post
router.post(
    "/posts/:id/like",
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        // Simple increment for MVP (not tracking unique user likes to prevent spam yet)
        const [updated] = await db.update(communityPosts)
            .set({ likes: sql`${communityPosts.likes} + 1` })
            .where(eq(communityPosts.id, id))
            .returning();

        res.json(updated);
    })
);

// Delete a post
router.delete(
    "/posts/:id",
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const post = await db.query.communityPosts.findFirst({
            where: eq(communityPosts.id, id)
        });

        if (!post) throw new AppError(404, "Post not found");

        if (post.userId !== userId && userRole !== "admin") {
            throw new AppError(403, "Not authorized to delete this post");
        }

        await db.delete(communityPosts).where(eq(communityPosts.id, id));

        res.json({ message: "Post deleted" });
    })
);

export default router;
