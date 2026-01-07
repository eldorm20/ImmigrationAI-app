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
      origin: true, // Use true to reflect origin - essential when credentials: true
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Prioritize websocket but allow polling as fallback
    path: "/socket.io/", // Explicitly set default path
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
        logger.warn({ socketId: socket.id }, "Socket.IO connection rejected - no authentication token provided");
        return next(new Error("Authentication required"));
      }

      const payload = await verifyAccessToken(token);
      if (!payload) {
        logger.warn({ socketId: socket.id, tokenPrefix: token.substring(0, 10) }, "Socket.IO token verification failed");
        return next(new Error("Invalid or expired token"));
      }

      socket.data.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role
      };
      logger.info({ userId: payload.userId, socketId: socket.id }, "Socket.IO client authenticated");
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
    const jwtPayload = socket.data.user as { userId: string; email: string; role: string };
    const userId = jwtPayload.userId;
    const userEmail = jwtPayload.email;
    const userRole = jwtPayload.role;
    const user = { id: userId, email: userEmail, role: userRole };

    logger.info({ userId, socketId: socket.id }, "Socket.IO client connected");

    // Track user's sockets
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Join user room (e.g., for private notifications)
    socket.join(`user:${userId}`);

    // Set metadata for presence
    userMeta.set(userId, {
      userName: userEmail ? userEmail.split('@')[0] : `user_${socket.id.slice(0, 6)}`,
      email: userEmail,
      role: userRole
    });

    // Send greeting
    socket.emit("connect:success", { message: "Connected to messaging server", userId });

    // Send current online users list to this socket
    const currentOnline = Array.from(userMeta.entries()).map(([id, meta]) => ({ userId: id, userName: meta.userName, role: meta.role, lastSeen: (meta as any).lastSeen || null }));
    socket.emit('online_users', currentOnline);

    // Handle incoming messages (support both server and frontend event names)
    const handleIncomingMessage = async (payload: MessagePayload & { recipientId?: string, receiverId?: string }, ack?: (res: any) => void) => {
      try {
        const recipientId = payload.recipientId || payload.receiverId;
        const { content, applicationId } = payload;

        if (!content || !recipientId) {
          logger.warn({ payload, userId }, "Message missing content or recipientId");
          return ack?.({ success: false, error: "Missing content or recipientId" });
        }

        // Persist message to database
        const [savedMessage] = await db
          .insert(messages)
          .values({
            senderId: userId,
            receiverId: recipientId,
            applicationId: applicationId || null,
            content,
            isRead: false,
          })
          .returning();

        logger.info({ messageId: savedMessage.id, senderId: userId, recipientId }, "Message persisted");

        // Ensure timestamp is a valid ISO string
        const createdAt = savedMessage.createdAt instanceof Date
          ? savedMessage.createdAt.toISOString()
          : (savedMessage.createdAt || new Date().toISOString());

        const payloadOut = {
          id: savedMessage.id,
          content,
          senderId: userId,
          senderName: userEmail || 'User',
          receiverId: recipientId, // Standardize on receiverId for backend consistency
          recipientId, // Keep strictly for frontend compatibility if needed
          applicationId,
          timestamp: createdAt,
          isRead: false,
        };

        // Emit to receiver's connected sockets (if they're online) using multiple event names
        const receiverRoom = `user:${recipientId}`;
        logger.info({ receiverRoom, recipientId, senderId: userId }, "Emitting to receiver room");
        io.to(receiverRoom).emit('new_message', payloadOut);
        io.to(receiverRoom).emit('message:received', payloadOut);

        // Also emit to all of SENDER's other sockets (so it appears on all their devices)
        logger.info({ senderRoom: `user:${userId}`, userId }, "Emitting to sender room (other sessions)");
        socket.to(`user:${userId}`).emit('new_message', payloadOut);
        socket.to(`user:${userId}`).emit('message_sent', payloadOut);

        // Acknowledge back to sender with message_sent
        socket.emit('message_sent', payloadOut);

        ack?.({ success: true, messageId: savedMessage.id });
      } catch (err: any) {
        logger.error({ err, payload }, "Failed to send message");
        let errorMessage = "Failed to send message";

        if (err.code === "23503") { // Foreign key violation
          errorMessage = "Recipient user not found - they may have been deleted.";
        } else if (err.constraint === "messages_sender_id_users_id_fk") {
          errorMessage = "Sender account invalid.";
        }
      } else {
        // For other errors, append the system error message for debugging
        errorMessage = `Failed to send message: ${err.message || "Unknown error"}`;
      }

      ack?.({ success: false, error: errorMessage });
    }
  };

  socket.on('message:send', handleIncomingMessage as any);
  socket.on('send_message', handleIncomingMessage as any);

  // Handle message read status (support both names)
  const handleMarkRead = async (data: any) => {
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

  // Handle message editing
  socket.on('message:edit', (data: { id: string; content: string; recipientId: string }) => {
    if (!user || !user.id) return;
    const { id, content, recipientId } = data;
    const payload = { id, content, senderId: userId, recipientId };
    io.to(`user:${recipientId}`).emit('message:updated', payload);
    socket.to(`user:${userId}`).emit('message:updated', payload);
  });

  // Handle message deleting
  socket.on('message:delete', (data: { id: string; recipientId: string }) => {
    if (!user || !user.id) return;
    const { id, recipientId } = data;
    io.to(`user:${recipientId}`).emit('message:deleted', { id });
    socket.to(`user:${userId}`).emit('message:deleted', { id });
  });

  // Live Collaboration: Join Application Room
  socket.on('join_application', (data: { applicationId: string }) => {
    const { applicationId } = data;
    const room = `application:${applicationId}`;
    socket.join(room);

    // Update presence
    const meta = userMeta.get(userId) || { userName: "User", role: "guest" };
    io.to(room).emit('presence_update', {
      userId,
      userName: (meta as any).userName,
      role: (meta as any).role,
      action: 'viewing'
    });

    logger.info({ userId, applicationId }, "Joined application room");
  });

  socket.on('leave_application', (data: { applicationId: string }) => {
    const { applicationId } = data;
    const room = `application:${applicationId}`;
    socket.leave(room);

    io.to(room).emit('presence_update', {
      userId,
      action: 'left'
    });

    logger.info({ userId, applicationId }, "Left application room");
  });

  // Handle conversation clearing
  socket.on('conversation:clear', (data: { recipientId: string }) => {
    if (!user || !user.id) return;
    const { recipientId } = data;
    io.to(`user:${recipientId}`).emit('conversation:cleared', { userId: userId });
    socket.to(`user:${userId}`).emit('conversation:cleared', { userId: recipientId });
  });

  // Handle client presence update (client may emit user_online with more metadata)
  socket.on('user_online', (meta: any) => {
    try {
      const m = {
        userName: meta.name || meta.userName || (userEmail ? userEmail.split('@')[0] : "User"),
        email: meta.email || userEmail,
        role: meta.role || userRole
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

  socket.on('update_application', (data: { applicationId: string }) => {
    const { applicationId } = data;
    const room = `application:${applicationId}`;
    socket.to(room).emit('application_refetch', { applicationId });
    logger.info({ userId, applicationId }, "Broadcasted application update refetch");
  });

  // Clean up on disconnect
  socket.on("disconnect", () => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        // mark last seen timestamp
        const meta = userMeta.get(userId) || { userName: userEmail ? userEmail.split('@')[0] : 'unknown', email: userEmail, role: userRole };
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
