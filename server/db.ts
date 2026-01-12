// server/db.ts
import 'dotenv/config'; // Load environment variables from .env
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { logger } from './lib/logger';

// Ensure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configure PostgreSQL connection pool
import Redis from 'ioredis';

// Configure Redis connection
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 2000, // 2 seconds
});

// Handle pool errors globally
pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
  // For safety keep the process exit in non-development environments
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// Initialize Drizzle ORM with schema
export const db = drizzle(pool, { schema });

// Test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('✅ PostgreSQL connection successful');
    return true;
  } catch (error) {
    logger.error({ error }, '❌ PostgreSQL connection failed');
    return false;
  }
}

// Optional: Immediately test on import in development only
if (process.env.NODE_ENV === 'development') {
  testConnection().catch((err) => logger.warn({ err }, 'Test connection failed during startup'));
}






