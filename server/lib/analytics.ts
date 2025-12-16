import { db } from "../db";
import { users, documents, applications, consultations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
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
    // TODO: Implement event storage in database
    // For now, events are logged but can be extended to store in dedicated analytics table
  } catch (error) {
    logger.error({ error, event }, "Failed to track analytics event");
  }
}

// Get user analytics
export async function getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

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
    const baseAnalytics: UserAnalytics = {
      userId,
      totalDocumentsUploaded,
      totalConsultations,
      avgConsultationDuration,
      applicationsStarted,
      applicationsSubmitted,
      documentCompletionPercentage,
      lastActivityDate: user.updatedAt || new Date(),
      engagementScore: 0,
    };

    baseAnalytics.engagementScore = calculateEngagementScore(baseAnalytics);

    return baseAnalytics;
  } catch (error) {
    logger.error({ error, userId }, "Failed to get user analytics");
    return null;
  }
}

// Get lawyer metrics
export async function getLawyerMetrics(lawyerId: string): Promise<LawyerMetrics | null> {
  try {
    // TODO: Implement lawyer metrics calculation
    return null;
  } catch (error) {
    logger.error({ error, lawyerId }, "Failed to get lawyer metrics");
    return null;
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

// Get dashboard statistics
export async function getDashboardStats(userId: string) {
  try {
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
