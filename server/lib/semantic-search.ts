/**
 * Semantic Search Service
 * Implements vector similarity search for research articles and documents
 */

import { db } from '../db';
import { researchArticles } from '@shared/schema';
import { sql } from 'drizzle-orm';
import { generateEmbedding, calculateCosineSimilarity } from './embeddings';
import { logger } from './logger';

export interface SearchResult {
    id: string;
    title: string;
    content: string;
    similarity: number;
    url?: string;
    category?: string;
}

/**
 * Semantic search across research articles using vector similarity
 */
export async function semanticSearchArticles(
    query: string,
    limit: number = 5,
    minSimilarity: number = 0.3
): Promise<SearchResult[]> {
    try {
        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query);

        // Check if we have pgvector extension
        const hasPgVector = await checkPgVectorAvailable();

        if (hasPgVector) {
            return await vectorSearchWithPgVector(queryEmbedding, limit, minSimilarity);
        } else {
            return await vectorSearchWithCosine(queryEmbedding, limit, minSimilarity);
        }
    } catch (error) {
        logger.error({ error, query }, 'Semantic search failed');

        // Fallback to keyword search
        return await keywordSearch(query, limit);
    }
}

/**
 * Vector search using pgvector extension (if available)
 */
async function vectorSearchWithPgVector(
    queryEmbedding: number[],
    limit: number,
    minSimilarity: number
): Promise<SearchResult[]> {
    try {
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        const results = await db.execute(sql`
      SELECT 
        id,
        title,
        content,
        url,
        category,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM research_articles
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

        return results.rows.map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            url: row.url,
            category: row.category,
            similarity: parseFloat(row.similarity),
        }));
    } catch (error) {
        logger.warn({ error }, 'pgvector search failed, falling back to cosine');
        return await vectorSearchWithCosine(queryEmbedding, limit, minSimilarity);
    }
}

/**
 * Vector search using manual cosine similarity (fallback)
 */
async function vectorSearchWithCosine(
    queryEmbedding: number[],
    limit: number,
    minSimilarity: number
): Promise<SearchResult[]> {
    // Fetch articles with embeddings
    const articles = await db.query.researchArticles.findMany({
        where: (articles, { isNotNull }) => isNotNull(articles.embedding),
        limit: 100, // Pre-filter to reasonable amount
    });

    // Calculate similarities
    const scored = articles
        .map(article => {
            if (!article.embedding || !Array.isArray(article.embedding)) {
                return null;
            }

            const similarity = calculateCosineSimilarity(
                queryEmbedding,
                article.embedding as number[]
            );

            return {
                id: article.id,
                title: article.title,
                content: article.content,
                url: article.url || undefined,
                category: article.category || undefined,
                similarity,
            };
        })
        .filter((item): item is SearchResult =>
            item !== null && item.similarity >= minSimilarity
        )
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return scored;
}

/**
 * Fallback keyword search (when vector search fails)
 */
async function keywordSearch(query: string, limit: number): Promise<SearchResult[]> {
    const keywords = query.toLowerCase().split(/\s+/);

    const results = await db.execute(sql`
    SELECT 
      id,
      title,
      content,
      url,
      category,
      0.5 as similarity
    FROM research_articles
    WHERE ${sql.raw(keywords.map(() => 'LOWER(content) LIKE ?').join(' OR '),
        keywords.map(k => `%${k}%`))}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

    return results.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        url: row.url,
        category: row.category,
        similarity: 0.5,
    }));
}

/**
 * Check if pgvector extension is available
 */
async function checkPgVectorAvailable(): Promise<boolean> {
    try {
        const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'vector'
      ) as has_pgvector
    `);

        return result.rows[0]?.has_pgvector === true;
    } catch (error) {
        logger.debug({ error }, 'pgvector not available');
        return false;
    }
}

/**
 * Search articles and return formatted context for RAG
 */
export async function getRAGContext(
    query: string,
    maxTokens: number = 2000
): Promise<string> {
    const results = await semanticSearchArticles(query, 3, 0.4);

    if (results.length === 0) {
        return '';
    }

    let context = '### Relevant Immigration Information:\n\n';
    let currentTokens = 0;

    for (const result of results) {
        const snippet = `**${result.title}** (Relevance: ${(result.similarity * 100).toFixed(0)}%)\n${result.content.substring(0, 500)}...\n\n`;
        const estimatedTokens = snippet.length / 4; // Rough token estimate

        if (currentTokens + estimatedTokens > maxTokens) {
            break;
        }

        context += snippet;
        currentTokens += estimatedTokens;
    }

    return context;
}

export default {
    semanticSearchArticles,
    getRAGContext,
};
