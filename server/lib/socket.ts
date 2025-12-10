<<<<<<< HEAD
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "../db";
import { messages } from "@shared/schema";
import { verifyAccessToken } from "./auth";
import { logger } from "./logger";
import { eq } from "drizzle-orm";

interface MessagePayload {
  content: string;
  receiverId: string;
  applicationId?: string;
}

interface SocketUser {
  id: string; // matches users.id
  email: string;
  role: "admin" | "lawyer" | "applicant";
}

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5000"],
      credentials: true,
    },
  });

  // Middleware: authenticate socket connection via JWT token
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    try {
      const token = (socket.handshake.auth && (socket.handshake.auth as any).token) as string;
      if (!token) return next(new Error("Authentication token required"));

      const payload = await verifyAccessToken(token);
      if (!payload) return next(new Error("Invalid or expired token"));

      socket.data.user = payload;
      return next();
    } catch (err) {
      return next(err as any);
    }
  });

  // In-memory room mapping: userId -> socketId set
  const userSockets = new Map<string, Set<string>>();

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    const userId = user.id;

    logger.info({ userId, socketId: socket.id }, "Socket.IO client connected");

    // Track user's sockets
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Join user room (e.g., for private notifications)
    socket.join(`user:${userId}`);

    // Send greeting
    socket.emit("connect:success", { message: "Connected to messaging server", userId });

    // Handle incoming messages
    socket.on("message:send", async (payload: MessagePayload, ack?: (res: any) => void) => {
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

        logger.info({ messageId: savedMessage.id, senderId: userId, receiverId }, "Message persisted");

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
        await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
      } catch (err) {
        logger.error({ err, messageId }, "Failed to mark message as read");
      }
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logger.info({ userId, socketId: socket.id }, "Socket.IO client disconnected");
    });
  });

  return io;
}

export type SocketIOInstance = ReturnType<typeof setupSocketIO>;
=======
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { db } from "../db";
import { messages } from "@shared/schema";
import { verifyAccessToken } from "./auth";
import { logger } from "./logger";
import { eq } from "drizzle-orm";

interface MessagePayload {
  content: string;
  receiverId: string;
  applicationId?: string;
}

interface SocketUser {
  id: string; // matches users.id
  email: string;
  role: "admin" | "lawyer" | "applicant";
}

export function setupSocketIO(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      // Allow origins from env (comma-separated) or APP_URL, with localhost fallback
      origin:
        process.env.ALLOWED_ORIGINS?.split(",") ||
        (process.env.APP_URL ? [process.env.APP_URL] : ["http://localhost:5000"]),
      credentials: true,
    },
  });

  // Middleware: authenticate socket connection via JWT token
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    try {
      const token = (socket.handshake.auth && (socket.handshake.auth as any).token) as string;
      if (!token) return next(new Error("Authentication token required"));

      const payload = await verifyAccessToken(token);
      if (!payload) return next(new Error("Invalid or expired token"));

      socket.data.user = payload;
      return next();
    } catch (err) {
      return next(err as any);
    }
  });

  // In-memory room mapping: userId -> socketId set
  const userSockets = new Map<string, Set<string>>();

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    const userId = user.id;

    logger.info({ userId, socketId: socket.id }, "Socket.IO client connected");

    // Track user's sockets
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Join user room (e.g., for private notifications)
    socket.join(`user:${userId}`);

    // Send greeting
    socket.emit("connect:success", { message: "Connected to messaging server", userId });

    // Handle incoming messages
    socket.on("message:send", async (payload: MessagePayload, ack?: (res: any) => void) => {
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

        logger.info({ messageId: savedMessage.id, senderId: userId, receiverId }, "Message persisted");

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
        await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
      } catch (err) {
        logger.error({ err, messageId }, "Failed to mark message as read");
      }
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logger.info({ userId, socketId: socket.id }, "Socket.IO client disconnected");
    });
  });

  return io;
}

export type SocketIOInstance = ReturnType<typeof setupSocketIO>;
>>>>>>> 17e86ff (Fix: add local uploads fallback, serve /uploads, widen Socket.IO CORS, add local AI provider support)
