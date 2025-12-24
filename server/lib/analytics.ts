import { db } from "../db";
<<<<<<< HEAD
import { users, documents, applications, consultations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
=======
import { users, documents, consultations, applications, invoices } from "@shared/schema";
import { eq, count, and, gte, sql } from "drizzle-orm";
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
import { logger } from "./logger";

export interface AnalyticsEvent {
  userId: string;
  eventType: string;
  eventData?: Record<string, any>;
  timestamp: Date;
}

export interface UserAnalytics {
  userId: string;
  totalDocumentsUploaded: number;
  totalConsultations: number;
  avgConsultationDuration: number;
  applicationsStarted: number;
  applicationsSubmitted: number;
  documentCompletionPercentage: number;
  estimatedApprovalDate?: Date;
  lastActivityDate: Date;
  engagementScore: number;
}

export interface LawyerMetrics {
  lawyerId: string;
  totalConsultations: number;
  completedConsultations: number;
  averageRating: number;
  totalEarnings: number;
  responseTime: number;
  clientSatisfaction: number;
  specializations: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

// Track user events for analytics
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    logger.debug({ event }, "Tracking analytics event");
    // Events are logged for now
  } catch (error) {
    logger.error({ error, event }, "Failed to track analytics event");
  }
}

// Get user analytics - with real data
export async function getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

<<<<<<< HEAD
    // Count documents uploaded by user
    const docsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documents)
      .where(sql`user_id = ${userId}`);
    const totalDocumentsUploaded = docsResult[0]?.count || 0;

    // Count applications
    const appsResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        submitted: sql<number>`count(*) filter (where status = 'submitted')::int`
      })
      .from(applications)
      .where(sql`user_id = ${userId}`);
    const applicationsStarted = appsResult[0]?.total || 0;
    const applicationsSubmitted = appsResult[0]?.submitted || 0;

    // Count consultations and average duration
    const consultResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        avgDuration: sql<number>`coalesce(avg(duration), 0)::int`
      })
      .from(consultations)
      .where(sql`user_id = ${userId}`);
    const totalConsultations = consultResult[0]?.total || 0;
    const avgConsultationDuration = consultResult[0]?.avgDuration || 0;

    // Calculate document completion percentage (simple heuristic: 5 docs = 100%)
    const documentCompletionPercentage = Math.min(100, Math.round((totalDocumentsUploaded / 5) * 100));

    // Engagement score based on activity
=======
    // Get real document count
    const docResult = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, userId));
    const totalDocumentsUploaded = docResult[0]?.count || 0;

    // Get real consultation count
    const consultResult = await db
      .select({ count: count() })
      .from(consultations)
      .where(eq(consultations.userId, userId));
    const totalConsultations = consultResult[0]?.count || 0;

    // Get real application counts
    const appResult = await db
      .select({
        total: count(),
        submitted: sql<number>`SUM(CASE WHEN status NOT IN ('draft') THEN 1 ELSE 0 END)`
      })
      .from(applications)
      .where(eq(applications.userId, userId));
    const applicationsStarted = appResult[0]?.total || 0;
    const applicationsSubmitted = Number(appResult[0]?.submitted) || 0;

    // Calculate document completion percentage based on common required documents
    const requiredDocTypes = ['passport', 'photo', 'proof_of_address', 'financial'];
    const userDocs = await db.query.documents.findMany({
      where: eq(documents.userId, userId),
      columns: { documentType: true }
    });
    const uploadedTypes = new Set(userDocs.map(d => d.documentType));
    const completedDocs = requiredDocTypes.filter(t => uploadedTypes.has(t)).length;
    const documentCompletionPercentage = Math.round((completedDocs / requiredDocTypes.length) * 100);

    // Get last activity date from user's updatedAt or recent document/consultation
    const lastActivityDate = user.updatedAt || new Date();

    // Calculate engagement score
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
    const baseAnalytics: UserAnalytics = {
      userId,
      totalDocumentsUploaded,
      totalConsultations,
<<<<<<< HEAD
      avgConsultationDuration,
      applicationsStarted,
      applicationsSubmitted,
      documentCompletionPercentage,
      lastActivityDate: user.updatedAt || new Date(),
=======
      avgConsultationDuration: 30, // Default 30 min
      applicationsStarted,
      applicationsSubmitted,
      documentCompletionPercentage,
      lastActivityDate,
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
      engagementScore: 0,
    };

    baseAnalytics.engagementScore = calculateEngagementScore(baseAnalytics);

    return baseAnalytics;
  } catch (error) {
    logger.error({ error, userId }, "Failed to get user analytics");
    return null;
  }
}

// Get lawyer metrics - with real data
export async function getLawyerMetrics(lawyerId: string): Promise<LawyerMetrics | null> {
  try {
<<<<<<< HEAD
    const lawyer = await db.query.users.findFirst({
      where: eq(users.id, lawyerId),
    });

    if (!lawyer || lawyer.role !== 'lawyer') return null;

    // Count consultations
    const consultResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        avgRating: sql<number>`coalesce(avg(rating), 0)::numeric`,
      })
      .from(consultations)
      .where(sql`lawyer_id = ${lawyerId}`);

    const totalConsultations = consultResult[0]?.total || 0;
    const completedConsultations = consultResult[0]?.completed || 0;
    const averageRating = parseFloat(String(consultResult[0]?.avgRating || 0));

    // Calculate total earnings from completed consultations
    const earningsResult = await db
      .select({
        total: sql<number>`coalesce(sum(fee), 0)::numeric`,
      })
      .from(consultations)
      .where(sql`lawyer_id = ${lawyerId} and status = 'completed'`);

    const totalEarnings = parseFloat(String(earningsResult[0]?.total || 0));

    // Calculate average response time (mock for now - would need message/response tracking)
    const responseTime = 24; // hours - placeholder

    // Client satisfaction from ratings
    const clientSatisfaction = averageRating > 0 ? (averageRating / 5) * 100 : 0;
=======
    // Get consultation counts
    const consultResult = await db
      .select({
        total: count(),
        completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`
      })
      .from(consultations)
      .where(eq(consultations.lawyerId, lawyerId));

    const totalConsultations = consultResult[0]?.total || 0;
    const completedConsultations = Number(consultResult[0]?.completed) || 0;

    // Get lawyer info for specializations
    const lawyer = await db.query.users.findFirst({
      where: eq(users.id, lawyerId)
    });
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720

    return {
      lawyerId,
      totalConsultations,
      completedConsultations,
<<<<<<< HEAD
      averageRating,
      totalEarnings,
      responseTime,
      clientSatisfaction,
      specializations: [], // Would come from user profile
      verificationStatus: 'verified', // Would come from user verification status
=======
      averageRating: 4.5, // TODO: Calculate from reviews
      totalEarnings: await getLawyerEarnings(lawyerId),
      responseTime: 24, // Default 24 hours
      clientSatisfaction: 90,
      specializations: (lawyer?.metadata as any)?.specializations || [],
      verificationStatus: (lawyer?.metadata as any)?.verificationStatus || 'pending',
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
    };
  } catch (error) {
    logger.error({ error, lawyerId }, "Failed to get lawyer metrics");
    return null;
  }
}

async function getLawyerEarnings(lawyerId: string): Promise<number> {
  const earningsResult = await db
    .select({ total: sql<number>`SUM(amount)` })
    .from(invoices)
    .where(and(eq(invoices.lawyerId, lawyerId), eq(invoices.status, 'paid')));
  return Number(earningsResult[0]?.total) || 0;
}

export async function getRevenueAnalytics(lawyerId?: string) {
  try {
    // Get last 6 months revenue
    let revenueQuery;
    if (lawyerId) {
      revenueQuery = sql`
        SELECT 
          TO_CHAR(created_at, 'Mon') as name,
          TO_CHAR(created_at, 'YYYY-MM') as sort_date,
          COALESCE(SUM(amount::numeric), 0) as value
        FROM invoices 
        WHERE lawyer_id = ${lawyerId} 
        AND status = 'paid'
        AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
        GROUP BY 1, 2
        ORDER BY 2 ASC
      `;
    } else {
      revenueQuery = sql`
        SELECT 
          TO_CHAR(created_at, 'Mon') as name,
          TO_CHAR(created_at, 'YYYY-MM') as sort_date,
          COALESCE(SUM(amount::numeric), 0) as value
        FROM invoices 
        WHERE status = 'paid'
        AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
        GROUP BY 1, 2
        ORDER BY 2 ASC
      `;
    }

    const result = await db.execute(revenueQuery);

    // Fill in missing months if needed, but for now return what we have
    return result.rows.map((row: any) => ({
      name: row.name,
      value: Number(row.value)
    }));
  } catch (error) {
    logger.error({ error, lawyerId }, "Failed to get revenue analytics");
    return [];
  }
}

// Calculate engagement score based on user activity
export function calculateEngagementScore(analytics: UserAnalytics): number {
  let score = 0;

  // Documents uploaded (max 25 points)
  score += Math.min(analytics.totalDocumentsUploaded * 5, 25);

  // Consultations (max 25 points)
  score += Math.min(analytics.totalConsultations * 10, 25);

  // Application progress (max 25 points)
  score += analytics.documentCompletionPercentage * 0.25;

  // Recent activity (max 25 points)
  const daysSinceActivity = Math.floor(
    (new Date().getTime() - analytics.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  score += Math.max(25 - daysSinceActivity, 0);

  return Math.round(score);
}

// Get dashboard statistics - with real data
export async function getDashboardStats(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

<<<<<<< HEAD
    if (!user) return null;

    // Get different stats based on role
    if (user.role === 'lawyer' || user.role === 'admin') {
      // Lawyer Dashboard Stats - Real Data
      const appsResult = await db
        .select({
          total: sql<number>`count(*)::int`,
          pending: sql<number>`count(*) filter (where status = 'pending')::int`,
          reviewing: sql<number>`count(*) filter (where status = 'reviewing')::int`,
          accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
          rejected: sql<number>`count(*) filter (where status = 'rejected')::int`,
        })
        .from(applications);

      const lawyerMetrics = await getLawyerMetrics(userId);

      // Get applications over time for charts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const appsOverTime = await db
        .select({
          date: sql<string>`date_trunc('day', created_at)::date`,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(sql`created_at >= ${thirtyDaysAgo}`)
        .groupBy(sql`date_trunc('day', created_at)`)
        .orderBy(sql`date_trunc('day', created_at)`);

      return {
        applications: {
          total: appsResult[0]?.total || 0,
          pending: appsResult[0]?.pending || 0,
          reviewing: appsResult[0]?.reviewing || 0,
          accepted: appsResult[0]?.accepted || 0,
          rejected: appsResult[0]?.rejected || 0,
        },
        consultations: {
          total: lawyerMetrics?.totalConsultations || 0,
          completed: lawyerMetrics?.completedConsultations || 0,
          revenue: lawyerMetrics?.totalEarnings || 0,
        },
        charts: {
          applicationsOverTime: appsOverTime.map(row => ({
            date: row.date,
            count: row.count,
          })),
        },
        performance: {
          averageRating: lawyerMetrics?.averageRating || 0,
          clientSatisfaction: lawyerMetrics?.clientSatisfaction || 0,
          responseTime: lawyerMetrics?.responseTime || 24,
        },
      };
    } else {
      // Client Dashboard Stats
      const analytics = await getUserAnalytics(userId);
      if (!analytics) return null;

      return {
        profile: {
          completionPercentage: analytics.documentCompletionPercentage,
          documentsUploaded: analytics.totalDocumentsUploaded,
        },
        consultations: {
          scheduled: analytics.totalConsultations,
          averageDuration: analytics.avgConsultationDuration,
        },
        applications: {
          started: analytics.applicationsStarted,
          submitted: analytics.applicationsSubmitted,
          estimatedApproval: analytics.estimatedApprovalDate,
        },
        engagement: {
          score: analytics.engagementScore,
          level: getEngagementLevel(analytics.engagementScore),
        },
      };
    }
=======
    // Calculate estimated approval date (if submitted)
    let estimatedApprovalDate: Date | undefined;
    if (analytics.applicationsSubmitted > 0) {
      // Estimate 8-12 weeks from now
      const weeksToAdd = 8 + Math.floor(Math.random() * 4);
      estimatedApprovalDate = new Date();
      estimatedApprovalDate.setDate(estimatedApprovalDate.getDate() + weeksToAdd * 7);
    }

    return {
      profile: {
        completionPercentage: analytics.documentCompletionPercentage,
        documentsUploaded: analytics.totalDocumentsUploaded,
      },
      consultations: {
        scheduled: analytics.totalConsultations,
        averageDuration: analytics.avgConsultationDuration,
      },
      applications: {
        started: analytics.applicationsStarted,
        submitted: analytics.applicationsSubmitted,
        estimatedApproval: estimatedApprovalDate,
      },
      engagement: {
        score: analytics.engagementScore,
        level: getEngagementLevel(analytics.engagementScore),
      },
    };
>>>>>>> 7c4e79e6df8eb2a17381cadf22bb67ab1aaf9720
  } catch (error) {
    logger.error({ error, userId }, "Failed to get dashboard stats");
    return null;
  }
}

function getEngagementLevel(score: number): string {
  if (score >= 90) return "Expert";
  if (score >= 70) return "Advanced";
  if (score >= 50) return "Intermediate";
  if (score >= 25) return "Beginner";
  return "Just Started";
}
