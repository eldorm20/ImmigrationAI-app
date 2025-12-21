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
        // Real data populated by AI Agent - Dec 2025
        const rawNews: RawNewsItem[] = [
            // UK News
            {
                title: "UK Increases Skilled Worker Visa Salary Threshold to £38,700",
                link: "https://www.gov.uk/skilled-worker-visa",
                pubDate: new Date().toISOString(),
                description: "The UK Home Office has implemented a significant increase in the minimum salary threshold for Skilled Worker visas, rising to £38,700 from April 2024. This measure aims to reduce net migration and encourages businesses to invest in the local workforce.",
                source: "UK Home Office"
            },
            {
                title: "Care Worker Visa Route Closed to New Dependents",
                link: "https://www.gov.uk/health-care-worker-visa",
                pubDate: new Date().toISOString(),
                description: "As part of tighter immigration controls, the UK has restricted Care Workers from bringing dependents. This rule applies to new applicants and aims to curb the high numbers of family members accompanying workers on this route.",
                source: "UK Visas & Immigration"
            },
            {
                title: "Immigration Health Surcharge (IHS) Increases to £1,035",
                link: "https://www.gov.uk/healthcare-immigration-application/how-much-pay",
                pubDate: new Date().toISOString(),
                description: "The Immigration Health Surcharge has been raised to £1,035 per year for most visa applicants, a substantial increase intended to better cover the costs of NHS services used by migrants.",
                source: "UK Government"
            },

            // Germany News
            {
                title: "Germany Launches 'Chancenkarte' (Opportunity Card) for Job Seekers",
                link: "https://www.make-it-in-germany.com/en/visa-residence/types/chancenkarte",
                pubDate: new Date().toISOString(),
                description: "Germany's new Opportunity Card allows non-EU skilled workers to enter Germany to look for work for up to a year. It uses a points-based system considering language skills, experience, and age.",
                source: "Federal Republic of Germany"
            },
            {
                title: "Germany Eases Naturalization Rules: Citizenship in 5 Years",
                link: "https://www.bmi.bund.de/EN/topics/migration/nationality-law/nationality-law-node.html",
                pubDate: new Date().toISOString(),
                description: "Germany has modernized its citizenship laws, allowing naturalization after just 5 years of residence (down from 8), and even 3 years in cases of 'special integration achievements'. Dual citizenship is also now generally permitted.",
                source: "Federal Ministry of the Interior"
            },

            // Canada News
            {
                title: "Canada Announces Cap on International Student Permits",
                link: "https://www.canada.ca/en/immigration-refugees-citizenship/news.html",
                pubDate: new Date().toISOString(),
                description: "IRCC has introduced a cap on the number of international student permits for 2025 to ensure the sustainability of the program and alleviate housing pressures.",
                source: "IRCC Canada"
            },
            {
                title: "Canada Prioritizes Francophone Immigration Outside Quebec",
                link: "https://www.canada.ca/en/immigration-refugees-citizenship/campaigns/francophone-immigration.html",
                pubDate: new Date().toISOString(),
                description: "New targets have been set to increase the proportion of French-speaking permanent resident admissions outside Quebec, offering streamlined pathways for Francophone candidates.",
                source: "IRCC Canada"
            },

            // US News
            {
                title: "US H-1B Visa Modernization and Stricter Vetting",
                link: "https://www.uscis.gov/working-in-united-states/h-1b-specialty-occupations",
                pubDate: new Date().toISOString(),
                description: "The US has proposed rules to modernize the H-1B lottery system to prevent fraud, alongside stricter vetting processes including social media screening for certain applicants.",
                source: "USCIS"
            },
            {
                title: "US Asylum Processing Changes and Fee Updates",
                link: "https://www.uscis.gov/humanitarian/refugees-and-asylum/asylum",
                pubDate: new Date().toISOString(),
                description: "New policies affect asylum processing timelines and introduce updated fee structures for varying humanitarian applications.",
                source: "USCIS"
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
