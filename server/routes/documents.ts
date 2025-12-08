import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { db } from "../db";
import { documents, applications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { uploadLimiter } from "../middleware/security";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { uploadFile, deleteFile, getPresignedUrl, validateFile } from "../lib/storage";
import { auditLog } from "../lib/logger";
import { logger } from "../lib/logger";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

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

    // Upload to storage
    const uploadResult = await uploadFile(
      req.file,
      userId,
      body.applicationId || null
    );

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
    } catch (err) {
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
      } catch (err2) {
        // If fallback also fails, rethrow the original error for visibility
        throw err;
      }
    }

    await auditLog(userId, "document.upload", "document", document.id, {
      fileName: uploadResult.fileName,
      applicationId: body.applicationId,
    }, req);

    logger.info({ userId, documentId: document.id, fileName: uploadResult.fileName }, "Document uploaded");

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
      // Get user's documents
      docs = await db.query.documents.findMany({
        where: eq(documents.userId, userId),
        orderBy: (documents, { desc }) => [desc(documents.createdAt)],
      });
    }

    // Generate fresh presigned URLs (prefer stored s3Key)
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        try {
          const key = (doc as any).s3Key || (typeof doc.url === 'string' && !doc.url.startsWith('http') ? doc.url : null);
          if (key) {
            const url = await getPresignedUrl(key);
            return { ...doc, url };
          }
          // Fallback: return stored URL (possibly already presigned)
          return doc;
        } catch {
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
    try {
      const key = (document as any).s3Key || (typeof document.url === 'string' && !document.url.startsWith('http') ? document.url : null);
      if (key) {
        const url = await getPresignedUrl(key);
        return res.json({ ...document, url });
      }
    } catch (err) {
      // ignore and fallthrough to return stored document
    }

    res.json(document);
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







