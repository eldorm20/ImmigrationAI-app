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
  // In production (Railway), allow all origins since the proxy strips headers
  // In dev, use configured origins or default
  const isProd = process.env.NODE_ENV === "production";

  logger.info({ env: process.env.NODE_ENV, isProd }, "Socket.IO initializing");

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Allow all origins in production to avoid CORS headaches with proxies
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["polling", "websocket"], // Standard fallback order: polling first, then upgrade
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Middleware: authenticate socket connection via JWT token
  io.use(async (socket: Socket, next: (err?: any) => void) => {
    try {
      let token = (socket.handshake.auth && (socket.handshake.auth as any).token) as string;

      // Fallback: Check Authorization header
      if (!token && socket.handshake.headers.authorization) {
        const parts = socket.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1];
        }
      }

      // Fallback: Check cookie (if HttpOnly cookie is used/proxied)
      if (!token && socket.handshake.headers.cookie) {
        // Simple cookie parse (or use 'cookie' library if available)
        const match = socket.handshake.headers.cookie.match(/accessToken=([^;]+)/);
        if (match) token = match[1];
      }

      if (!token) {
        logger.warn({ socketId: socket.id }, "Socket.IO connection attempt without token - allowing as Guest");
        return next();
      }

      const payload = await verifyAccessToken(token);
      if (!payload) {
        logger.warn({ socketId: socket.id, tokenPrefix: token.substring(0, 10) }, "Socket.IO token verification failed");
        // Force disconnect so client knows auth failed? 
        // Or allow as guest but fail messages? 
        // Better to fail connection so client can refresh token.
        return next(new Error("Authentication error"));
      }

      socket.data.user = payload as any;
      logger.info({ userId: (payload as any).id, socketId: socket.id }, "Socket.IO client authenticated");
      return next();
    } catch (err) {
      logger.error({ err, socketId: socket.id }, "Socket.IO authentication error");
      return next(new Error("Internal authentication error"));
    }
  });

  // In-memory room mapping: userId -> socketId set
  const userSockets = new Map<string, Set<string>>();
  // Map of user metadata for presence broadcasts
  const userMeta = new Map<string, { userName: string; email: string; role: string }>();

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as SocketUser | undefined;
    const userId = user?.id || `guest:${socket.id}`;

    logger.info({ userId, socketId: socket.id }, "Socket.IO client connected");

    // Track user's sockets
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Join user room (e.g., for private notifications)
    socket.join(`user:${userId}`);

    // Attempt to seed metadata for presence
    if (user && (user as any).email) {
      userMeta.set(userId, { userName: (user as any).email.split('@')[0], email: (user as any).email, role: (user as any).role });
    } else {
      // Guest connections are tracked but limited
      userMeta.set(userId, { userName: `guest_${socket.id.slice(0, 6)}`, email: "", role: "guest" });
    }

    // Send greeting
    socket.emit("connect:success", { message: "Connected to messaging server", userId });

    // Send current online users list to this socket
    const currentOnline = Array.from(userMeta.entries()).map(([id, meta]) => ({ userId: id, userName: meta.userName, role: meta.role, lastSeen: (meta as any).lastSeen || null }));
    socket.emit('online_users', currentOnline);

    // Handle incoming messages (support both server and frontend event names)
    const handleIncomingMessage = async (payload: MessagePayload, ack?: (res: any) => void) => {
      // If no authenticated user, check if we have fallback userId
      const effectiveUserId = user?.id || userId;
      if (!effectiveUserId || effectiveUserId.startsWith('guest:')) {
        logger.warn({ socketId: socket.id }, 'Message attempt without auth');
        return ack?.({ success: false, error: "Please sign in to send messages" });
      }
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

        // Ensure timestamp is a valid ISO string
        const createdAt = savedMessage.createdAt instanceof Date
          ? savedMessage.createdAt.toISOString()
          : (savedMessage.createdAt || new Date().toISOString());

        const payloadOut = {
          id: savedMessage.id,
          content,
          senderId: effectiveUserId,
          senderName: user?.email || 'User',
          receiverId,
          applicationId,
          timestamp: createdAt,
          isRead: false,
        };

        // Emit to receiver's connected sockets (if they're online) using both event names
        io.to(`user:${receiverId}`).emit('new_message', payloadOut);
        io.to(`user:${receiverId}`).emit('message:received', payloadOut);

        // Acknowledge back to sender with message_sent
        socket.emit('message_sent', payloadOut);

        ack?.({ success: true, messageId: savedMessage.id });
      } catch (err) {
        logger.error({ err, payload }, "Failed to send message");
        ack?.({ success: false, error: "Failed to send message" });
      }
    };

    socket.on('message:send', handleIncomingMessage as any);
    socket.on('send_message', handleIncomingMessage as any);

    // Handle message read status (support both names)
    const handleMarkRead = async (data: any) => {
      if (!user || !user.id) return;
      try {
        const messageId = typeof data === 'string' ? data : data.messageId;
        await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
        io.to(`user:${userId}`).emit('message_read', { messageId });
        io.to(`user:${userId}`).emit('message:read', { messageId });
      } catch (err) {
        logger.error({ err, data }, "Failed to mark message as read");
      }
    };

    socket.on('message:mark-read', handleMarkRead as any);
    socket.on('mark_message_read', handleMarkRead as any);

    // Typing indicators (support multiple event names)
    socket.on('user_typing', (data) => {
      const rid = (data && (data.recipientId || data.receiverId)) as string | undefined;
      if (rid) io.to(`user:${rid}`).emit('user_typing', { senderId: userId, timestamp: Date.now() });
    });

    socket.on('user_stop_typing', (data) => {
      const rid = (data && (data.recipientId || data.receiverId)) as string | undefined;
      if (rid) io.to(`user:${rid}`).emit('user_stop_typing', { senderId: userId, timestamp: Date.now() });
    });

    socket.on('typing', (data) => {
      const rid = data && data.recipientId;
      if (rid) io.to(`user:${rid}`).emit('user_typing', { senderId: userId, timestamp: Date.now() });
    });

    socket.on('stop_typing', (data) => {
      const rid = data && data.recipientId;
      if (rid) io.to(`user:${rid}`).emit('user_stop_typing', { senderId: userId, timestamp: Date.now() });
    });

    // Handle client presence update (client may emit user_online with more metadata)
    socket.on('user_online', (meta: any) => {
      if (!user) return;
      try {
        const m = {
          userName: meta.name || meta.userName || (user as any).email?.split('@')[0] || "User",
          email: meta.email || (user as any).email,
          role: meta.role || (user as any).role
        };
        (m as any).lastSeen = Date.now();
        userMeta.set(userId, m);
        // Broadcast status change
        io.emit('user_status_changed', { userId, userName: m.userName, status: 'online', role: m.role, lastSeen: (m as any).lastSeen });
        // Broadcast full online list
        const list = Array.from(userMeta.entries()).map(([id, mm]) => ({ userId: id, userName: mm.userName, role: mm.role, lastSeen: (mm as any).lastSeen || null }));
        io.emit('online_users', list);
      } catch (err) {
        logger.error({ err, meta }, 'Failed to update user presence');
      }
    });

    // Clean up on disconnect
    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // mark last seen timestamp
          const meta = userMeta.get(userId) || { userName: user?.email?.split('@')[0] || 'unknown', role: user?.role || 'guest' };
          (meta as any).lastSeen = Date.now();
          userMeta.set(userId, meta as any);
          io.emit('user_status_changed', { userId, status: 'offline', lastSeen: (meta as any).lastSeen });
          const list = Array.from(userMeta.entries()).map(([id, mm]) => ({ userId: id, userName: mm.userName, role: mm.role, lastSeen: (mm as any).lastSeen || null }));
          io.emit('online_users', list);
        }
      }
      logger.info({ userId, socketId: socket.id }, "Socket.IO client disconnected");
    });
  });

  return io;
}

export type SocketIOInstance = ReturnType<typeof setupSocketIO>;
