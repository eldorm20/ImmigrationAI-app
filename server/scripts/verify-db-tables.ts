/**
 * Database Table Verification and Initialization Script
 * 
 * This script checks if all required tables exist in the database
 * and creates them if they're missing. Specifically addresses Phase 5
 * lawyer feature issues which are table initialization problems, not code bugs.
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './lib/logger';
import { ensureErpTablesExist } from './lib/db-init';

interface TableInfo {
    tableName: string;
    exists: boolean;
    rowCount?: number;
}

async function checkTableExists(tableName: string): Promise<TableInfo> {
    try {
        const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `);

        const exists = result.rows[0]?.exists === true;

        let rowCount: number | undefined;
        if (exists) {
            const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
            rowCount = parseInt(countResult.rows[0]?.count || '0');
        }

        return { tableName, exists, rowCount };
    } catch (error) {
        logger.error({ error, tableName }, 'Failed to check table existence');
        return { tableName, exists: false };
    }
}

async function verifyAllTables(): Promise<void> {
    const requiredTables = [
        // Core tables
        'users',
        'applications',
        'documents',
        'consultations',
        'messages',

        // Phase 5 Lawyer ERP tables (root cause of "bugs")
        'leads',
        'tasks',
        'time_entries',
        'invoices',
        'deadlines',

        // Additional feature tables
        'roadmap_items',
        'checklist_items',
        'document_checklists',
        'background_jobs',
        'research_articles',
        'companies',
        'interviews',
        'payments',
    ];

    logger.info('=== Database Table Verification ===');
    logger.info(`Checking ${requiredTables.length} tables...`);

    const results: TableInfo[] = [];
    const missingTables: string[] = [];

    for (const tableName of requiredTables) {
        const info = await checkTableExists(tableName);
        results.push(info);

        if (!info.exists) {
            missingTables.push(tableName);
        }

        const status = info.exists ? '✓' : '✗';
        const rows = info.rowCount !== undefined ? ` (${info.rowCount} rows)` : '';
        logger.info(`${status} ${tableName}${rows}`);
    }

    if (missingTables.length > 0) {
        logger.warn(`\n❌ Missing ${missingTables.length} tables:`);
        missingTables.forEach(table => logger.warn(`  - ${table}`));

        logger.info('\n🔧 Attempting to create missing tables...');

        try {
            // Run the ERP table creation function
            await ensureErpTablesExist();
            logger.info('✓ Successfully created missing tables');

            // Verify again
            logger.info('\n=== Re-verification ===');
            for (const tableName of missingTables) {
                const info = await checkTableExists(tableName);
                const status = info.exists ? '✓' : '✗';
                logger.info(`${status} ${tableName}`);
            }
        } catch (error) {
            logger.error({ error }, '✗ Failed to create tables');
            throw error;
        }
    } else {
        logger.info('\n✓ All tables exist!');
    }

    // Summary
    const existingCount = results.filter(r => r.exists).length;
    const totalRows = results.reduce((sum, r) => sum + (r.rowCount || 0), 0);

    logger.info('\n=== Summary ===');
    logger.info(`Tables: ${existingCount}/${requiredTables.length}`);
    logger.info(`Total rows: ${totalRows.toLocaleString()}`);

    if (existingCount === requiredTables.length) {
        logger.info('✓ Database is healthy');
    } else {
        logger.warn('⚠️ Some tables are still missing - manual intervention may be required');
    }
}

// Run verification
if (require.main === module) {
    verifyAllTables()
        .then(() => {
            logger.info('\n✓ Verification complete');
            process.exit(0);
        })
        .catch((error) => {
            logger.error({ error }, '✗ Verification failed');
            process.exit(1);
        });
}

export { verifyAllTables, checkTableExists };
