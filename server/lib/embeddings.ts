/**
 * Vector Embedding Generation Service
 * Generates embeddings for documents and research articles for RAG
 */

import { logger } from './logger';
import { db } from '../db';
import { researchArticles, documents } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { generateOllamaEmbedding, probeOllamaEndpoint } from './ollama';

interface EmbeddingResponse {
    embedding: number[];
    model: string;
}

/**
 * Generate embedding using available AI service
 * Falls back to simple TF-IDF if AI service unavailable
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        // 1. Try HuggingFace if API key available
        if (process.env.HUGGINGFACE_API_TOKEN) {
            return await generateHuggingFaceEmbedding(text);
        }

        // 2. Try Local AI (Ollama) if URL is configured
        if (process.env.LOCAL_AI_URL || process.env.OLLAMA_URL) {
            return await generateOllamaEmbeddingInternal(text);
        }

        // 3. Fallback to simple embedding
        return generateSimpleEmbedding(text);
    } catch (error) {
        logger.error({ error }, 'Failed to generate embedding, using fallback');
        return generateSimpleEmbedding(text);
    }
}

/**
 * Generate embedding using Ollama (Local AI)
 */
async function generateOllamaEmbeddingInternal(text: string): Promise<number[]> {
    const baseUrl = process.env.LOCAL_AI_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'mistral';

    const embedding = await generateOllamaEmbedding(text, baseUrl, model);
    if (!embedding) {
        throw new Error('Ollama embedding generation failed');
    }
    return embedding;
}

/**
 * Generate embedding using HuggingFace API
 */
async function generateHuggingFaceEmbedding(text: string): Promise<number[]> {
    const API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs: text.substring(0, 1000), // Limit to first 1000 chars
        }),
    });

    if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.statusText}`);
    }

    const embedding = await response.json();

    // HuggingFace returns array directly for sentence-transformers
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
        return embedding[0];
    }
    // Handle single vector response
    if (Array.isArray(embedding) && typeof embedding[0] === 'number') {
        return embedding as number[];
    }

    throw new Error('Invalid embedding format from HuggingFace');
}

/**
 * Simple TF-IDF based embedding (fallback)
 * Creates a 384-dimensional vector (matching sentence-transformers output)
 */
function generateSimpleEmbedding(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = Array.from(new Set(words));

    // Create a simple hash-based embedding
    const embedding = new Array(384).fill(0);

    uniqueWords.forEach((word, idx) => {
        const hash = simpleHash(word);
        const position = hash % 384;
        embedding[position] += 1 / Math.sqrt(uniqueWords.length);
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
        return embedding.map(val => val / magnitude);
    }

    return embedding;
}

/**
 * Simple string hash function
 */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dotProduct / (magA * magB);
}

/**
 * Generate and store embedding for a research article
 */
export async function embedResearchArticle(articleId: string): Promise<void> {
    try {
        const article = await db.query.researchArticles.findFirst({
            where: eq(researchArticles.id, articleId),
        });

        if (!article) {
            throw new Error(`Article ${articleId} not found`);
        }

        // Combine title and content for embedding
        const textToEmbed = `${article.title}\n${article.content}`;
        const embedding = await generateEmbedding(textToEmbed);

        // Store embedding in database
        await db.update(researchArticles)
            .set({ embedding })
            .where(eq(researchArticles.id, articleId));

        logger.info({ articleId }, 'Successfully generated and stored article embedding');
    } catch (error) {
        logger.error({ error, articleId }, 'Failed to embed research article');
        throw error;
    }
}

/**
 * Generate and store embedding for a document
 */
export async function embedDocument(documentId: string, extractedText: string): Promise<void> {
    try {
        const embedding = await generateEmbedding(extractedText);

        // Store in document metadata
        await db.update(documents)
            .set({
                metadata: db.raw(`
          COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('embedding', $1::jsonb)
        `, [JSON.stringify(embedding)])
            })
            .where(eq(documents.id, documentId));

        logger.info({ documentId }, 'Successfully generated and stored document embedding');
    } catch (error) {
        logger.error({ error, documentId }, 'Failed to embed document');
        throw error;
    }
}

/**
 * Batch process all research articles without embeddings
 */
export async function batchEmbedResearchArticles(): Promise<number> {
    try {
        const articles = await db.query.researchArticles.findMany({
            where: (articles, { isNull }) => isNull(articles.embedding),
            limit: 100, // Process in batches
        });

        logger.info({ count: articles.length }, 'Processing research articles for embeddings');

        let successCount = 0;
        for (const article of articles) {
            try {
                await embedResearchArticle(article.id);
                successCount++;

                // Rate limit to avoid overwhelming API
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                logger.warn({ articleId: article.id, error }, 'Failed to embed article, continuing');
            }
        }

        logger.info({ successCount, total: articles.length }, 'Batch embedding complete');
        return successCount;
    } catch (error) {
        logger.error({ error }, 'Batch embedding failed');
        throw error;
    }
}

export default {
    generateEmbedding,
    calculateCosineSimilarity,
    embedResearchArticle,
    embedDocument,
    batchEmbedResearchArticles,
};
