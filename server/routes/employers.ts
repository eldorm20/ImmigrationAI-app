import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { db } from '../db';
import { employerVerifications, employerDirectory, companies, jobs, insertCompanySchema, insertJobSchema } from '@shared/schema';
import {
  verifyEmployer,
  searchEmployersMultiRegistry,
  getRegistriesInfo,
  CompanySearchParams,
} from '../lib/employer-verification';
import { logger } from '../lib/logger';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Middleware to ensure user is an employer
const requireEmployer = (req: any, res: any, next: any) => {
  if (req.user.role !== "employer" && req.user.role !== "admin") {
    return next(new AppError(403, "Access denied. Employer account required."));
  }
  next();
};

// Validation schemas
const employerSearchSchema = z.object({
  companyName: z.string().min(2).max(255),
  country: z.string().optional(),
  registryType: z.string().optional(),
  applicationId: z.string().uuid().optional(),
});

const multiRegistrySearchSchema = z.object({
  companyName: z.string().min(2).max(255),
  countries: z.array(z.string()).optional(),
});

/**
 * Get available registries
 */
router.get(
  '/registries',
  asyncHandler(async (req, res) => {
    const registries = getRegistriesInfo();
    res.json({
      success: true,
      registries,
      message: 'Available European company registries',
    });
  })
);

/**
 * Search for employer in specific registry
 */
router.post(
  '/verify',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = employerSearchSchema.parse(req.body);
    const userId = req.user!.userId;

    const params: CompanySearchParams = {
      companyName: body.companyName,
      country: body.country || 'GB',
      registryType: body.registryType,
    };

    logger.info(
      { userId, params },
      'Employer verification request'
    );

    // Verify employer
    const result = await verifyEmployer(params);

    // Save verification record to database
    if (result.results && result.results.length > 0) {
      for (const companyResult of result.results) {
        try {
          await db.insert(employerVerifications).values({
            userId,
            applicationId: body.applicationId,
            companyName: companyResult.companyName,
            country: companyResult.country,
            registryType: companyResult.registryType,
            registryId: companyResult.registryId,
            verificationStatus: companyResult.found ? 'verified' : 'invalid',
            companyData: companyResult.raw_data,
            registeredAddress: companyResult.registeredAddress,
            businessType: companyResult.businessType,
            registrationDate: companyResult.registrationDate,
            status: companyResult.status,
            companyNumber: companyResult.registryId || undefined,
            directorNames: companyResult.directors,
            sic_codes: companyResult.sic_codes,
            verificationDate: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days cache
            metadata: {
              confidence: companyResult.confidence,
              searchParams: params,
            },
          });

          // Update or create directory entry
          const existingEntry = await db
            .select()
            .from(employerDirectory)
            .where(
              and(
                eq(
                  employerDirectory.registryId,
                  companyResult.registryId || ''
                ),
                eq(employerDirectory.registryType, companyResult.registryType)
              )
            )
            .limit(1);

          if (existingEntry.length > 0) {
            await db
              .update(employerDirectory)
              .set({
                verificationsCount:
                  (existingEntry[0].verificationsCount || 0) + 1,
                lastVerifiedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(employerDirectory.id, existingEntry[0].id));
          } else if (companyResult.found) {
            await db.insert(employerDirectory).values({
              companyName: companyResult.companyName,
              country: companyResult.country,
              registryType: companyResult.registryType,
              registryId: companyResult.registryId || '',
              companyData: companyResult.raw_data || {},
              status: companyResult.status,
              lastVerifiedAt: new Date(),
              verificationsCount: 1,
            });
          }
        } catch (error) {
          logger.error({ error }, 'Error saving verification record');
        }
      }
    }

    res.json({
      success: true,
      ...result,
      recordSaved: result.results.length > 0,
    });
  })
);

/**
 * Search multiple registries
 */
router.post(
  '/search-multi',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = multiRegistrySearchSchema.parse(req.body);
    const userId = req.user!.userId;

    logger.info({ userId, companyName: body.companyName }, 'Multi-registry search');

    const result = await searchEmployersMultiRegistry(
      body.companyName,
      body.countries
    );

    // Save all results
    if (result.results.length > 0) {
      for (const companyResult of result.results) {
        try {
          await db.insert(employerVerifications).values({
            userId,
            companyName: companyResult.companyName,
            country: companyResult.country,
            registryType: companyResult.registryType,
            registryId: companyResult.registryId,
            verificationStatus: companyResult.found ? 'verified' : 'invalid',
            companyData: companyResult.raw_data,
            registeredAddress: companyResult.registeredAddress,
            businessType: companyResult.businessType,
            registrationDate: companyResult.registrationDate,
            status: companyResult.status,
            companyNumber: companyResult.registryId || undefined,
            directorNames: companyResult.directors,
            sic_codes: companyResult.sic_codes,
            verificationDate: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            metadata: {
              confidence: companyResult.confidence,
              multiRegistrySearch: true,
            },
          });
        } catch (error) {
          logger.error({ error }, 'Error saving search result');
        }
      }
    }

    res.json({
      success: true,
      ...result,
      recordsSaved: result.results.length,
    });
  })
);

/**
 * Get verification history for user
 */
router.get(
  '/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { applicationId } = req.query;

    let query = db
      .select()
      .from(employerVerifications)
      .where(eq(employerVerifications.userId, userId));

    if (applicationId && typeof applicationId === 'string') {
      query = db
        .select()
        .from(employerVerifications)
        .where(
          and(
            eq(employerVerifications.userId, userId),
            eq(employerVerifications.applicationId, applicationId)
          )
        );
    }

    const history = await query.orderBy(
      desc(employerVerifications.createdAt)
    );

    res.json({
      success: true,
      history,
      count: history.length,
    });
  })
);

/**
 * Get specific verification record
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const record = await db
      .select()
      .from(employerVerifications)
      .where(
        and(
          eq(employerVerifications.id, id),
          eq(employerVerifications.userId, userId)
        )
      )
      .limit(1);

    if (record.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found',
      });
    }

    res.json({
      success: true,
      verification: record[0],
    });
  })
);

/**
 * Get employer directory - frequently verified employers
 */
router.get(
  '/directory/top',
  asyncHandler(async (req, res) => {
    const { country, limit = 20 } = req.query;
    const maxLimit = Math.min(parseInt(limit as string) || 20, 100);

    let query: any = db.select().from(employerDirectory);

    if (country && typeof country === 'string') {
      query = db
        .select()
        .from(employerDirectory)
        .where(eq(employerDirectory.country, country.toUpperCase()));
    }

    const employers = await query
      .orderBy(desc(employerDirectory.verificationsCount))
      .limit(maxLimit);

    res.json({
      success: true,
      employers,
      count: employers.length,
    });
  })
);

/**
 * Delete verification record
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Verify ownership
    const record = await db
      .select()
      .from(employerVerifications)
      .where(
        and(
          eq(employerVerifications.id, id),
          eq(employerVerifications.userId, userId)
        )
      )
      .limit(1);

    if (record.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Verification record not found',
      });
    }

    await db
      .delete(employerVerifications)
      .where(eq(employerVerifications.id, id));

    res.json({
      success: true,
      message: 'Verification record deleted',
    });
  })
);

/**
 * Bulk verify employers
 */
router.post(
  '/verify-bulk',
  authenticate,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        employers: z.array(
          z.object({
            companyName: z.string().min(2).max(255),
            country: z.string().optional(),
            registryType: z.string().optional(),
          })
        ),
        applicationId: z.string().uuid().optional(),
      })
      .parse(req.body);

    const userId = req.user!.userId;
    const results = [];

    for (const employer of body.employers) {
      try {
        const result = await verifyEmployer({
          companyName: employer.companyName,
          country: employer.country || 'GB',
          registryType: employer.registryType,
        });

        // Save to database
        if (result.results && result.results.length > 0) {
          for (const companyResult of result.results) {
            await db.insert(employerVerifications).values({
              userId,
              applicationId: body.applicationId,
              companyName: companyResult.companyName,
              country: companyResult.country,
              registryType: companyResult.registryType,
              registryId: companyResult.registryId,
              verificationStatus: companyResult.found ? 'verified' : 'invalid',
              companyData: companyResult.raw_data,
              registeredAddress: companyResult.registeredAddress,
              businessType: companyResult.businessType,
              registrationDate: companyResult.registrationDate,
              status: companyResult.status,
              companyNumber: companyResult.registryId || undefined,
              directorNames: companyResult.directors,
              sic_codes: companyResult.sic_codes,
              verificationDate: new Date(),
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              metadata: {
                confidence: companyResult.confidence,
              },
            });
          }
        }

        results.push({
          employer: employer.companyName,
          ...result,
        });
      } catch (error) {
        logger.error({ error, employer }, 'Error in bulk verification');
        results.push({
          employer: employer.companyName,
          status: 'error',
          message: 'Error during verification',
        });
      }
    }

    res.json({
      success: true,
      results,
      totalProcessed: body.employers.length,
      successCount: results.filter((r) => r.status !== 'error').length,
    });
  })
);

// --- Employer Portal Routes ---

// Get current user's company
router.get(
  "/company",
  requireEmployer,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });
    res.json(company || null);
  })
);

// Create/Update company
router.post(
  "/company",
  requireEmployer,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = insertCompanySchema.parse(req.body);

    // Check if exists
    const existing = await db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    let company;
    if (existing) {
      const [updated] = await db
        .update(companies)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(companies.id, existing.id))
        .returning();
      company = updated;
    } else {
      const [created] = await db
        .insert(companies)
        .values({ ...body, userId })
        .returning();
      company = created;
    }

    res.json(company);
  })
);

// List my jobs
router.get(
  "/jobs",
  requireEmployer,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Get company first
    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    if (!company) return res.json([]);

    const myJobs = await db.query.jobs.findMany({
      where: eq(jobs.companyId, company.id),
      orderBy: [desc(jobs.createdAt)],
    });

    res.json(myJobs);
  })
);

// Post a job
router.post(
  "/jobs",
  requireEmployer,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = insertJobSchema.parse(req.body);

    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    if (!company) {
      throw new AppError(400, "You must create a company profile before posting jobs.");
    }

    const [job] = await db.insert(jobs).values({
      ...body,
      companyId: company.id,
      status: "active"
    }).returning();

    res.json(job);
  })
);

// Delete/Close a job
router.delete(
  "/jobs/:id",
  requireEmployer,
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, userId),
    });

    if (!company) throw new AppError(404, "Company not found");

    const [deleted] = await db
      .delete(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.companyId, company.id)))
      .returning();

    if (!deleted) throw new AppError(404, "Job not found");

    res.json({ message: "Job deleted" });
  })
);

export default router;
