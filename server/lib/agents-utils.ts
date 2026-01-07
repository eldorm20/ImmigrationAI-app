/**
 * Agents Utilities
 * Shared helper functions for AI agents
 */

import { OpenAI } from "openai";
import { logger } from "./logger";

/**
 * Utility to get embedding for RAG queries
 */
export async function getQueryEmbedding(query: string): Promise<number[] | null> {
    const localAIUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL;
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

    if (hasOpenAI) {
        try {
            const openai = new OpenAI();
            const res = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: query,
            });
            return res.data[0].embedding;
        } catch (err) {
            logger.warn({ err }, "OpenAI embedding generation failed");
        }
    }

    if (localAIUrl) {
        try {
            const { generateOllamaEmbedding } = await import("./ollama");
            return await generateOllamaEmbedding(query, localAIUrl, process.env.OLLAMA_MODEL);
        } catch (err) {
            logger.warn({ err }, "Local AI embedding generation failed");
        }
    }

    return null;
}

/**
 * Clean and format AI response text
 */
export function cleanAIResponse(text: string): string {
    return text.replace(/```json\n?/, "").replace(/```\s*$/, "").trim();
}
