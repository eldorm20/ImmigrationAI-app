import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

// Initialize S3 client (works with Railway storage or AWS S3)
const BUCKET_NAME = (process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "").trim();
const REGION = (process.env.AWS_REGION || "us-east-1").trim();

const s3Client = new S3Client({
  region: REGION,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
        accessKeyId: (process.env.AWS_ACCESS_KEY_ID || "").trim(),
        secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || "").trim(),
      }
      : undefined,
  forcePathStyle: true, // Required for Railway storage
});
<<<<<<< HEAD

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "";

// Validate bucket name format
function validateBucketName(bucketName: string): { valid: boolean; error?: string } {
  if (!bucketName) {
    return { valid: false, error: "Bucket name is empty" };
  }

  // S3 bucket naming rules
  if (bucketName.length < 3 || bucketName.length > 63) {
    return { valid: false, error: "Bucket name must be between 3 and 63 characters" };
  }

  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName)) {
    return { valid: false, error: "Bucket name contains invalid characters" };
  }

  if (bucketName.includes('..') || bucketName.startsWith('.') || bucketName.endsWith('.')) {
    return { valid: false, error: "Bucket name has invalid dot placement" };
  }

  return { valid: true };
=======
if (!BUCKET_NAME) {
  logger.warn("S3 bucket not configured - switching to local filesystem storage in /uploads");
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
}

// Validate and log S3 configuration status
let S3_ENABLED = false;

if (BUCKET_NAME) {
  const validation = validateBucketName(BUCKET_NAME);
  if (!validation.valid) {
    logger.warn({
      bucketName: BUCKET_NAME,
      error: validation.error,
      remedy: "Set S3_BUCKET or AWS_S3_BUCKET environment variable to a valid bucket name (3-63 lowercase chars). Falling back to PostgreSQL storage."
    }, "Invalid S3 bucket name configuration");
    S3_ENABLED = false;
  } else {
    // Bucket name is valid
    S3_ENABLED = true;
    logger.info({ bucketName: BUCKET_NAME }, "S3 storage configured successfully");
  }
} else {
  logger.warn("S3 bucket not configured (S3_BUCKET or AWS_S3_BUCKET not set) - using PostgreSQL file_blobs table for storage");
  S3_ENABLED = false;
}

// Export S3 status for other modules to check
export { S3_ENABLED };

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "image/webp",
];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // ms: 500ms, 1s, 2s

/**
 * Retry helper with exponential backoff
 * @param operation The async operation to retry
 * @param operationName Name for logging
 * @param context Context object for logging
 * @returns Promise resolving to operation result
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string,
  context: Record<string, any> = {}
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(
          { ...context, attempt: attempt + 1, maxRetries: MAX_RETRIES, operationName },
          `Retrying ${operationName} (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[attempt];
        logger.warn(
          {
            ...context,
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            operationName,
            error: lastError.message,
            nextRetryDelayMs: delay
          },
          `${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms`
        );

        // Sleep before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(
          {
            ...context,
            attempt: attempt + 1,
            maxRetries: MAX_RETRIES,
            operationName,
            error: lastError.message
          },
          `${operationName} failed after all retries`
        );
      }
    }
  }

  throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} attempts`);
}

export interface UploadResult {
  key: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

// Validate file
export function validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed`,
    };
  }

  return { valid: true };
}

// Generate unique file key
export function generateFileKey(
  userId: string,
  applicationId: string | null,
  originalName: string
): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString("hex");
  const extension = originalName.split(".").pop() || "";
  const prefix = applicationId
    ? `applications/${applicationId}`
    : `users/${userId}`;
  return `${prefix}/${timestamp}-${random}.${extension}`;
}

// Upload file to S3/Railway storage
export async function uploadFile(
  file: Express.Multer.File,
  userId: string,
  applicationId: string | null
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  const key = generateFileKey(userId, applicationId, file.originalname);

  // As per user request, prioritize Database Storage for file uploads ONLY if S3 is not configured
  // This allows "local database for file upload" instead of S3
  if (process.env.DATABASE_URL && !BUCKET_NAME) {
    try {
      // Store file blob in Postgres table `file_blobs` (created on-demand)
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const key = generateFileKey(userId, applicationId, file.originalname);
      const createSql = `CREATE TABLE IF NOT EXISTS file_blobs (
        key text PRIMARY KEY,
        file_data bytea NOT NULL,
        file_name text NOT NULL,
        mime_type text NOT NULL,
        file_size integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      const client = await pool.connect();
      try {
        await client.query('INSERT INTO file_blobs(key, file_data, file_name, mime_type, file_size) VALUES($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING', [key, file.buffer, file.originalname, file.mimetype, file.size]);
        // Use a relative URL for the blob endpoint
        const url = `/api/documents/blob/${encodeURIComponent(key)}`;
        return {
          key,
          url,
          fileName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
        };
      } finally {
        client.release();
        await pool.end();
      }
    } catch (err) {
      logger.error({ err }, "Database storage failed, falling back to other methods");
      // Fallthrough to S3/Local if DB fails
    }
  }

  // If BUCKET_NAME is not configured, use local filesystem storage
  // (even if S3_ENDPOINT is configured but bucket name is missing)
  if (!BUCKET_NAME) {
    logger.info({ key, userId, applicationId, size: file.size }, "Using local filesystem storage (S3 bucket not configured)");
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const destPath = path.resolve(uploadsDir, key);

    try {
      // Ensure directory exists
      const dir = path.dirname(destPath);
      fs.mkdirSync(dir, { recursive: true });

      // Write file to disk
      fs.writeFileSync(destPath, file.buffer);
      logger.info({ key, userId, applicationId, size: file.size }, "File saved to local filesystem");

      // Return a URL that will be served from /uploads
      const url = `${process.env.APP_URL || "/"}/uploads/${key}`;

      return {
        key,
        url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      };
    } catch (err: any) {
      logger.error({ err, key, userId, errno: (err as any).errno, code: (err as any).code }, "Local filesystem storage failed");
      const errMsg = (err as any).code === "EACCES" ? "Permission denied writing to uploads folder" : `Failed to save file locally: ${err.message}`;
      throw new Error(errMsg);
    }
  }

  try {
    logger.info({ key, userId, applicationId, size: file.size, bucket: BUCKET_NAME }, "Uploading file to S3");

    // Retry the upload operation with exponential backoff
    await retryWithBackoff(
      async () => {
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
          // Make files private by default
          ACL: "private",
        });

        await s3Client.send(command);
      },
      "S3 file upload",
      { key, userId, applicationId, fileSize: file.size, mimeType: file.mimetype, bucket: BUCKET_NAME }
    );

    // Generate presigned URL for access (valid for 1 hour)
    // Also retry presigned URL generation
    const url = await retryWithBackoff(
      async () => getPresignedUrl(key),
      "presigned URL generation",
      { key, userId }
    );

    logger.info({ key, userId, applicationId, size: file.size }, "File uploaded successfully");

    return {
      key,
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  } catch (error) {
    logger.error({ error, key, userId }, "Failed to upload file after retries");

    // Attempt graceful fallback: try Postgres blob storage if available
    if (process.env.DATABASE_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        try {
          const createSql = `CREATE TABLE IF NOT EXISTS file_blobs (
              key text PRIMARY KEY,
              file_data bytea NOT NULL,
              file_name text NOT NULL,
              mime_type text NOT NULL,
              file_size integer NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now()
            )`;
          await client.query(createSql);
          await client.query('INSERT INTO file_blobs(key, file_data, file_name, mime_type, file_size) VALUES($1,$2,$3,$4,$5) ON CONFLICT (key) DO NOTHING', [key, file.buffer, file.originalname, file.mimetype, file.size]);
          const url = `${process.env.APP_URL || ''}/api/documents/blob/${encodeURIComponent(key)}`;
          logger.info({ key, userId }, 'Stored file in Postgres as fallback after S3 failure');
          return {
            key,
            url,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
          } as UploadResult;
        } finally {
          client.release();
          await pool.end();
        }
      } catch (pgErr) {
        logger.warn({ pgErr, key, userId }, 'Postgres fallback failed after S3 upload error');
      }
    }

    // Try local filesystem fallback as a last resort
    try {
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const destPath = path.resolve(uploadsDir, key);
      const dir = path.dirname(destPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(destPath, file.buffer);
      const url = `${process.env.APP_URL || "/"}/uploads/${key}`;
      logger.info({ key, userId }, 'Stored file on local filesystem as fallback after S3 failure');
      return {
        key,
        url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
      } as UploadResult;
    } catch (fsErr) {
      logger.error({ fsErr, key, userId }, 'Local filesystem fallback also failed');
    }

    throw new Error((error as any)?.message || "Failed to upload file");
  }
}

// Get presigned URL for file access
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    // 1. If DATABASE_URL is set, prioritize checking if it's a blob stored in Postgres
    if (process.env.DATABASE_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        try {
          const r = await client.query('SELECT key FROM file_blobs WHERE key = $1', [key]);
          if (r && r.rowCount && r.rowCount > 0) {
            // It's in the database, return the blob endpoint URL
            return `/api/documents/blob/${encodeURIComponent(key)}`;
          }
        } finally {
          client.release();
          await pool.end();
        }
      } catch (err) {
        logger.warn({ err, key }, "Failed to check database for file blob");
      }
    }

    // 2. If using local filesystem fallback, return a direct URL path
    if (!BUCKET_NAME) {
      logger.warn("S3 not configured, using PostgreSQL endpoint for file access");
      return `/api/documents/file/${encodeURIComponent(key)}`;
    }

    // Validate bucket configuration before attempting to generate URL
    const validation = validateBucketName(BUCKET_NAME);
    if (!validation.valid) {
      logger.warn({ bucketName: BUCKET_NAME, error: validation.error }, "S3 bucket validation failed, using PostgreSQL fallback");
      // Return PostgreSQL endpoint instead of throwing
      return `/api/documents/file/${encodeURIComponent(key)}`;
    }

    // 3. Otherwise use S3
    return await retryWithBackoff(
      async () => {
        const command = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
      },
      "presigned URL generation",
      { key, expiresIn, bucket: BUCKET_NAME }
    );
  } catch (error) {
    logger.warn({ error, key, bucket: BUCKET_NAME }, "S3 presigned URL failed, using PostgreSQL fallback");
    // Return PostgreSQL fallback URL instead of throwing error
    return `/api/documents/file/${encodeURIComponent(key)}`;
  }
}

// Delete file from storage
export async function deleteFile(key: string): Promise<void> {
  try {
    if (!BUCKET_NAME) {
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      const filePath = path.resolve(uploadsDir, key);
      try {
        fs.unlinkSync(filePath);
        logger.info({ key }, "Local file deleted successfully");
        return;
      } catch (err) {
        logger.warn({ err, key }, "Failed to delete local file");
        throw new Error("Failed to delete local file");
      }
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    logger.info({ key }, "File deleted successfully");
  } catch (error) {
    logger.error({ error, key }, "Failed to delete file");
    throw new Error("Failed to delete file");
  }
}

// Get file metadata
export async function getFileMetadata(key: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    };
  } catch (error) {
    logger.error({ error, key }, "Failed to get file metadata");
    return null;
  }
}







