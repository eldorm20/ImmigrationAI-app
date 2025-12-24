import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { db } from "../db";
import { documents, applications, users, documentPacks, insertDocumentPackSchema } from "../../shared/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { uploadLimiter } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { uploadFile, deleteFile, getPresignedUrl, validateFile } from "../lib/storage";
import { auditLog } from "../lib/logger";
import { logger } from "../lib/logger";
import { getUserSubscriptionTier, getTierFeatures } from "../lib/subscriptionTiers";
import { analyzeUploadedDocument } from "../lib/ai";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Serve Postgres-stored blobs (if USE_PG_STORAGE was used)
// Note: This is placed BEFORE authenticate middleware to allow viewing via window.open
router.get(
  "/blob/:key",
  asyncHandler(async (req, res) => {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      const key = decodeURIComponent(req.params.key);
      const r = await client.query('SELECT file_data, file_name, mime_type FROM file_blobs WHERE key = $1', [key]);
      if (!r || r.rowCount === 0) return res.status(404).json({ message: 'File not found' });
      const row = r.rows[0];
      res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${row.file_name}"`);
      res.send(row.file_data);
    } finally {
      client.release();
      await pool.end();
    }
  })
);

// All routes require authentication
router.use(authenticate);

const createDocumentSchema = z.object({
  applicationId: z.string().uuid().optional().nullable(),
  documentType: z.string().max(100).optional(),
});

// Upload document
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "No file provided");
    }

    const body = createDocumentSchema.parse(req.body || {});
    const userId = req.user!.userId;

    // Check subscription tier and enforce document upload limit
    const tier = await getUserSubscriptionTier(userId);
    const tierFeatures = getTierFeatures(tier);
    const uploadLimit = tierFeatures.features.documentUploadLimit;

    // Count documents uploaded this month by user
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const docsThisMonth = await db.query.documents.findMany({
      where: and(
        eq(documents.userId, userId),
        gte(documents.createdAt, startOfMonth)
      ),
    });

    if (docsThisMonth.length >= uploadLimit) {
      throw new AppError(
        403,
        `You have reached the document upload limit (${uploadLimit}/month) for your ${tier} plan. Upgrade to upload more documents.`
      );
    }

    // Validate file
    const validation = validateFile(req.file);
    if (!validation.valid) {
      throw new AppError(400, validation.error || "Invalid file");
    }

    // Verify application belongs to user if provided
    if (body.applicationId) {
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, body.applicationId),
      });

      if (!application) {
        throw new AppError(404, "Application not found");
      }

      if (application.userId !== userId && req.user!.role === "applicant") {
        throw new AppError(403, "Access denied");
      }
    }

    // Upload to storage with comprehensive error handling
    let uploadResult;
    try {
      uploadResult = await uploadFile(
        req.file,
        userId,
        body.applicationId || null
      );
    } catch (err: any) {
      logger.error({ err, userId, fileName: req.file?.originalname }, "File upload failed");
      const msg = (err?.message || "File upload failed").toLowerCase();

      // Provide specific error messages for common issues
      if (msg.includes("s3") || msg.includes("bucket") || msg.includes("credentials") || msg.includes("enoent")) {
        throw new AppError(
          503,
          "File storage service is temporarily unavailable. Using local fallback storage. Please try again or contact support if the issue persists."
        );
      }
      if (msg.includes("permission") || msg.includes("access denied")) {
        throw new AppError(
          403,
          "You do not have permission to upload files. This may be a configuration issue."
        );
      }
      throw new AppError(500, msg.includes("size") ? "File is too large. Maximum 10MB allowed." : msg);
    }

    // Verify upload success before DB insertion
    if (!uploadResult || !uploadResult.key) {
      throw new AppError(500, "File upload failed to verify. Please try again.");
    }

    // Save to database. Attempt to insert s3Key; if DB migration not applied, fall back to inserting without it.
    let document: any;
    try {
      const res = await db
        .insert(documents)
        .values({
          applicationId: body.applicationId || null,
          userId,
          // store a snapshot URL and the internal storage key for reliable access
          url: uploadResult.url,
          s3Key: uploadResult.key,
          fileName: uploadResult.fileName,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          documentType: body.documentType || null,
        })
        .returning();
      document = res[0];
    } catch (err: any) {
      // Fallback: older DB schema without s3_key column
      try {
        const res2 = await db
          .insert(documents)
          .values({
            applicationId: body.applicationId || null,
            userId,
            url: uploadResult.url,
            fileName: uploadResult.fileName,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize,
            documentType: body.documentType || null,
          })
          .returning();
        document = res2[0];
      } catch (err2: any) {
        // If fallback also fails, log and rethrow for better debugging
        logger.error({ originalErr: err, fallbackErr: err2, userId }, "Database insert failed for document");
        throw new AppError(500, "Failed to save document. Please try again.");
      }
    }

    await auditLog(userId, "document.upload", "document", document.id, {
      fileName: uploadResult.fileName,
      applicationId: body.applicationId,
    }, req);

    logger.info({ userId, documentId: document.id, fileName: uploadResult.fileName }, "Document uploaded");

    // Trigger AI automated analysis in background
    analyzeUploadedDocument(
      document.id,
      document.fileName,
      document.documentType,
      document.applicationId
    ).catch(err => logger.error({ err, documentId: document.id }, "Background AI analysis trigger failed"));

    // Return a fresh presigned URL for the client
    try {
      const presigned = await getPresignedUrl(uploadResult.key);
      res.status(201).json({ ...document, url: presigned });
    } catch (err) {
      res.status(201).json(document);
    }
  })
);

// Get documents
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { applicationId } = req.query;

    let docs;
    if (applicationId) {
      // Verify application access
      const application = await db.query.applications.findFirst({
        where: eq(applications.id, applicationId as string),
      });

      if (!application) {
        throw new AppError(404, "Application not found");
      }

      if (role === "applicant" && application.userId !== userId) {
        throw new AppError(403, "Access denied");
      }

      docs = await db.query.documents.findMany({
        where: eq(documents.applicationId, applicationId as string),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      });
    } else {
      // Get user's documents (Lawyers/Admins can specify userId via query)
      const targetUserId = (role === "lawyer" || role === "admin") && req.query.userId ? req.query.userId as string : userId;
      docs = await db.query.documents.findMany({
        where: eq(documents.userId, targetUserId),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      });
    }

    // Generate fresh presigned URLs (prefer stored s3Key)
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        try {
          // 1. Try to use the explicit s3Key if available
          let key = (doc as any).s3Key;

          // 2. If no s3Key, try to extract it from the stored URL as a fallback
          // This handles legacy records or cases where s3Key wasn't saved
          if (!key && typeof doc.url === 'string') {
            // If local upload path, extract filename
            if (doc.url.includes('/uploads/')) {
              key = doc.url.split('/uploads/')[1];
            } else if (doc.url.includes('.com/')) {
              // Try to extract object key from S3 URL
              try {
                const u = new URL(doc.url);
                key = u.pathname.substring(1); // remove leading /
              } catch (e) {
                // ignore invalid URLs
              }
            }
          }

          if (key) {
            // Generate a fresh presigned URL valid for 1 hour
            const url = await getPresignedUrl(key);
            return { ...doc, url };
          }

          // Fallback: return stored URL (possibly expired if S3, or static if local)
          return doc;
        } catch (err) {
          logger.warn({ err, docId: doc.id }, "Failed to generate presigned URL");
          return doc;
        }
      })
    );

    res.json(docsWithUrls);
  })
);

// Get single document
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Generate fresh presigned URL using s3Key when available
    // Generate fresh presigned URL using s3Key when available, or extract from URL
    try {
      let key = (document as any).s3Key;

      if (!key && typeof document.url === 'string') {
        if (document.url.includes('/uploads/')) {
          key = document.url.split('/uploads/')[1];
        } else if (document.url.includes('.com/')) {
          try {
            const u = new URL(document.url);
            key = u.pathname.substring(1);
          } catch (e) { }
        }
      }

      if (key) {
        const url = await getPresignedUrl(key);
        return res.json({ ...document, url });
      }
    } catch (err) {
      // ignore and fallthrough to return stored document
      logger.warn({ err, docId: id }, "Failed to generate presigned URL for single doc");
    }

    res.json(document);
  })
);

// Document Packs endpoints
router.get(
  "/packs",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { applicationId } = req.query;

    let packs;
    if (applicationId) {
      packs = await db.query.documentPacks.findMany({
        where: and(
          eq(documentPacks.userId, userId),
          eq(documentPacks.applicationId, applicationId as string)
        ),
        orderBy: [desc(documentPacks.createdAt)],
      });
    } else {
      packs = await db.query.documentPacks.findMany({
        where: eq(documentPacks.userId, userId),
        orderBy: [desc(documentPacks.createdAt)],
      });
    }

    res.json(packs);
  })
);

router.post(
  "/packs",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = insertDocumentPackSchema.parse({
      ...req.body,
      userId
    });

    const [pack] = await db
      .insert(documentPacks)
      .values(body)
      .returning();

    await auditLog(userId, "document_pack.create", "document_pack", pack.id, {
      packName: pack.packName,
      documentCount: (pack.documentIds as string[]).length
    }, req);

    res.status(201).json(pack);
  })
);

router.post(
  "/packs/:id/share",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { lawyerId } = z.object({ lawyerId: z.string().uuid() }).parse(req.body);

    const pack = await db.query.documentPacks.findFirst({
      where: and(
        eq(documentPacks.id, id),
        eq(documentPacks.userId, userId)
      ),
    });

    if (!pack) {
      throw new AppError(404, "Document pack not found");
    }

    const [updated] = await db
      .update(documentPacks)
      .set({
        status: "shared",
        sharedWithLawyerId: lawyerId,
        updatedAt: new Date()
      })
      .where(eq(documentPacks.id, id))
      .returning();

    await auditLog(userId, "document_pack.share", "document_pack", id, {
      lawyerId
    }, req);

    res.json(updated);
  })
);

router.get(
  "/packs/:id/download",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const pack = await db.query.documentPacks.findFirst({
      where: and(
        eq(documentPacks.id, id),
        eq(documentPacks.userId, userId)
      ),
    });

    if (!pack) {
      throw new AppError(404, "Document pack not found");
    }

    // In a real implementation, this would generate a ZIP of S3 files
    // For now, we return a success status and the document list
    const docs = await db.query.documents.findMany({
      where: and(
        eq(documents.userId, userId),
        // Simple mock check for document inclusion
        sql`${documents.id} = ANY(${pack.documentIds}::varchar[])`
      )
    });

    res.json({
      message: "Ready for download",
      packName: pack.packName,
      documents: docs
    });
  })
);

// Delete document
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { id } = req.params;

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, id),
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    // Check permissions
    if (role === "applicant" && document.userId !== userId) {
      throw new AppError(403, "Access denied");
    }

    // Delete from storage (prefer stored s3Key). Try to parse key from stored URL as fallback.
    try {
      const key = (document as any).s3Key;
      if (key) {
        await deleteFile(key);
      } else if (document.url && typeof document.url === 'string') {
        try {
          const u = new URL(document.url);
          const path = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname;
          const decoded = decodeURIComponent(path);
          await deleteFile(decoded);
        } catch (err) {
          // Last resort: try deleting using the stored URL (may fail)
          try {
            await deleteFile(document.url as any);
          } catch (err2) {
            logger.error({ err2, documentId: id }, 'Failed to delete file from storage (fallback)');
          }
        }
      }
    } catch (error) {
      logger.error({ error, documentId: id }, "Failed to delete file from storage");
    }

    // Delete from database
    await db.delete(documents).where(eq(documents.id, id));

    await auditLog(userId, "document.delete", "document", id, {}, req);

    res.json({ message: "Document deleted successfully" });
  })
);

export default router;








