import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { researchArticles, type ResearchArticle, insertResearchArticleSchema, articleComments, articleReactions } from "@shared/schema";
import { and, or, desc, ilike, sql } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sanitizeInput } from "../middleware/security";
import { rssService, type RSSItem } from "../lib/rss-service";
import { logger } from "../lib/logger";
import { getCache, setCache, deleteCachePattern } from "../lib/redis";
import { refreshImmigrationNews, getFallbackResearchItems } from "../lib/news";
import { RagClient } from "../lib/rag-client";

const router = Router();

interface ResearchItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  type: string;
  tags: string[];
  source: string;
  sourceUrl?: string;
}

// Public list endpoint (no auth required)


router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search = "",
      category = "all",
      language = "",
      limit = "50",
      offset = "0",
      includeRss = "true",
    } = req.query as Record<string, string>;

    const whereClauses: any[] = [sql`"is_published" = true`];

    if (category && category !== "all") {
      whereClauses.push(sql`category = ${category}`);
    }

    if (language) {
      whereClauses.push(sql`language = ${language}`);
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      whereClauses.push(
        or(
          ilike(researchArticles.title, term),
          ilike(researchArticles.summary, term),
          ilike(researchArticles.body, term)
        )
      );
    }

    const cacheKey = `research:list:${search}:${category}:${language}:${limit}:${offset}:${includeRss}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let dbArticles: any[] = [];
    try {
      dbArticles = await db.query.researchArticles.findMany({
        where: whereClauses.length ? and(...(whereClauses as any)) : undefined,
        orderBy: [desc(researchArticles.publishedAt), desc(researchArticles.createdAt)],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
    } catch (err) {
      logger.warn({ err }, "Failed to fetch articles from DB");
    }

    // Combine with RSS feeds for live content
    let rssItems: RSSItem[] = [];
    if (includeRss === "true" && (!search || search.length < 2)) {
      try {
        rssItems = await rssService.fetchFeeds();
        logger.info({ count: rssItems.length }, "Fetched RSS feed items");
      } catch (err) {
        logger.warn({ err }, "Failed to fetch RSS feeds");
      }
    }

    // Convert RSS items to research format and filter by category if needed
    let rssArtricles: ResearchItem[] = rssItems.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      category: item.category,
      type: item.type,
      tags: item.tags,
      source: item.source,
      sourceUrl: item.sourceUrl,
    }));

    if (category && category !== "all") {
      rssArtricles = rssArtricles.filter(a => a.category === category);
    }

    // RAG Integration: If search query is provided and we have few results, augment with RAG
    let items = [...dbArticles, ...rssArtricles];
    if (search && items.length < 5) {
      try {
        const jurisdiction = (req.query.jurisdiction as string) || "UK";
        const ragResults = await RagClient.search(search, jurisdiction);
        const ragItems = ragResults.map(r => ({
          id: `rag-${Math.random().toString(36).substr(2, 9)}`,
          title: r.metadata.title || "Official Guidance",
          summary: r.content.substring(0, 300) + "...",
          category: "official",
          type: "guide",
          tags: [r.metadata.jurisdiction],
          source: "Authoritative RAG",
          sourceUrl: r.metadata.url,
          publishedAt: new Date(r.metadata.last_verified)
        }));

        // Merge results, avoiding duplicates by title
        const seenTitles = new Set(items.map(i => i.title.toLowerCase()));
        for (const r of ragItems) {
          if (!seenTitles.has(r.title.toLowerCase())) {
            items.push(r as any);
          }
        }
      } catch (err) {
        logger.warn({ err }, "RAG search failed in research library");
      }
    }

    // Limit final set
    const finalItems = items.slice(0, parseInt(limit, 10));

    // If still empty, return fallback
    if (finalItems.length === 0 && !search && category === "all") {
      const fallback = getFallbackResearchItems();
      return res.json({ items: fallback, fromRss: 0 });
    }

    const response = { items: finalItems, fromRss: rssItems.length };
    await setCache(cacheKey, response, 300); // Cache for 5 minutes
    res.json(response);
  }),
);


// Authenticated create/update/delete endpoints
const upsertSchema = insertResearchArticleSchema.extend({
  id: z.string().uuid().optional(),
});

// Create article - any logged-in user can contribute
router.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body);

    const slug = body.slug.toLowerCase();

    const [article] = await db
      .insert(researchArticles)
      .values({
        ...body,
        slug,
        title: sanitizeInput(body.title),
        summary: body.summary ? sanitizeInput(body.summary) : null,
        body: body.body,
        tags: body.tags || [],
        source: body.source ? sanitizeInput(body.source) : null,
        createdByUserId: req.user!.userId,
        publishedAt: new Date(),
      })
      .returning();

    await deleteCachePattern("research:list:*");
    res.status(201).json(article);
  }),
);

// Update article - only creator, lawyer, or admin
router.patch(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = upsertSchema.partial().parse(req.body);

    const existing = await db.query.researchArticles.findFirst({
      where: sql`id = ${id}`,
    });

    if (!existing) {
      throw new AppError(404, "Article not found");
    }

    const isOwner = existing.createdByUserId === req.user!.userId;
    const isElevated = req.user!.role === "admin" || req.user!.role === "lawyer";
    if (!isOwner && !isElevated) {
      throw new AppError(403, "Insufficient permissions");
    }

    const [updated] = await db
      .update(researchArticles)
      .set({
        ...body,
        title: body.title ? sanitizeInput(body.title) : existing.title,
        summary: body.summary ? sanitizeInput(body.summary) : existing.summary,
        slug: body.slug ? body.slug.toLowerCase() : existing.slug,
        source: body.source ? sanitizeInput(body.source) : existing.source,
        updatedByUserId: req.user!.userId,
        updatedAt: new Date(),
      })
      .where(sql`id = ${id}`)
      .returning();

    await deleteCachePattern("research:list:*");
    res.json(updated);
  }),
);

// Delete article - admin only
router.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await db.delete(researchArticles).where(sql`id = ${id}`);
    await deleteCachePattern("research:list:*");

    res.json({ message: "Article deleted" });
  }),
);

// Comments & Reactions logic

// Get comments for an article
router.get(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = "50", offset = "0" } = req.query as Record<string, string>;

    const comments = await db.query.articleComments.findMany({
      where: sql`article_id = ${id}`,
      orderBy: [desc(sql`created_at`)],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      with: {
        // We'd ideally fetch author info, but Drizzle relations might not be fully set up in this file context
        // Rely on client fetching user info or relation if available in schema
      }
    });

    // Manually join user details if not using Drizzle relations or if simple enough
    // For now returning raw comments, assuming frontend can map userIds or we add 'with' if relations exist
    // Let's do a manual join to be safe and helpful
    const userIds = Array.from(new Set(comments.map(c => c.userId)));
    const usersInfo = await db.query.users.findMany({
      where: sql`id IN ${userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']}`,
      columns: { id: true, firstName: true, lastName: true, role: true, avatar: true }
    });

    const userMap = new Map(usersInfo.map(u => [u.id, u]));
    const enriched = comments.map(c => ({
      ...c,
      user: userMap.get(c.userId) || { firstName: 'User', lastName: '', role: 'applicant' }
    }));

    res.json(enriched);
  })
);

// Post a comment
router.post(
  "/:id/comments",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      throw new AppError(400, "Content is required");
    }

    const [comment] = await db
      .insert(articleComments)
      .values({
        articleId: id,
        userId: req.user!.userId,
        content: sanitizeInput(content),
      })
      .returning();

    // Return with user info
    const user = await db.query.users.findFirst({
      where: sql`id = ${req.user!.userId}`,
      columns: { id: true, firstName: true, lastName: true, role: true, avatar: true }
    });

    res.status(201).json({ ...comment, user });
  })
);

// Delete a comment (Owner or Admin)
router.delete(
  "/:id/comments/:commentId",
  authenticate,
  asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await db.query.articleComments.findFirst({
      where: sql`id = ${commentId}`
    });

    if (!comment) throw new AppError(404, "Comment not found");

    if (comment.userId !== req.user!.userId && req.user!.role !== "admin") {
      throw new AppError(403, "Access denied");
    }

    await db.delete(articleComments).where(sql`id = ${commentId}`);
    res.json({ message: "Comment deleted" });
  })
);

// Toggle Reaction (Like/Unlike)
router.post(
  "/:id/reactions",
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type = "like" } = req.body;

    // Check if exists
    const existing = await db.query.articleReactions.findFirst({
      where: and(
        sql`article_id = ${id}`,
        sql`user_id = ${req.user!.userId}`
      )
    });

    if (existing) {
      // If same type, remove (toggle off). If distinct, could update type.
      if (existing.type === type) {
        await db.delete(articleReactions).where(sql`id = ${existing.id}`);
        return res.json({ status: "removed" });
      } else {
        await db.update(articleReactions)
          .set({ type })
          .where(sql`id = ${existing.id}`);
        return res.json({ status: "updated", type });
      }
    }

    await db.insert(articleReactions).values({
      articleId: id,
      userId: req.user!.userId,
      type
    });

    res.json({ status: "added", type });
  })
);

// Get reaction stats
router.get(
  "/:id/reactions",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reactions = await db.query.articleReactions.findMany({
      where: sql`article_id = ${id}`
    });

    const counts = reactions.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.json({ counts, total: reactions.length });
  })
);

// Trigger news refresh - lawyer or admin
router.post(
  "/refresh",
  authenticate,
  requireRole("admin", "lawyer"),
  asyncHandler(async (req, res) => {
    const result = await refreshImmigrationNews();
    res.json({ message: "News library updated", ...result });
  }),
);


export default router;








