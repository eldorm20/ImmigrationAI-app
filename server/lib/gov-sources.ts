/**
 * Government Sources Scraper Module
 * Scrapers for official government legal sources (Lex.uz, GOV.UK)
 * These scrape publicly available legal documents for RAG ingestion
 */

import { logger } from "./logger";
import { RagClient } from "./rag-client";

interface ScrapedDocument {
    url: string;
    title: string;
    content: string;
    jurisdiction: string;
    effectiveDate?: string;
}

interface ScraperResult {
    success: boolean;
    documentsProcessed: number;
    errors: string[];
}

/**
 * Lex.uz - Uzbekistan Legal Database Scraper
 * Scrapes immigration-related laws and regulations in Uzbek and Russian
 */
export async function scrapeLexUz(keywords: string[] = ['миграция', 'виза', 'гражданство']): Promise<ScraperResult> {
    const baseUrl = 'https://lex.uz';
    const results: ScrapedDocument[] = [];
    const errors: string[] = [];

    for (const keyword of keywords) {
        try {
            // Search URL for Lex.uz (Russian interface)
            const searchUrl = `${baseUrl}/ru/search?q=${encodeURIComponent(keyword)}`;

            const response = await fetch(searchUrl, {
                headers: {
                    'User-Agent': 'ImmigrationAI-LegalBot/1.0',
                    'Accept': 'text/html',
                    'Accept-Language': 'ru-RU,ru;q=0.9,uz;q=0.8'
                }
            });

            if (!response.ok) {
                errors.push(`Lex.uz search failed for "${keyword}": ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Extract document links using regex (basic HTML parsing)
            const docLinkPattern = /href="(\/ru\/docs\/\d+)"/g;
            const matches = Array.from(html.matchAll(docLinkPattern));

            // Process up to 5 documents per keyword
            for (const match of matches.slice(0, 5)) {
                const docUrl = `${baseUrl}${match[1]}`;
                try {
                    const docResponse = await fetch(docUrl, {
                        headers: { 'User-Agent': 'ImmigrationAI-LegalBot/1.0' }
                    });

                    if (docResponse.ok) {
                        const docHtml = await docResponse.text();

                        // Extract title
                        const titleMatch = docHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
                        const title = titleMatch ? titleMatch[1].trim() : 'Uzbekistan Legal Document';

                        // Extract date if present
                        const dateMatch = docHtml.match(/(\d{2}\.\d{2}\.\d{4})/);
                        const effectiveDate = dateMatch ? dateMatch[1] : undefined;

                        // Extract main content (simplified - strips HTML tags)
                        const contentMatch = docHtml.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                        const content = contentMatch
                            ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                            : '';

                        if (content.length > 100) {
                            results.push({
                                url: docUrl,
                                title,
                                content: content.substring(0, 10000), // Limit content size
                                jurisdiction: 'UZ',
                                effectiveDate
                            });
                        }
                    }
                } catch (err) {
                    errors.push(`Failed to process ${docUrl}: ${(err as Error).message}`);
                }
            }
        } catch (err) {
            errors.push(`Lex.uz scrape failed for "${keyword}": ${(err as Error).message}`);
        }
    }

    // Ingest into RAG system
    for (const doc of results) {
        try {
            await RagClient.ingest(doc.url, doc.jurisdiction, doc.title, doc.effectiveDate);
        } catch (err) {
            logger.warn({ err, url: doc.url }, 'Failed to ingest Lex.uz document');
        }
    }

    logger.info({ documentsProcessed: results.length, errors: errors.length }, 'Lex.uz scrape completed');

    return {
        success: errors.length === 0,
        documentsProcessed: results.length,
        errors
    };
}

/**
 * GOV.UK Immigration Pages Scraper
 * Scrapes UK Home Office guidance and immigration rules
 */
export async function scrapeGovUK(sections: string[] = ['visas-immigration', 'settle-in-the-uk']): Promise<ScraperResult> {
    const baseUrl = 'https://www.gov.uk';
    const results: ScrapedDocument[] = [];
    const errors: string[] = [];

    for (const section of sections) {
        try {
            const sectionUrl = `${baseUrl}/${section}`;

            const response = await fetch(sectionUrl, {
                headers: {
                    'User-Agent': 'ImmigrationAI-LegalBot/1.0',
                    'Accept': 'text/html'
                }
            });

            if (!response.ok) {
                errors.push(`GOV.UK section failed "${section}": ${response.status}`);
                continue;
            }

            const html = await response.text();

            // Extract guide links
            const linkPattern = /href="(\/[^"]*guidance[^"]*)"/g;
            const matches = Array.from(html.matchAll(linkPattern));

            // Process up to 10 guidance pages per section
            for (const match of matches.slice(0, 10)) {
                const pageUrl = `${baseUrl}${match[1]}`;
                try {
                    const pageResponse = await fetch(pageUrl, {
                        headers: { 'User-Agent': 'ImmigrationAI-LegalBot/1.0' }
                    });

                    if (pageResponse.ok) {
                        const pageHtml = await pageResponse.text();

                        // Extract title
                        const titleMatch = pageHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
                        const title = titleMatch ? titleMatch[1].trim() : 'UK Immigration Guidance';

                        // Extract last updated date
                        const dateMatch = pageHtml.match(/Updated.*?(\d{1,2}\s+\w+\s+\d{4})/);
                        const effectiveDate = dateMatch ? dateMatch[1] : undefined;

                        // Extract main content
                        const contentMatch = pageHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);
                        const content = contentMatch
                            ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                            : '';

                        if (content.length > 200) {
                            results.push({
                                url: pageUrl,
                                title,
                                content: content.substring(0, 15000),
                                jurisdiction: 'UK',
                                effectiveDate
                            });
                        }
                    }
                } catch (err) {
                    errors.push(`Failed to process ${pageUrl}: ${(err as Error).message}`);
                }
            }
        } catch (err) {
            errors.push(`GOV.UK scrape failed for "${section}": ${(err as Error).message}`);
        }
    }

    // Ingest into RAG system
    for (const doc of results) {
        try {
            await RagClient.ingest(doc.url, doc.jurisdiction, doc.title, doc.effectiveDate);
        } catch (err) {
            logger.warn({ err, url: doc.url }, 'Failed to ingest GOV.UK document');
        }
    }

    logger.info({ documentsProcessed: results.length, errors: errors.length }, 'GOV.UK scrape completed');

    return {
        success: errors.length === 0,
        documentsProcessed: results.length,
        errors
    };
}

/**
 * UK in Uzbekistan Scraper
 * Scrapes information specific to applying for UK visas from Uzbekistan
 * (TLSContact centers, TB testing in Tashkent, etc.)
 */
export async function scrapeGovUKWorldUzbekistan(): Promise<ScraperResult> {
    const baseUrl = 'https://www.gov.uk/world/uzbekistan/news';
    const results: ScrapedDocument[] = [];
    const errors: string[] = [];

    try {
        const response = await fetch(baseUrl, {
            headers: { 'User-Agent': 'ImmigrationAI-LegalBot/1.0' }
        });

        if (response.ok) {
            const html = await response.text();

            // Extract news/updates links
            const linkPattern = /href="(\/government\/world-location-news\/[^"]*)"/g;
            const matches = Array.from(html.matchAll(linkPattern));

            for (const match of matches.slice(0, 5)) {
                const docUrl = `https://www.gov.uk${match[1]}`;
                try {
                    const docRes = await fetch(docUrl, {
                        headers: { 'User-Agent': 'ImmigrationAI-LegalBot/1.0' }
                    });

                    if (docRes.ok) {
                        const docHtml = await docRes.text();
                        const titleMatch = docHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
                        const title = titleMatch ? titleMatch[1].trim() : 'UK in Uzbekistan Update';

                        const contentMatch = docHtml.match(/<div[^>]*class="[^"]*govspeak[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                        const content = contentMatch
                            ? contentMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                            : '';

                        if (content.length > 100) {
                            results.push({
                                url: docUrl,
                                title,
                                content: content.substring(0, 10000),
                                jurisdiction: 'UK-UZ',
                                effectiveDate: new Date().toISOString()
                            });
                        }
                    }
                } catch (e) {
                    errors.push(`Failed to scrape ${docUrl}`);
                }
            }
        }
    } catch (err) {
        errors.push(`UK-Uzbekistan scrape error: ${(err as Error).message}`);
    }

    // Ingest
    for (const doc of results) {
        try {
            await RagClient.ingest(doc.url, doc.jurisdiction, doc.title, doc.effectiveDate);
        } catch (err) {
            logger.warn({ err }, 'Failed to ingest UK-Uzbekistan document');
        }
    }

    return {
        success: errors.length === 0,
        documentsProcessed: results.length,
        errors
    };
}

/**
 * Run all government source scrapers
 * This should be called periodically (e.g., daily cron job)
 */
export async function scrapeAllGovSources(): Promise<{ lexUz: ScraperResult; govUk: ScraperResult; ukUz: ScraperResult }> {
    logger.info('Starting government sources scrape...');

    const [lexUz, govUk, ukUz] = await Promise.all([
        scrapeLexUz(), // Keep Lex.uz for local exit laws/notary rules
        scrapeGovUK(),
        scrapeGovUKWorldUzbekistan()
    ]);

    logger.info({
        lexUz: { docs: lexUz.documentsProcessed, errors: lexUz.errors.length },
        govUk: { docs: govUk.documentsProcessed, errors: govUk.errors.length },
        ukUz: { docs: ukUz.documentsProcessed, errors: ukUz.errors.length }
    }, 'Government sources scrape completed');

    return { lexUz, govUk, ukUz };
}

