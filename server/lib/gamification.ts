import { logger } from "./logger";

export interface Gamification {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
}

export interface UserAchievement {
  userId: string;
  badgeId: string;
  unlockedAt: Date;
  progress: number; // percentage to next tier
}

export interface Leaderboard {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  achievements: number;
  level: string;
}

// Available badges
const BADGES: Record<string, Gamification> = {
  "first_document": {
    badgeId: "first_document",
    name: "Document Pioneer",
    description: "Upload your first document",
    icon: "📄",
    requirement: "Upload 1 document",
  },
  "five_documents": {
    badgeId: "five_documents",
    name: "Document Master",
    description: "Upload 5 documents",
    icon: "📚",
    requirement: "Upload 5 documents",
  },
  "first_consultation": {
    badgeId: "first_consultation",
    name: "Consultation Starter",
    description: "Book your first consultation",
    icon: "👨‍⚖️",
    requirement: "Book 1 consultation",
  },
  "five_consultations": {
    badgeId: "five_consultations",
    name: "Consultation Expert",
    description: "Complete 5 consultations",
    icon: "👨‍⚖️💎",
    requirement: "Complete 5 consultations",
  },
  "complete_profile": {
    badgeId: "complete_profile",
    name: "Profile Complete",
    description: "Fill out your entire profile",
    icon: "✅",
    requirement: "100% profile completion",
  },
  "visa_submitted": {
    badgeId: "visa_submitted",
    name: "Application Submitted",
    description: "Submit your first visa application",
    icon: "✈️",
    requirement: "Submit 1 application",
  },
  "community_helper": {
    badgeId: "community_helper",
    name: "Community Helper",
    description: "Help 5 community members",
    icon: "🤝",
    requirement: "Help 5 members",
  },
  "speedster": {
    badgeId: "speedster",
    name: "Fast Tracker",
    description: "Complete application process in under 30 days",
    icon: "⚡",
    requirement: "30-day completion",
  },
  "translator": {
    badgeId: "translator",
    name: "Language Master",
    description: "Use the app in 3 different languages",
    icon: "🌐",
    requirement: "Use 3 languages",
  },
};

// Get all available badges
export function getAllBadges(): Gamification[] {
  return Object.values(BADGES);
}

// Get badge by ID
export function getBadge(badgeId: string): Gamification | null {
  return BADGES[badgeId] || null;
}

// Calculate user level based on achievements
export function calculateUserLevel(achievementCount: number): string {
  if (achievementCount >= 9) return "Master";
  if (achievementCount >= 7) return "Expert";
  if (achievementCount >= 5) return "Advanced";
  if (achievementCount >= 3) return "Intermediate";
  if (achievementCount >= 1) return "Beginner";
  return "Newcomer";
}

// Calculate points for activities
export function calculateActivityPoints(activity: string, metadata?: Record<string, any>): number {
  const points: Record<string, number> = {
    "document_upload": 10,
    "document_analysis": 15,
    "consultation_scheduled": 20,
    "consultation_completed": 30,
    "application_started": 25,
    "application_submitted": 100,
    "profile_updated": 5,
    "profile_completed": 50,
    "community_post": 15,
    "community_answer": 25,
    "community_helpful_answer": 50,
    "referral_success": 100,
  };

  return points[activity] || 0;
}

// Check achievement unlock
export function checkAchievementUnlock(
  activity: string,
  userStats: Record<string, number>
): string | null {
  const achievementTriggers: Record<string, (stats: Record<string, number>) => boolean> = {
    "first_document": (s) => s.documentsUploaded >= 1,
    "five_documents": (s) => s.documentsUploaded >= 5,
    "first_consultation": (s) => s.consultationsBooked >= 1,
    "five_consultations": (s) => s.consultationsCompleted >= 5,
    "complete_profile": (s) => s.profileCompletion >= 100,
    "visa_submitted": (s) => s.applicationsSubmitted >= 1,
    "community_helper": (s) => s.communityHelpCount >= 5,
    "speedster": (s) => s.daysSinceStart <= 30 && s.applicationsSubmitted >= 1,
    "translator": (s) => s.languagesUsed >= 3,
  };

  for (const [badgeId, trigger] of Object.entries(achievementTriggers)) {
    if (trigger(userStats)) {
      return badgeId;
    }
  }

  return null;
}

// Get user's achievement progress
export function getAchievementProgress(
  userStats: Record<string, number>
): Array<{ badgeId: string; progress: number; unlocked: boolean }> {
  const progressMap = [
    { badgeId: "first_document", current: userStats.documentsUploaded, target: 1 },
    { badgeId: "five_documents", current: userStats.documentsUploaded, target: 5 },
    { badgeId: "first_consultation", current: userStats.consultationsBooked, target: 1 },
    { badgeId: "five_consultations", current: userStats.consultationsCompleted, target: 5 },
    { badgeId: "complete_profile", current: userStats.profileCompletion, target: 100 },
    { badgeId: "visa_submitted", current: userStats.applicationsSubmitted, target: 1 },
    { badgeId: "community_helper", current: userStats.communityHelpCount, target: 5 },
  ];

  return progressMap.map(({ badgeId, current, target }) => ({
    badgeId,
    progress: Math.min((current / target) * 100, 100),
    unlocked: current >= target,
  }));
}

// Calculate referral rewards
export function calculateReferralRewards(
  referralType: string,
  count: number
): { points: number; tier: string } {
  const baseReward = 100; // Points per successful referral
  let multiplier = 1;

  if (count >= 10) multiplier = 2.0; // Gold tier
  else if (count >= 5) multiplier = 1.5; // Silver tier
  else if (count >= 2) multiplier = 1.25; // Bronze tier

  return {
    points: Math.round(baseReward * count * multiplier),
    tier: multiplier >= 2.0 ? "Gold" : multiplier >= 1.5 ? "Silver" : multiplier >= 1.25 ? "Bronze" : "Standard",
  };
}

// Get leaderboard
export function getLeaderboard(
  users: Array<{ userId: string; userName: string; points: number; achievements: number }>
): Leaderboard[] {
  return users
    .sort((a, b) => b.points - a.points)
    .map((user, index) => ({
      rank: index + 1,
      userId: user.userId,
      userName: user.userName,
      score: user.points,
      achievements: user.achievements,
      level: calculateUserLevel(user.achievements),
    }));
}

// Generate achievement notification
export function getAchievementNotification(badgeId: string): string {
  const badge = getBadge(badgeId);
  if (!badge) return "";
  return `🎉 Congratulations! You unlocked the "${badge.name}" badge! ${badge.icon}`;
}
