import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "../db";
import { messages } from "@shared/schema";
import { verifyAccessToken } from "./auth";
import { logger } from "./logger";

interface MessagePayload {
  content: string;
  receiverId: string;
  applicationId?: string;
}

interface SocketUser {
  userId: string;
  email: string;
  role: "admin" | "lawyer" | "applicant";
}

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "http://localhost:5000",
      credentials: true,
    },
  });

  // Middleware: authenticate socket connection via JWT token
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return next(new Error("Invalid or expired token"));
    }

    (socket.data as any).user = payload;
    next();
  });

  // In-memory room mapping: userId -> socketId
  const userSockets = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    const user = (socket.data as any).user as SocketUser;
    const userId = user.userId;

    logger.info({ userId, socketId: socket.id }, "Socket.IO client connected");

    // Track user's sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)?.add(socket.id);

    // Join user room (e.g., for private notifications)
    socket.join(`user:${userId}`);

    // Send greeting
    socket.emit("connect:success", { message: "Connected to messaging server", userId });

    // Handle incoming messages
    socket.on("message:send", async (payload: MessagePayload, ack) => {
      try {
        const { content, receiverId, applicationId } = payload;

        if (!content || !receiverId) {
          return ack?.({ success: false, error: "Missing content or receiverId" });
        }

        // Persist message to database
        const [savedMessage] = await db
          .insert(messages)
          .values({
            senderId: userId,
            receiverId,
            applicationId: applicationId || null,
            content,
            isRead: false,
          })
          .returning();

        logger.info(
          { messageId: savedMessage.id, senderId: userId, receiverId },
          "Message persisted"
        );

        // Emit to receiver's connected sockets (if they're online)
        const receiverSockets = userSockets.get(receiverId);
        if (receiverSockets && receiverSockets.size > 0) {
          io.to(`user:${receiverId}`).emit("message:received", {
            id: savedMessage.id,
            content,
            senderId: userId,
            receiverId,
            applicationId,
            timestamp: savedMessage.createdAt,
            isRead: false,
          });
        }

        ack?.({ success: true, messageId: savedMessage.id });
      } catch (err) {
        logger.error({ err, payload }, "Failed to send message");
        ack?.({ success: false, error: "Failed to send message" });
      }
    });

    // Handle message read status
    socket.on("message:mark-read", async (messageId: string) => {
      try {
        await db
          .update(messages)
          .set({ isRead: true })
          .where((m) => m.id === messageId);
      } catch (err) {
        logger.error({ err, messageId }, "Failed to mark message as read");
      }
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      logger.info({ userId, socketId: socket.id }, "Socket.IO client disconnected");
    });
  });

  return io;
}

export type SocketIOInstance = ReturnType<typeof setupSocketIO>;
