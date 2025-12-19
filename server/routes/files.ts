import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { Pool } from 'pg';

const router = Router();

// Serve document files from PostgreSQL storage (with authentication)
router.get(
    "/file/:key(*)",
    authenticate, // Require authentication
    asyncHandler(async (req, res) => {
        const key = decodeURIComponent(req.params.key);
        const userId = req.user!.userId;
        const role = req.user!.role;

        try {
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            const client = await pool.connect();

            try {
                // Fetch file from database
                const result = await client.query(
                    'SELECT file_data, file_name, mime_type, user_id FROM file_blobs WHERE key = $1',
                    [key]
                );

                if (!result || result.rowCount === 0) {
                    return res.status(404).json({ message: 'File not found' });
                }

                const row = result.rows[0];

                // Check ownership - users can only view their own files (unless admin/lawyer)
                if (role === 'applicant' && row.user_id !== userId) {
                    logger.warn({ userId, key, fileUserId: row.user_id }, "Unauthorized file access attempt");
                    return res.status(403).json({ message: 'Access denied' });
                }

                // Set response headers
                res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');

                // Allow inline viewing for images and PDFs
                const isViewable = ['image/', 'application/pdf'].some(t => (row.mime_type || '').startsWith(t));
                const disposition = isViewable
                    ? `inline; filename="${row.file_name}"`
                    : `attachment; filename="${row.file_name}"`;

                res.setHeader('Content-Disposition', disposition);
                res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour

                res.send(row.file_data);
            } finally {
                client.release();
                await pool.end();
            }
        } catch (err) {
            logger.error({ err, key, userId }, "Failed to serve file from database");
            return res.status(500).json({ message: 'Failed to retrieve file' });
        }
    })
);

export default router;
