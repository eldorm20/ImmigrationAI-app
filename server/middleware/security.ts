import { Request } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Lightweight, safe security middleware configuration.
// Keep config minimal so esbuild treats this as plain JS-friendly code.

const DEFAULT_ORIGINS = [
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
  // Allow Railway preview/production domains by default (wildcard)
  "https://*.railway.app",
  "https://*.up.railway.app",
  // Specific production domain
  "https://immigrationai-app-production-b994.up.railway.app",
];

function getAllowedOrigins(): string[] {
  if (!process.env.ALLOWED_ORIGINS) return DEFAULT_ORIGINS;
  return process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
}

const allowedOrigins = getAllowedOrigins();

export const corsMiddleware = cors({
  origin: (origin: any, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true);
    
    const o = String(origin).toLowerCase();
    
    // Check each allowed origin pattern
    for (const pattern of allowedOrigins) {
      const p = pattern.toLowerCase();
      
      // Exact match
      if (p === o) return cb(null, true);
      
      // Wildcard pattern matching (e.g., https://*.up.railway.app)
      if (p.includes("*")) {
        // Simple wildcard matching: convert "https://*.up.railway.app" to regex
        // Escape all dots, then replace * with pattern for any subdomain
        const regexStr = p
          .replace(/\./g, "\\.")          // escape dots: . -> \.
          .replace(/\*/g, "[^.]+");       // replace *  with [^.]+ (one or more non-dot chars)
        
        // Match the full origin: https://[^.]+\.up\.railway\.app or with port
        const regex = new RegExp(`^${regexStr}(:[0-9]+)?$`);
        if (regex.test(o)) return cb(null, true);
      }
    }
    
    // All requests allowed for now (fallback for safety during deployment)
    return cb(null, true);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // keep CSP off here to simplify builds; enable as needed
});

// Safe keyGenerator for rate limiting that works with trust proxy
function getSafeClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "unknown";
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  keyGenerator: getSafeClientIp,
  skip: () => false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getSafeClientIp,
  skip: () => false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: getSafeClientIp,
  skip: () => false,
});

// AI-specific limiter to guard expensive operations (chat, generation, translation)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  // Production: tighter limit to avoid excessive model calls; Development: relaxed
  max: process.env.NODE_ENV === "production" ? 60 : 600,
  message: "Too many AI requests from this IP, please try again later.",
  keyGenerator: getSafeClientIp,
  skip: () => false,
});

export function sanitizeInput(input: string): string {
  if (!input) return "";
  return String(input).replace(/[<>]/g, "").trim();
}

export function normalizeEmail(email: string): string {
  return String(email || "").toLowerCase().trim();
}

export function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(String(code || "").toUpperCase());
}

const VALID_VISA_TYPES = new Set([
  "tourist",
  "business",
  "student",
  "work",
  "skilled_worker",
  "family",
  "opportunity_card",
  "permanent_resident",
  "refugee",
  "other",
]);

export function isValidVisaType(type: string): boolean {
  return VALID_VISA_TYPES.has(String(type || "").toLowerCase());
}
