import Redis from "ioredis";
import { logger } from "./logger";

// Resolve Redis URL from common env names (Railway may set REDIS_URL or REDIS_TLS_URL)
const redisUrl = process.env.REDIS_URL || process.env.REDIS_TLS_URL;

let redis: any = null;

// In-memory fallback store with expiry support for short outages
type MemEntry = { value: string; expiresAt: number | null };
const inMemoryStore = new Map<string, MemEntry>();

function memSet(key: string, value: string, ttlSeconds?: number) {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
  inMemoryStore.set(key, { value, expiresAt });
}

function memGet(key: string): string | null {
  const e = inMemoryStore.get(key);
  if (!e) return null;
  if (e.expiresAt && Date.now() > e.expiresAt) {
    inMemoryStore.delete(key);
    return null;
  }
  return e.value;
}

function memDel(key: string) {
  inMemoryStore.delete(key);
}

// Rate-limit repetitive error logs to avoid noisy deploy logs
let lastRedisErrorLog = 0;
const REDIS_LOG_THROTTLE_MS = 10_000; // 10s

if (!redisUrl) {
  logger.info("No REDIS_URL configured; Redis client disabled — using in-memory fallback");
} else {
  try {
    const isTls = String(redisUrl).startsWith("rediss://") || process.env.REDIS_FORCE_TLS === "true";

    const options: any = {
      // Back off more aggressively to avoid frequent reconnect churn in logs
      retryStrategy: (times: number) => Math.min(times * 1000, 30_000),
      // Avoid queuing commands while disconnected; fail fast
      enableOfflineQueue: false,
      // Limit per-request retries so errors surface
      maxRetriesPerRequest: 5,
      // Be explicit about connect timeout
      connectTimeout: 10_000,
    };

    if (isTls) {
      options.tls = {
        rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
      } as any;
    }

    redis = new Redis(redisUrl, options);

    redis.on("error", (err: any) => {
      const now = Date.now();
      if (now - lastRedisErrorLog > REDIS_LOG_THROTTLE_MS) {
        lastRedisErrorLog = now;
        logger.warn({ error: err }, "Redis connection error (throttled)");
      } else {
        logger.debug({ error: err }, "Redis connection error (suppressed)");
      }
    });

    redis.on("connect", () => {
      logger.info("Redis connected");
    });

    // Downgrade frequent 'close' events to debug to reduce log noise
    redis.on("close", () => {
      logger.debug("Redis connection closed");
    });

    redis.on("end", () => {
      logger.info("Redis connection ended");
    });
  } catch (err) {
    logger.warn({ error: err }, "Failed to initialize Redis — using in-memory fallback");
    redis = null;
  }
}

export function isRedisAvailable(): boolean {
  return !!redis;
}

export async function checkRedisConnection(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch (error) {
    const now = Date.now();
    if (now - lastRedisErrorLog > REDIS_LOG_THROTTLE_MS) {
      lastRedisErrorLog = now;
      logger.warn({ error }, "Redis connection check failed");
    } else {
      logger.debug({ error }, "Redis connection check failed (suppressed)");
    }
    return false;
  }
}

// Token blacklist for logout
export async function addTokenToBlacklist(token: string, expiresIn: number): Promise<void> {
  const key = `blacklist:${token}`;
  if (redis) {
    try {
      await redis.setex(key, expiresIn, "1");
      return;
    } catch (error) {
      logger.warn({ error }, "Failed to add token to blacklist (redis)");
    }
  }

  // Fallback: store in-memory (best-effort)
  memSet(key, "1", expiresIn);
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `blacklist:${token}`;
  if (redis) {
    try {
      const result = await redis.get(key);
      return result === "1";
    } catch (error) {
      logger.warn({ error }, "Failed to check token blacklist (redis)");
    }
  }

  // Fallback: check in-memory
  const v = memGet(key);
  return v === "1";
}

// Cache utility functions
export async function getCache<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn({ key, error }, "Cache get failed (redis)");
    }
  }

  // Fallback: in-memory
  const raw = memGet(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  const payload = JSON.stringify(value);
  if (redis) {
    try {
      await redis.setex(key, ttl, payload);
      return;
    } catch (error) {
      logger.warn({ key, error }, "Cache set failed (redis)");
    }
  }

  // Fallback: in-memory
  memSet(key, payload, ttl);
}

export async function deleteCache(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (error) {
      logger.warn({ key, error }, "Cache delete failed (redis)");
    }
  }

  memDel(key);
}

// Graceful closure
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      logger.info("Redis connection closed gracefully");
    } catch (error) {
      logger.error({ error }, "Error closing Redis");
    }
  }
}

export { redis };