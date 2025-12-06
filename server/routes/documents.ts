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

    // Save to database
    const [document] = await db
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

    await auditLog(userId, "document.upload", "document", document.id, {
      fileName: uploadResult.fileName,
      applicationId: body.applicationId,
    }, req);

    logger.info({ userId, documentId: document.id, fileName: uploadResult.fileName }, "Document uploaded");

    res.status(201).json(document);
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

    // Generate fresh presigned URLs
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        try {
          const url = await getPresignedUrl(doc.url.split("/").pop() || doc.url);
          return { ...doc, url };
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

    // Generate fresh presigned URL
    try {
      const url = await getPresignedUrl(document.url.split("/").pop() || document.url);
      res.json({ ...document, url });
    } catch {
      res.json(document);
    }
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

    // Delete from storage
    try {
      await deleteFile(document.url.split("/").pop() || document.url);
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







