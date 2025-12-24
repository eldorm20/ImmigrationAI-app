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

export class RagClient {
    /**
     * Get a cited answer from the RAG service
     */
    static async getAnswer(query: string, jurisdiction?: string): Promise<RagResponse> {
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

            return await response.json();
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
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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

            return await response.json();
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
