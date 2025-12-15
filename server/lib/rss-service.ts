/**
 * RSS Feed Service for Research Library
 * Fetches immigration-related news and articles from public RSS feeds
 */

import { logger } from "./logger";

export interface RSSItem {
    id: string;
    title: string;
    summary: string;
    category: string;
    type: string;
    tags: string[];
    source: string;
    sourceUrl?: string;
    publishedAt?: Date;
}

// Free, publicly available RSS feeds for immigration news
const RSS_FEEDS = [
    {
        url: "https://www.gov.uk/government/organisations/uk-visas-and-immigration.atom",
        source: "UK Home Office",
        category: "visa",
        fallbackEnabled: true,
    },
    {
        url: "https://news.google.com/rss/search?q=immigration+visa+europe&hl=en",
        source: "Google News",
        category: "news",
        fallbackEnabled: true,
    },
    {
        url: "https://www.immigration-law.com/rss/blog",
        source: "Immigration Law Blog",
        category: "guides",
        fallbackEnabled: false,
    },
];

// Simple XML parser for RSS feeds
function parseRSSXml(xml: string, source: string, category: string): RSSItem[] {
    const items: RSSItem[] = [];

    // Match <item> or <entry> elements (RSS 2.0 and Atom)
    const itemMatches = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];

    for (const itemXml of itemMatches.slice(0, 10)) { // Limit to 10 items per feed
        try {
            // Extract title
            const titleMatch = itemXml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;

            if (!title) continue;

            // Extract description/summary
            const descMatch = itemXml.match(/<(description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(description|summary|content)>/i);
            const summary = descMatch ? decodeHtmlEntities(descMatch[2].trim()).slice(0, 300) : "";

            // Extract link
            const linkMatch = itemXml.match(/<link[^>]*>([^<]+)<\/link>/i) || itemXml.match(/<link[^>]*href=["']([^"']+)["']/i);
            const sourceUrl = linkMatch ? linkMatch[1].trim() : undefined;

            // Extract pubDate
            const dateMatch = itemXml.match(/<(pubDate|published|updated)[^>]*>([^<]+)<\/(pubDate|published|updated)>/i);
            const publishedAt = dateMatch ? new Date(dateMatch[2].trim()) : new Date();

            // Extract categories/tags
            const tagMatches = itemXml.match(/<category[^>]*>([^<]+)<\/category>/gi) || [];
            const tags = tagMatches.slice(0, 5).map(t => {
                const m = t.match(/>([^<]+)</);
                return m ? m[1].trim() : "";
            }).filter(Boolean);

            items.push({
                id: `rss-${Buffer.from(title.slice(0, 50)).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`,
                title,
                summary: summary || `Latest update from ${source}`,
                category,
                type: "article",
                tags: tags.length ? tags : [category],
                source,
                sourceUrl,
                publishedAt,
            });
        } catch (err) {
            logger.warn({ err }, "Failed to parse RSS item");
        }
    }

    return items;
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, "") // Strip HTML tags
        .trim();
}

// Cache for RSS feed results
let rssCache: { items: RSSItem[]; fetchedAt: Date } | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function fetchRSSFeeds(): Promise<RSSItem[]> {
    // Return cached data if still fresh
    if (rssCache && (Date.now() - rssCache.fetchedAt.getTime()) < CACHE_DURATION_MS) {
        logger.info("Returning cached RSS feed data");
        return rssCache.items;
    }

    const allItems: RSSItem[] = [];

    for (const feed of RSS_FEEDS) {
        try {
            logger.info({ url: feed.url }, "Fetching RSS feed");

            const response = await fetch(feed.url, {
                headers: {
                    'User-Agent': 'ImmigrationAI/1.0 (RSS Reader)',
                    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            if (!response.ok) {
                logger.warn({ url: feed.url, status: response.status }, "RSS feed fetch failed");
                continue;
            }

            const xml = await response.text();
            const items = parseRSSXml(xml, feed.source, feed.category);

            logger.info({ url: feed.url, count: items.length }, "Parsed RSS feed items");
            allItems.push(...items);
        } catch (err) {
            logger.warn({ err, url: feed.url }, "Failed to fetch RSS feed");
        }
    }

    // Sort by published date, newest first
    allItems.sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
    });

    // Update cache
    if (allItems.length > 0) {
        rssCache = { items: allItems, fetchedAt: new Date() };
    }

    return allItems;
}

// Export for use in research routes
export const rssService = {
    fetchFeeds: fetchRSSFeeds,
    clearCache: () => { rssCache = null; },
};
