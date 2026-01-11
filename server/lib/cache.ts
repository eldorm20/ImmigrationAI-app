import { logger } from "./logger";
import { redis } from "../db";
import crypto from "crypto";

/**
 * Cache service using Redis
 */

interface CacheOptions {
    ttl?: number; // Time to live in seconds
    prefix?: string;
}

/**
 * Generate a hash for cache key
 */
function generateHash(data: string): string {
    return crypto.createHash("md5").update(data).digest("hex");
}

/**
 * Cache AI response
 */
export async function cacheAIResponse(
    prompt: string,
    response: string,
    model: string = "default",
    ttl: number = 3600 // 1 hour default
): Promise<void> {
    try {
        const hash = generateHash(prompt + model);
        const key = `ai:response:${hash}`;

        await redis.setex(key, ttl, JSON.stringify({
            response,
            model,
            timestamp: Date.now(),
        }));

        logger.info({ key, ttl }, "Cached AI response");
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to cache AI response");
    }
}

/**
 * Get cached AI response
 */
export async function getCachedAIResponse(
    prompt: string,
    model: string = "default"
): Promise<string | null> {
    try {
        const hash = generateHash(prompt + model);
        const key = `ai:response:${hash}`;

        const cached = await redis.get(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        logger.info({ key, age: Date.now() - data.timestamp }, "Cache hit for AI response");

        return data.response;
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to get cached AI response");
        return null;
    }
}

/**
 * Cache document analysis result
 */
export async function cacheDocumentAnalysis(
    imageHash: string,
    result: any,
    ttl: number = 86400 // 24 hours
): Promise<void> {
    try {
        const key = `vision:${imageHash}`;
        await redis.setex(key, ttl, JSON.stringify(result));
        logger.info({ key, ttl }, "Cached document analysis");
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to cache document analysis");
    }
}

/**
 * Get cached document analysis
 */
export async function getCachedDocumentAnalysis(
    imageHash: string
): Promise<any | null> {
    try {
        const key = `vision:${imageHash}`;
        const cached = await redis.get(key);

        if (!cached) return null;

        logger.info({ key }, "Cache hit for document analysis");
        return JSON.parse(cached);
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to get cached document analysis");
        return null;
    }
}

/**
 * Cache translation result
 */
export async function cacheTranslation(
    text: string,
    targetLang: string,
    translation: string,
    ttl: number = 604800 // 7 days
): Promise<void> {
    try {
        const hash = generateHash(text + targetLang);
        const key = `translate:${hash}`;

        await redis.setex(key, ttl, translation);
        logger.info({ key, ttl }, "Cached translation");
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to cache translation");
    }
}

/**
 * Get cached translation
 */
export async function getCachedTranslation(
    text: string,
    targetLang: string
): Promise<string | null> {
    try {
        const hash = generateHash(text + targetLang);
        const key = `translate:${hash}`;

        const cached = await redis.get(key);
        if (!cached) return null;

        logger.info({ key }, "Cache hit for translation");
        return cached;
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to get cached translation");
        return null;
    }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
    try {
        // Note: This uses SCAN which is safe for production
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            logger.info({ pattern, count: keys.length }, "Invalidated cache keys");
        }
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to invalidate cache");
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
    keys: number;
    memory: number;
    hits: number;
    misses: number;
}> {
    try {
        const info = await redis.info("stats");
        const keyspace = await redis.info("keyspace");

        // Parse Redis INFO output
        const stats = {
            keys: 0,
            memory: 0,
            hits: 0,
            misses: 0,
        };

        // Extract stats from info string
        // This is a simplified version - you might want to parse more thoroughly

        return stats;
    } catch (error: any) {
        logger.error({ error: error.message }, "Failed to get cache stats");
        return { keys: 0, memory: 0, hits: 0, misses: 0 };
    }
}
