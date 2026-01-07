import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { messages, users } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { enqueueJob } from "../lib/queue";
import { logger } from "../lib/logger";

const router = Router();

// All routes require authentication
router.use(authenticate);

const createMessageSchema = z.object({
  receiverId: z.string().min(1, "Recipient ID required"),
  content: z.string().min(1, "Message content required").max(5000),
});

const updateMessageSchema = z.object({
  content: z.string().min(1, "Message content required").max(5000),
});

// Send message
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const senderId = req.user!.userId;
    const body = createMessageSchema.parse(req.body);

    if (body.receiverId === senderId) {
      return res.status(400).json({ message: "Cannot send message to yourself" });
    }

    // Verify recipient exists
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, body.receiverId),
    });

    if (!recipient) {
      throw new AppError(404, "Recipient not found");
    }

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        senderId,

        receiverId: body.receiverId,
        content: body.content,
        isRead: false,
      })
      .returning();

    // Queue email notification
    try {
      const sender = await db.query.users.findFirst({ where: eq(users.id, senderId) });
      await enqueueJob(senderId, "email", {
        to: recipient.email,
        subject: `New Message from ${sender?.firstName || "User"}`,
        html: `<div style="font-family: sans-serif;"><h2>New Message</h2><p>You have a new message from <strong>${sender?.firstName || "User"}</strong>:</p><blockquote style="border-left: 4px solid #eee; padding-left: 15px; font-style: italic;">${body.content.substring(0, 200)}${body.content.length > 200 ? '...' : ''}</blockquote><p>Log in to your dashboard to reply.</p></div>`,
      });
    } catch (error) {
      logger.warn({ error }, "Failed to queue message notification");
    }

    res.status(201).json(message);
  })
);

// Get conversation with a specific user
router.get(
  "/conversation/:userId",
  asyncHandler(async (req, res) => {
    const currentUserId = req.user!.userId;
    const { userId } = req.params;
    const { limit = "50", offset = "0" } = req.query;

    // Get all messages between the two users, ordered by creation date
    const conversationMessages = await db.query.messages.findMany({
      where: or(
        and(eq(messages.senderId, currentUserId), eq(messages.receiverId, userId)),
        and(eq(messages.senderId, userId), eq(messages.receiverId, currentUserId))
      ),
      orderBy: [desc(messages.createdAt)],
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
    });

    // Mark messages as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverId, currentUserId),
          eq(messages.senderId, userId)
        )
      );

    // Get user info
    const otherUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    res.json({
      user: otherUser
        ? {
          id: otherUser.id,
          email: otherUser.email,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
        }
        : null,
      messages: conversationMessages.reverse(),
    });
  })
);

// Get all conversations (list of users who have messages)
router.get(
  ["/", "/conversations"],
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const role = (req.user as any).role; // Safe cast
    const { limit, offset } = req.query;
    const limitVal = parseInt((limit as string) || "50", 10);
    const offsetVal = parseInt((offset as string) || "0", 10);

    // Get unique users we have conversations with
    const userMessages = await db.query.messages.findMany({
      where: or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      ),
      orderBy: [desc(messages.createdAt)],
      limit: isNaN(limitVal) ? 50 : limitVal,
    });


    // Get unique user IDs
    const uniqueUserIds = Array.from(
      new Set(
        userMessages.map((m) =>
          m.senderId === userId ? m.receiverId : m.senderId
        )
      )
    );

    // Get user details
    const conversationUsers = await Promise.all(
      Array.from(uniqueUserIds).map(async (id) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, id),
        });

        if (!user) return null;

        // Get last message
        const lastMessage = userMessages.find(
          (m) =>
            (m.senderId === userId && m.receiverId === id) ||
            (m.senderId === id && m.receiverId === userId)
        );

        // Get unread count
        const unreadCount = userMessages.filter(
          (m) => m.receiverId === userId && m.senderId === id && !m.isRead
        ).length;

        return {
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastMessage: lastMessage?.content.substring(0, 50) || "Start a conversation",
          lastMessageTime: lastMessage?.createdAt || null,
          unreadCount,
        };
      })
    );

    res.json({
      conversations: conversationUsers.filter((c) => c !== null),
    });
  })
);

// Get unread message count
router.get(
  "/unread/count",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const unreadCount = await db.query.messages.findMany({
      where: and(eq(messages.receiverId, userId), eq(messages.isRead, false)),
    });

    res.json({
      unreadCount: unreadCount.length,
    });
  })
);

// Mark message as read
router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });

    if (!message) {
      throw new AppError(404, "Message not found");
    }

    // Only recipient can mark as read
    if (message.receiverId !== userId) {
      throw new AppError(403, "Access denied");
    }

    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));

    res.json({ message: "Message marked as read" });
  })
);

// Delete message
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });

    if (!message) {
      throw new AppError(404, "Message not found");
    }

    // Only sender or recipient can delete
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new AppError(403, "Access denied");
    }

    await db.delete(messages).where(eq(messages.id, id));

    res.json({ message: "Message deleted" });
  })
);

// Edit message
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { content } = updateMessageSchema.parse(req.body);

    const message = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });

    if (!message) {
      throw new AppError(404, "Message not found");
    }

    // Only sender can edit
    if (message.senderId !== userId) {
      throw new AppError(403, "Access denied");
    }

    const [updatedMessage] = await db
      .update(messages)
      .set({ content, isRead: false }) // Mark as unread so recipient sees update? or keep read status?
      .where(eq(messages.id, id))
      .returning();

    res.json(updatedMessage);
  })
);

// Clear conversation
router.delete(
  "/conversation/:otherUserId",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { otherUserId } = req.params;

    // Delete all messages between these two users
    await db.delete(messages).where(
      or(
        and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
        and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
      )
    );

    res.json({ message: "Conversation cleared" });
  })
);

export default router;
