import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { researchArticles, type ResearchArticle, insertResearchArticleSchema } from "@shared/schema";
import { and, or, desc, ilike, sql } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sanitizeInput } from "../middleware/security";
import { refreshImmigrationNews, getFallbackResearchItems } from "../lib/news";
import { RagClient } from "../lib/rag-client";
import { logger } from "../lib/logger";

const router = Router();

// Public list endpoint (no auth required)
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

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search = "",
      category = "all",
      language = "",
      limit = "50",
      offset = "0",
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

    let articles: any[] = [];
    try {
      articles = await db.query.researchArticles.findMany({
        where: whereClauses.length ? and(...(whereClauses as any)) : undefined,
        orderBy: [desc(researchArticles.publishedAt), desc(researchArticles.createdAt)],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Failed to fetch research articles from DB, using fallback");
      articles = []; // Fallback will handle this
    }

    // RAG Integration: If search query is provided, augment results from authoritative RAG service
    let items = [...articles];
    if (search && articles.length < 5) {
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

    // If no articles found in DB OR RAG, return filtered fallback data from the mock set
    if (items.length === 0) {
      console.log(`[Research] DB empty, serving fallback data for: cat=${category} search=${search}`);
      let fallback = getFallbackResearchItems();

      // 1. Filter by Category
      if (category && category !== "all") {
        fallback = fallback.filter(item => item.category === category);
      }

      // 2. Filter by Search
      if (search) {
        const term = search.toLowerCase();
        fallback = fallback.filter(item =>
          item.title.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          item.tags.some((t: string) => t.toLowerCase().includes(term))
        );
      }

      return res.json({ items: fallback });
    }

    res.json({ items });
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

    res.json({ message: "Article deleted" });
  }),
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








