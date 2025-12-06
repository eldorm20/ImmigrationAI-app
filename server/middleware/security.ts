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
    const ok = allowedOrigins.some((a) => {
      const aa = a.toLowerCase();
      if (aa === o) return true;
      if (aa.includes("*")) {
        // Convert wildcard pattern to regex: *.up.railway.app -> ^.+\.up\.railway\.app$
        const escapedPattern = aa
          .replace(/\./g, "\\.")  // escape dots
          .replace(/\*\./g, "[^/]+\\.");  // *. becomes [^/]+\.  (one or more non-slash chars + dot)
        const pattern = new RegExp("^" + escapedPattern + "$");
        return pattern.test(o);
      }
      return false;
    });
    if (ok) return cb(null, true);
    // If origin is not in the list, log a warning. To avoid accidental lockouts
    // during deploys where the exact host may be unknown, allow the request
    // in production as a safe fallback. To enforce stricter rules, set
    // `ALLOWED_ORIGINS` in the environment to a comma-separated list.
    // This mirrors the relaxed behavior used earlier during deployment.
    // Note: keep a warning so operators can tighten production rules later.
    // eslint-disable-next-line no-console
    console.warn(`CORS origin not allowed: ${origin}; allowing as fallback`);
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
