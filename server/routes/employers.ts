import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../db';
import { employerVerifications, employerDirectory } from '@shared/schema';
import {
  verifyEmployer,
  searchEmployersMultiRegistry,
  getRegistriesInfo,
  CompanySearchParams,
} from '../lib/employer-verification';
import { logger } from '../lib/logger';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

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

    // Verify employer with timeout protection
    let result;
    try {
      result = await Promise.race([
        verifyEmployer(params),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Verification timeout')), 30000)
        ),
      ]) as any;
    } catch (apiError) {
      logger.error({ apiError, params }, "Employer verification API failed or timed out");
      // Return empty results instead of crashing
      return res.json({
        results: [],
        message: "External verification service unavailable",
        found: false
      });
    }

    // Save verification record to database
    if (result && result.results && Array.isArray(result.results) && result.results.length > 0) {
      for (const companyResult of result.results) {
        try {
          // Log the data we are about to insert for debugging
          // logger.debug({ companyResult }, "Inserting company verification record");

          await db.insert(employerVerifications).values({
            userId,
            applicationId: body.applicationId || null,
            companyName: companyResult.companyName || "Unknown",
            country: companyResult.country || "GB",
            registryType: companyResult.registryType || "unknown",
            registryId: companyResult.registryId, // Allow null as per schema
            verificationStatus: companyResult.found ? 'verified' : 'invalid',
            companyData: companyResult.raw_data || {},
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
                eq(employerDirectory.registryType, companyResult.registryType || 'unknown')
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
          } else if (companyResult.found && companyResult.registryId) {
            // Only addTo directory if found and has ID
            await db.insert(employerDirectory).values({
              companyName: companyResult.companyName || "Unknown",
              country: companyResult.country || "GB",
              registryType: companyResult.registryType || "unknown",
              registryId: companyResult.registryId,
              companyData: companyResult.raw_data || {},
              status: companyResult.status,
              lastVerifiedAt: new Date(),
              verificationsCount: 1,
            });
          }
        } catch (error) {
          logger.error({ error, company: companyResult.companyName }, 'Error saving verification record to DB - continuing');
          // Do not rethrow - we want to return the API result even if save fails
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

export default router;
