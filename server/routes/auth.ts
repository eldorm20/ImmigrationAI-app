import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendEmail, generatePasswordResetEmail } from "../lib/email";
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  isValidRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} from "../lib/auth";
import { authenticate } from "../middleware/auth";
import { authLimiter, normalizeEmail, sanitizeInput } from "../middleware/security";
import { asyncHandler } from "../middleware/errorHandler";
import { auditLog, logger } from "../lib/logger";
import { emailQueue } from "../lib/queue";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  role: z.enum(["applicant", "lawyer"]).default("applicant"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// Register
router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await hashPassword(body.password);

    // Generate email verification token
    const verificationToken = generateEmailVerificationToken();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        hashedPassword,
        role: body.role,
        firstName: sanitizeInput(body.firstName || ""),
        lastName: sanitizeInput(body.lastName || ""),
        phone: body.phone ? sanitizeInput(body.phone) : null,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      })
      .returning();

    // Generate tokens
    const tokens = await generateTokens(newUser.id);

    await auditLog(newUser.id, "user.register", "user", newUser.id, {}, req);

    logger.info({ userId: newUser.id, email }, "User registered");

    // Optionally queue verification email (best-effort)
    try {
      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;
      const html = `Please verify your email by visiting: <a href="${verificationUrl}">${verificationUrl}</a>`;
      await emailQueue.add({ to: newUser.email, subject: "Verify your ImmigrationAI account", html });
    } catch (err) {
      logger.error({ error: err }, "Failed to queue verification email");
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email.",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.emailVerified,
      },
      ...tokens,
    });
  })
);

// Login
router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      await auditLog(null, "user.login_failed", "user", null, { email }, req);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Verify password
    const isValid = await verifyPassword(user.hashedPassword, body.password);
    if (!isValid) {
      await auditLog(null, "user.login_failed", "user", user.id, {}, req);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate tokens
    const tokens = await generateTokens(user.id);

    await auditLog(user.id, "user.login", "user", user.id, {}, req);

    logger.info({ userId: user.id, email }, "User logged in");

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    });
  })
);

// Refresh token
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const body = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(body.refreshToken);
    if (!payload) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Check if token is valid in database
    const isValid = await isValidRefreshToken(body.refreshToken);
    if (!isValid) {
      return res.status(401).json({ message: "Refresh token expired or revoked" });
    }

    // Revoke old token
    await revokeRefreshToken(body.refreshToken);

    // Generate new tokens
    const tokens = await generateTokens((payload as any).userId);

    res.json(tokens);
  })
);

// Logout
router.post(
  "/logout",
  authenticate,
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    await auditLog(req.user!.userId, "user.logout", "user", req.user!.userId, {}, req);

    res.json({ message: "Logged out successfully" });
  })
);

// Get current user
router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  })
);

// Verify email
router.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = z.object({ token: z.string() }).parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });

    if (!user || !user.emailVerificationExpires) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ message: "Verification token expired" });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where(eq(users.id, user.id));

    await auditLog(user.id, "user.email_verified", "user", user.id, {}, req);

    res.json({ message: "Email verified successfully" });
  })
);

// Forgot password
router.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);
    const email = normalizeEmail(body.email);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.json({ message: "If the email exists, a reset link has been sent" });
    }

    const resetToken = generatePasswordResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      })
      .where(eq(users.id, user.id));

    // Queue email send
    const appUrl = process.env.APP_URL || "http://localhost:5000";
    const html = generatePasswordResetEmail(resetToken, appUrl);

    try {
      await emailQueue.add({
        to: user.email,
        subject: "Password Reset Request - ImmigrationAI",
        html,
      });
    } catch (err) {
      logger.error({ error: err }, "Failed to queue password reset email");
    }

    await auditLog(user.id, "user.password_reset_requested", "user", user.id, {}, req);
    logger.info({ userId: user.id, email }, "Password reset requested");

    res.json({ message: "If the email exists, a reset link has been sent" });
  })
);

// Reset password
router.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.passwordResetToken, body.token),
    });

    if (!user || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (new Date() > user.passwordResetExpires) {
      return res.status(400).json({ message: "Reset token expired" });
    }

    const hashedPassword = await hashPassword(body.newPassword);

    await db
      .update(users)
      .set({
        hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      })
      .where(eq(users.id, user.id));

    await auditLog(user.id, "user.password_reset", "user", user.id, {}, req);

    res.json({ message: "Password reset successfully" });
  })
);

export default router;







