import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { researchArticles, type ResearchArticle, insertResearchArticleSchema } from "@shared/schema";
import { and, desc, ilike, sql } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { sanitizeInput } from "../middleware/security";
import { rssService, type RSSItem } from "../lib/rss-service";
import { logger } from "../lib/logger";

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
        and(
          ilike(researchArticles.title, term),
          sql`1 = 1`
        ),
      );
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

    // Combine DB and RSS articles, DB articles first
    const allItems = [...dbArticles, ...rssArtricles].slice(0, parseInt(limit, 10));

    // If still empty, return curated fallback
    if (allItems.length === 0 && !search && category === "all") {
      const fallback: ResearchItem[] = [
        {
          id: 'sample-1',
          title: 'UK Skilled Worker Visa — Eligibility Overview',
          summary: 'A concise guide for applicants seeking to apply for the UK Skilled Worker visa, including salary thresholds and required documents.',
          category: 'visa',
          type: 'guide',
          tags: ['UK', 'Skilled Worker', 'Visa'],
          source: 'UK Home Office',
          sourceUrl: 'https://www.gov.uk/skilled-worker-visa'
        },
        {
          id: 'sample-2',
          title: 'Germany Opportunity Card — What You Need to Know',
          summary: "Overview of eligibility and application steps for Germany's Opportunity Card and employment requirements.",
          category: 'visa',
          type: 'guide',
          tags: ['Germany', 'Opportunity Card'],
          source: 'Bundesregierung',
          sourceUrl: 'https://www.bundesregierung.de'
        },
        {
          id: 'sample-3',
          title: 'Case Study: Successful Family Reunification in Poland',
          summary: 'A real-world case study summarizing best practices for family reunification and common pitfalls to avoid.',
          category: 'cases',
          type: 'case_study',
          tags: ['Poland', 'Family'],
          source: 'ImmigrationAI Research'
        }
      ];

      return res.json({ items: fallback });
    }

    res.json({ items: allItems, fromRss: rssItems.length });
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

export default router;








