import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, refreshTokens } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "change-me-in-production-refresh";
const JWT_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "lawyer" | "applicant";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch {
    return false;
  }
}

// JWT token generation
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "immigration-ai",
    audience: "immigration-ai-client",
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: "immigration-ai",
    audience: "immigration-ai-client",
  });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "immigration-ai",
      audience: "immigration-ai-client",
    }) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: "immigration-ai",
      audience: "immigration-ai-client",
    }) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

// Store refresh token in database
export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.insert(refreshTokens).values({
    userId,
    token,
    expiresAt,
    revoked: false,
  });
}

// Revoke refresh token
export async function revokeRefreshToken(token: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.token, token));
}

// Check if refresh token is valid
export async function isValidRefreshToken(token: string): Promise<boolean> {
  const tokenRecord = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, token),
      eq(refreshTokens.revoked, false),
      gt(refreshTokens.expiresAt, new Date())
    ),
  });
  return !!tokenRecord;
}

// Generate tokens for user
export async function generateTokens(userId: string): Promise<AuthTokens> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as "admin" | "lawyer" | "applicant",
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(userId);

  // Store refresh token
  await storeRefreshToken(userId, refreshToken);

  return { accessToken, refreshToken };
}

// Generate email verification token
export function generateEmailVerificationToken(): string {
  return randomBytes(32).toString("hex");
}

// Generate password reset token
export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}







