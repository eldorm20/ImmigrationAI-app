/**
 * RAG Service Client
 * Connects the main backend to the FastAPI RAG microservice
 */

import { logger } from "./logger";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export interface RagCitation {
    url: string;
    jurisdiction: string;
    title: string;
    date: string;
    last_verified: string;
}

export interface RagResponse {
    answer: string;
    citations: RagCitation[];
}

export interface RagSearchResult {
    content: string;
    metadata: RagCitation;
    distance: number;
}

interface CacheEntry {
    data: any;
    expiry: number;
}

export class RagClient {
    private static cache = new Map<string, CacheEntry>();
    private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private static getCached(key: string): any | null {
        const entry = this.cache.get(key);
        if (entry && entry.expiry > Date.now()) {
            return entry.data;
        }
        if (entry) this.cache.delete(key);
        return null;
    }

    private static setCache(key: string, data: any) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + this.CACHE_TTL
        });
    }

    /**
     * Get a cited answer from the RAG service
     */
    static async getAnswer(query: string, jurisdiction?: string): Promise<RagResponse> {
        const cacheKey = `answer:${jurisdiction || 'global'}:${query}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${RAG_SERVICE_URL}/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, jurisdiction }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`RAG Service responded with ${response.status}`);
            }

            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.error({ error, query }, "RAG getAnswer failed");
            return {
                answer: "I'm sorry, I'm currently unable to access my authoritative immigration database. I will answer based on my general knowledge.",
                citations: []
            };
        }
    }

    /**
     * Search for relevant documents in the RAG service
     */
    static async search(query: string, jurisdiction?: string, topK: number = 5): Promise<RagSearchResult[]> {
        const cacheKey = `search:${jurisdiction || 'global'}:${topK}:${query}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(`${RAG_SERVICE_URL}/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, jurisdiction, top_k: topK }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`RAG Service search responded with ${response.status}`);
            }

            const data = await response.json();
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            logger.error({ error, query }, "RAG search failed");
            return [];
        }
    }

    /**
     * Ingest a new URL into the RAG service
     */
    static async ingest(url: string, jurisdiction: string, sectionTitle: string, effectiveDate?: string): Promise<boolean> {
        try {
            const response = await fetch(`${RAG_SERVICE_URL}/ingest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url,
                    jurisdiction,
                    section_title: sectionTitle,
                    effective_date: effectiveDate
                })
            });

            return response.ok;
        } catch (error) {
            logger.error({ error, url }, "RAG ingest failed");
            return false;
        }
    }
}
