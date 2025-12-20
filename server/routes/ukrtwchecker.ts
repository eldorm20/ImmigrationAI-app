import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { incrementUsage } from "../lib/aiUsage";

const router = Router();

// API Key from environment or hardcoded (as per user request, though env is better, user gave key directly)
// We should ideally use env var but for this task I will use the key provided by user if env is missing, 
// or I'll put it in env. User provided: 2fecabab3ff0636b76a2b6cc0540ad01858c6987117e906fc8be5a949c558747
const UK_RTW_API_KEY = process.env.UK_RTW_API_KEY || "2fecabab3ff0636b76a2b6cc0540ad01858c6987117e906fc8be5a949c558747";
const API_BASE_URL = "https://ukrtwchecker.co.uk/api";

router.use(authenticate);

// Validation schemas
const rtwCheckSchema = z.object({
  code: z.string().min(8),
  dob: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "DOB must be dd-mm-yyyy"),
  forename: z.string().min(1),
  surname: z.string().min(1),
  company_name: z.string().min(1),
  allow_sponsorship: z.boolean().optional().default(true),
  allow_student: z.boolean().optional().default(true),
  include_image: z.boolean().optional().default(false),
  include_pdf: z.boolean().optional().default(false),
});

const immigrationCheckSchema = z.object({
  code: z.string().min(8),
  dob: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "DOB must be dd-mm-yyyy"),
  forename: z.string().min(1),
  surname: z.string().min(1),
  company_name: z.string().min(1),
  checker_job_title: z.string().min(1),
  check_reason: z.enum([
    "DRIVING_LICENCE",
    "LOAN",
    "EDUCATION_OR_TRAINING",
    "TRAVEL",
    "HEALTH_INSURANCE_CARD",
    "PERSONAL_FINANCE",
    "HOMELESSNESS_ASSISTANCE_OR_COUNCIL_HOUSING",
    "OTHER"
  ]),
  check_reason_other: z.string().optional(),
  include_image: z.boolean().optional().default(false),
  include_pdf: z.boolean().optional().default(false),
});

// Right to Work Check
router.post(
  "/rtw",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = rtwCheckSchema.parse(req.body);

    // Track usage if needed, or check permissions
    // await incrementUsage(userId, 'verificationChecks', 1);

    try {
      const response = await fetch(`${API_BASE_URL}/v2/rtw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${UK_RTW_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error({ error: errorData, status: response.status }, "UK RTW Check API failed");
        
        // Pass through the API error message if available
        throw new AppError(
          response.status, 
          errorData.message || errorData.error || "Failed to verify Right to Work status"
        );
      }

      const data = await response.json();
      
      // Log success
      logger.info({ userId, type: "rtw_check" }, "Right to Work check performed");

      res.json(data);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, "UK RTW Check internal error");
      throw new AppError(500, "Internal server error during verification");
    }
  })
);

// Immigration Status Check
router.post(
  "/immigration",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = immigrationCheckSchema.parse(req.body);

    if (body.check_reason === "OTHER" && !body.check_reason_other) {
        throw new AppError(400, "check_reason_other is required when check_reason is OTHER");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/immigration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${UK_RTW_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error({ error: errorData, status: response.status }, "Immigration Check API failed");
        
        throw new AppError(
          response.status, 
          errorData.message || errorData.error || "Failed to verify Immigration status"
        );
      }

      const data = await response.json();
      
      logger.info({ userId, type: "immigration_check" }, "Immigration status check performed");

      res.json(data);
    } catch (err: any) {
        if (err instanceof AppError) throw err;
        logger.error({ err }, "Immigration Check internal error");
        throw new AppError(500, "Internal server error during verification");
    }
  })
);

export default router;
