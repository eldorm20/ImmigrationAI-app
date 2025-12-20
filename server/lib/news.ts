import { db } from "../db";
import { researchArticles } from "@shared/schema";
import { logger } from "./logger";
import { agentsManager } from "./ai";

interface RawNewsItem {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    source: string;
}

/**
 * Fetches and processes immigration-related news
 */
export async function refreshImmigrationNews(): Promise<{ count: number }> {
    try {
        logger.info("Starting immigration news refresh");

        // Mock/Sample news sources (In a real app, use a News API or RSS feed)
        // For this implementation, we simulate fetching from a few reputable sources
        const rawNews: RawNewsItem[] = [
            {
                title: "UK Government Announces New Skilled Worker Salary Thresholds",
                link: "https://www.gov.uk/government/news/new-skilled-worker-salary-thresholds",
                pubDate: new Date().toISOString(),
                description: "The UK government has detailed the new salary requirements for the Skilled Worker visa route, effective from April.",
                source: "UK Home Office"
            },
            {
                title: "Germany Launches New 'Chancenkarte' (Opportunity Card) for Job Seekers",
                link: "https://www.make-it-in-germany.com/en/visa-residence/types/chancenkarte",
                pubDate: new Date().toISOString(),
                description: "Germany is introducing a points-based system for non-EU citizens to enter the country to search for work.",
                source: "Federal Republic of Germany"
            },
            {
                title: "Upcoming Changes to UK Student Visa Dependent Rules",
                link: "https://www.gov.uk/government/publications/student-visa-changes",
                pubDate: new Date().toISOString(),
                description: "Strict new measures for student visa dependents have been announced to reduce net migration numbers.",
                source: "BBC News"
            }
        ];

        let count = 0;
        for (const item of rawNews) {
            try {
                // Use AI to generate a professional summary and extract tags
                const prompt = `Analyze this immigration news item:
        Title: ${item.title}
        Description: ${item.description}
        Source: ${item.source}
        
        Tasks:
        1. Write a 2-sentence professional summary for an immigration law library.
        2. Assign a category (MUST be one of: visa, cases, regulations, guides, other).
        3. Assign a type (MUST be one of: guide, case_study, regulation, faq, blog, masterclass).
        4. List 3 key tags (e.g., UK, Germany, Student).
        5. Create a URL-friendly slug.
        
        Return JSON only: { "summary": "", "category": "visa", "type": "blog", "tags": [], "slug": "" }`;

                const aiResponse = await agentsManager.processRequest(
                    "immigration-law",
                    "analyzeNews",
                    [prompt]
                );

                let data: any = {
                    summary: item.description,
                    category: "visa",
                    type: "blog",
                    tags: ["Immigration"],
                    slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
                };

                if (aiResponse.success && aiResponse.data) {
                    try {
                        const parsed = typeof aiResponse.data === 'string'
                            ? JSON.parse(aiResponse.data.replace(/```json\n?/, "").replace(/```\s*$/, ""))
                            : aiResponse.data;

                        // Map common AI misinterpretations to valid enums
                        if (parsed.category === "news") parsed.category = "visa";
                        if (!["visa", "cases", "regulations", "guides", "other"].includes(parsed.category)) {
                            parsed.category = "visa";
                        }
                        if (!["guide", "case_study", "regulation", "faq", "blog", "masterclass"].includes(parsed.type)) {
                            parsed.type = "blog";
                        }

                        data = { ...data, ...parsed };
                    } catch (e) {
                        logger.warn({ e }, "Failed to parse AI news analysis, using defaults");
                    }
                }

                // Insert into database (ignoring duplicates based on slug)
                await db.insert(researchArticles).values({
                    title: item.title,
                    summary: data.summary,
                    body: `Source Item: ${item.title}\n\n${item.description}\n\nFull article available at: ${item.link}`,
                    category: data.category,
                    type: data.type,
                    tags: data.tags,
                    slug: data.slug,
                    source: item.source,
                    sourceUrl: item.link,
                    isPublished: true,
                    publishedAt: new Date(item.pubDate),
                    createdByUserId: null, // Change to null or use a valid system user UUID
                }).onConflictDoNothing({ target: researchArticles.slug });

                count++;
            } catch (err) {
                logger.error({ err, item: item.title }, "Failed to process news item");
            }
        }

        logger.info({ count }, "Immigration news refresh completed");
        return { count };
    } catch (error) {
        logger.error({ error }, "Failed to refresh immigration news");
        throw error;
    }
}
