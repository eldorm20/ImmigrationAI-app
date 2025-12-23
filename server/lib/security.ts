import * as crypto from "crypto";
import { logger } from "./logger";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "substitution-key-for-dev-32-chars!!"; // Must be 32 chars
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts sensitive data (PII) for storage at rest.
 * @param text The plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedText
 */
export function encryptSensitiveData(text: string): string {
    try {
        if (!text) return text;

        const iv = Buffer.from(crypto.randomBytes(12));
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");

        const authTag = cipher.getAuthTag().toString("hex");

        return `${iv.toString("hex")}:${authTag}:${encrypted}`;
    } catch (err) {
        logger.error({ err }, "Encryption failed");
        throw new Error("Failed to encrypt sensitive data");
    }
}

/**
 * Decrypts sensitive data (PII) from storage.
 * @param encryptedData The encrypted string in format: iv:authTag:encryptedText
 * @returns Decrypted plain text
 */
export function decryptSensitiveData(encryptedData: string): string {
    try {
        if (!encryptedData || !encryptedData.includes(":")) return encryptedData;

        const [ivHex, authTagHex, encryptedText] = encryptedData.split(":");

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch (err) {
        logger.error({ err }, "Decryption failed");
        // Return original if decryption fails (might be unencrypted or old data)
        return encryptedData;
    }
}
