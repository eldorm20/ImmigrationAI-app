import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { messages, users } from "@shared/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { emailQueue } from "../lib/queue";
import { logger } from "../lib/logger";

const router = Router();

// All routes require authentication
router.use(authenticate);

const createMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID required"),
  content: z.string().min(1, "Message content required").max(5000),
});

// Send message
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const senderId = req.user!.userId;
    const body = createMessageSchema.parse(req.body);

    // Verify recipient exists
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, body.recipientId),
    });

    if (!recipient) {
      throw new AppError(404, "Recipient not found");
    }

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        senderId,
        receiverId: body.recipientId, // Fixed: recipientId -> receiverId
        content: body.content,
        isRead: false,
      })
      .returning();

    // Queue email notification
    try {
      const sender = await db.query.users.findFirst({ where: eq(users.id, senderId) });
      await emailQueue.add("send_message_notification", {
        recipientEmail: recipient.email,
        senderName: sender?.firstName || sender?.email || "User",
        messagePreview: body.content.substring(0, 100),
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
  "/",
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

    // Get unique user IDs from history
    const uniqueUserIds = new Set<string>();
    userMessages.forEach((m) => {
      if (m.senderId === userId) uniqueUserIds.add(m.receiverId);
      else uniqueUserIds.add(m.senderId);
    });

    // If applicant, also fetch ALL lawyers to populate the list (so they can start chat)
    if (role === 'applicant') {
      const lawyers = await db.query.users.findMany({
        where: eq(users.role, 'lawyer')
      });
      lawyers.forEach(l => uniqueUserIds.add(l.id)); // Assuming l.id is string
    }

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

export default router;
