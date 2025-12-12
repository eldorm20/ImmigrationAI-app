import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getVisaRequirements, getVisaTypeRequirements, getTravelAdvisory, compareVisas, getVisaStatistics } from "../lib/visa-requirements";
import { logger } from "../lib/logger";

const router = Router();

// Get visa requirements for a country
router.get(
  "/requirements/:country",
  asyncHandler(async (req, res) => {
    const { country } = req.params;
    const requirements = await getVisaRequirements(country);
    res.json({ country, requirements });
  })
);

// Get specific visa type requirements
router.get(
  "/requirements/:country/:visaType",
  asyncHandler(async (req, res) => {
    const { country, visaType } = req.params;
    const requirement = await getVisaTypeRequirements(country, visaType);
    
    if (!requirement) {
      return res.status(404).json({ message: "Visa type not found" });
    }
    
    res.json(requirement);
  })
);

// Compare visa requirements
router.post(
  "/compare",
  asyncHandler(async (req, res) => {
    const { countries, visaType } = z
      .object({
        countries: z.array(z.string()).min(2),
        visaType: z.string(),
      })
      .parse(req.body);

    const comparison = await compareVisas(countries, visaType);
    res.json({ visaType, comparison });
  })
);

// Get visa statistics
router.get(
  "/statistics/:country",
  asyncHandler(async (req, res) => {
    const { country } = req.params;
    const stats = await getVisaStatistics(country);
    
    if (!stats) {
      return res.status(404).json({ message: "Country not found" });
    }
    
    res.json(stats);
  })
);

// Get travel advisory
router.get(
  "/advisory/:country",
  asyncHandler(async (req, res) => {
    const { country } = req.params;
    const advisory = await getTravelAdvisory(country);
    res.json({ country, advisory });
  })
);

export default router;
