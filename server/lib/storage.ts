import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";
import { logger } from "./logger";

// Initialize S3 client (works with Railway storage or AWS S3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // Railway storage endpoint
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
  forcePathStyle: true, // Required for Railway storage
});

const BUCKET_NAME = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || "";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/pdf",
  "image/webp",
];

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

  try {
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

    // Generate presigned URL for access (valid for 1 hour)
    const url = await getPresignedUrl(key);

    logger.info({ key, userId, applicationId, size: file.size }, "File uploaded successfully");

    return {
      key,
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  } catch (error) {
    logger.error({ error, key }, "Failed to upload file");
    throw new Error("Failed to upload file");
  }
}

// Get presigned URL for file access
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error({ error, key }, "Failed to generate presigned URL");
    throw new Error("Failed to generate file URL");
  }
}

// Delete file from storage
export async function deleteFile(key: string): Promise<void> {
  try {
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







