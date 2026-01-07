import { Router } from "express";
import { testConnection } from "../db";
import { checkRedisConnection } from "../lib/redis";
import { getPresignedUrl } from "../lib/storage";
import { logger } from "../lib/logger";

const router = Router();

// Helper: simple fetch with timeout
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 3000) {
  if (typeof (globalThis as any).fetch !== "function") {
    throw new Error("fetch not available in runtime");
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await (globalThis as any).fetch(url, { signal: controller.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

router.get("/", async (req, res) => {
  const timestamp = new Date().toISOString();

  // Basic DB & Redis checks
  const dbConnected = await testConnection();
  const redisConnected = await checkRedisConnection();

  // AI provider check: prefer LOCAL_AI_URL, fallback to Hugging Face env
  const localAiUrl = process.env.LOCAL_AI_URL || null;
  const hasHF = Boolean(process.env.HUGGINGFACE_API_TOKEN && process.env.HF_MODEL);

  const ai: any = { configured: Boolean(localAiUrl || hasHF), reachable: null, details: null };

  if (localAiUrl) {
    try {
      // Try OPTIONS -> GET -> POST (light) sequence to detect reachable endpoint
      let ok = false;
      try {
        const r = await fetchWithTimeout(localAiUrl, { method: "OPTIONS" }, 2000);
        ok = r && (r.status >= 200 && r.status < 400);
      } catch (e) {
        // ignore
      }

      if (!ok) {
        try {
          const r = await fetchWithTimeout(localAiUrl, { method: "GET" }, 2000);
          ok = r && (r.status >= 200 && r.status < 400);
        } catch (e) {
          // ignore
        }
      }

      if (!ok) {
        // As a fallback attempt, POST a tiny probe body (may be rejected but will show endpoint reachable)
        try {
          const probeBody = JSON.stringify({ prompt: "health-check", max_tokens: 1 });
          const r = await fetchWithTimeout(localAiUrl, { method: "POST", body: probeBody, headers: { "Content-Type": "application/json" } }, 3000);
          ok = r && r.status < 500; // treat 4xx as reachable but misconfigured
        } catch (e: any) {
          logger.debug({ err: e }, "Local AI probe failed");
        }
      }

      ai.reachable = ok;
      ai.details = { url: localAiUrl, model: process.env.OLLAMA_MODEL || null };
    } catch (err: any) {
      ai.reachable = false;
      ai.details = { error: err?.message || String(err) };
    }
  } else if (hasHF) {
    ai.reachable = true;
    ai.details = { provider: "huggingface", model: process.env.HF_MODEL };
  } else {
    ai.reachable = false;
    ai.details = { reason: "No AI provider configured (LOCAL_AI_URL or HUGGINGFACE_API_TOKEN+HF_MODEL)" };
  }

  // Storage check: try to generate a presigned URL (non-destructive)
  let storage: any = { configured: Boolean(process.env.S3_BUCKET || process.env.AWS_S3_BUCKET), ok: null, details: null };
  try {
    if (!storage.configured) {
      // local filesystem fallback - check uploads folder writable
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        const testFile = path.join(uploadsDir, "health-check.txt");
        fs.writeFileSync(testFile, "ok");
        fs.unlinkSync(testFile);
        storage.ok = true;
        storage.details = { mode: "local-filesystem", uploadsDir };
      } catch (err: any) {
        storage.ok = false;
        storage.details = { error: err?.message || String(err) };
      }
    } else {
      // Try to request a presigned URL (non-destructive)
      try {
        // This will throw if S3 is not reachable or bucket misconfigured
        const url = await getPresignedUrl("health-check-000", 60);
        storage.ok = true;
        storage.details = { presignedSample: url.slice(0, 120) };
      } catch (err: any) {
        storage.ok = false;
        storage.details = { error: err?.message || String(err) };
      }
    }
  } catch (err: any) {
    storage.ok = false;
    storage.details = { error: err?.message || String(err) };
  }

  // Stripe check: use the same non-destructive validation as /api/stripe/validate
  let payments: any = { configured: Boolean(process.env.STRIPE_SECRET_KEY), ok: null, details: null };
  if (payments.configured) {
    try {
      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      // Attempt a harmless list call
      const prices = await stripe.prices.list({ limit: 1 });
      payments.ok = true;
      payments.details = { examplePrice: prices.data[0] ? { id: prices.data[0].id, active: prices.data[0].active } : null };
    } catch (err: any) {
      payments.ok = false;
      payments.details = { error: err?.message || String(err) };
    }
  } else {
    payments.ok = false;
    payments.details = { reason: "STRIPE_SECRET_KEY not set" };
  }

  const overallHealthy = dbConnected && redisConnected && ai.reachable && storage.ok && payments.ok;

  res.status(overallHealthy ? 200 : 503).json({
    status: overallHealthy ? "healthy" : "degraded",
    timestamp,
    checks: {
      database: dbConnected ? { ok: true } : { ok: false },
      redis: redisConnected ? { ok: true } : { ok: false },
      ai,
      storage,
      payments,
    },
  });
});

export default router;







