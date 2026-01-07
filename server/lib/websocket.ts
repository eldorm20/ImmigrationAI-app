import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "./logger";
import { db } from "../db";
import { messages, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ConnectedUser {
  userId: string;
  socketId: string;
  userName: string;
  userEmail: string;
  role: string;
}

// Track connected users
const connectedUsers = new Map<string, ConnectedUser>();

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5000",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      if (!userId || !token) {
        return next(new Error("Authentication error"));
      }

      // Store user info on socket
      socket.data.userId = userId;
      socket.data.token = token;

      next();
    } catch (error) {
      logger.error({ error }, "WebSocket authentication failed");
      next(new Error("Authentication failed"));
    }
  });

  // Handle socket connections
  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`User ${userId} connected with socket ${socket.id}`);

    // Register user as connected
    socket.on("user_online", (userData: { name: string; email: string; role: string }) => {
      connectedUsers.set(userId, {
        userId,
        socketId: socket.id,
        userName: userData.name,
        userEmail: userData.email,
        role: userData.role,
      });

      // Notify all users that someone came online
      io.emit("user_status_changed", {
        userId,
        status: "online",
        userName: userData.name,
        timestamp: new Date(),
      });

      // Send current online users to the connected user
      const onlineUsers = Array.from(connectedUsers.values()).map((u) => ({
        userId: u.userId,
        userName: u.userName,
        role: u.role,
      }));

      socket.emit("online_users", onlineUsers);

      logger.info(`User ${userData.name} (${userId}) marked as online`);
    });

    // Handle real-time messaging
    socket.on("send_message", async (messageData: {
      receiverId: string;
      content: string;
    }) => {
      try {
        const senderId = userId;
        const { receiverId, content } = messageData;

        // Validate recipient exists
        const recipient = await db.query.users.findFirst({
          where: eq(users.id, receiverId),
        });

        if (!recipient) {
          socket.emit("message_error", { message: "Recipient not found" });
          return;
        }

        // Save message to database
        const [savedMessage] = await db
          .insert(messages)
          .values({
            senderId,
            receiverId,
            content,
            isRead: false,
          })
          .returning();

        // Get sender info
        const sender = await db.query.users.findFirst({
          where: eq(users.id, senderId),
        });

        // Emit to recipient if online
        const recipientSocket = Array.from(connectedUsers.values()).find(
          (u) => u.userId === receiverId
        );

        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit("new_message", {
            id: savedMessage.id,
            senderId,
            senderName: sender?.firstName || sender?.email || "Unknown",
            content,
            timestamp: savedMessage.createdAt,
            isRead: false,
            receiverId,
          });
        }

        // Confirm to sender
        socket.emit("message_sent", {
          id: savedMessage.id,
          senderId,
          senderName: sender?.firstName || sender?.email || "Unknown",
          receiverId,
          content,
          timestamp: savedMessage.createdAt,
          isRead: false,
        });

        logger.info(`Message sent from ${senderId} to ${receiverId}`);
      } catch (error) {
        logger.error({ error }, "Failed to send message");
        socket.emit("message_error", { message: "Failed to send message" });
      }
    });

    // Handle message reading
    socket.on("mark_message_read", async (messageData: { messageId: string }) => {
      try {
        const { messageId } = messageData;

        await db
          .update(messages)
          .set({ isRead: true })
          .where(eq(messages.id, messageId));

        // Notify sender that message was read
        const message = await db.query.messages.findFirst({
          where: eq(messages.id, messageId),
        });

        if (message) {
          const senderSocket = Array.from(connectedUsers.values()).find(
            (u) => u.userId === message.senderId
          );

          if (senderSocket) {
            io.to(senderSocket.socketId).emit("message_read", {
              messageId,
              readAt: new Date(),
            });
          }
        }

        logger.info(`Message ${messageId} marked as read`);
      } catch (error) {
        logger.error({ error }, "Failed to mark message as read");
      }
    });

    // Handle typing indicator
    socket.on("user_typing", (typingData: { receiverId: string }) => {
      const { receiverId } = typingData;
      const recipientSocket = Array.from(connectedUsers.values()).find(
        (u) => u.userId === receiverId
      );

      if (recipientSocket) {
        const sender = connectedUsers.get(userId);
        io.to(recipientSocket.socketId).emit("user_typing", {
          senderId: userId,
          senderName: sender?.userName || "Unknown",
        });
      }
    });

    // Handle stop typing
    socket.on("user_stop_typing", (typingData: { receiverId: string }) => {
      const { receiverId } = typingData;
      const recipientSocket = Array.from(connectedUsers.values()).find(
        (u) => u.userId === receiverId
      );

      if (recipientSocket) {
        io.to(recipientSocket.socketId).emit("user_stop_typing", {
          senderId: userId,
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const user = connectedUsers.get(userId);
      connectedUsers.delete(userId);

      if (user) {
        // Notify all users that someone went offline
        io.emit("user_status_changed", {
          userId,
          status: "offline",
          userName: user.userName,
          timestamp: new Date(),
        });

        logger.info(`User ${user.userName} (${userId}) disconnected`);
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error({ error }, "WebSocket error");
    });
  });

  logger.info("WebSocket server initialized");
  return io;
}

// Helper function to get online users
export function getOnlineUsers(): ConnectedUser[] {
  return Array.from(connectedUsers.values());
}

// Helper function to get user connection status
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}

// Helper function to emit to specific user
export function emitToUser(
  io: SocketIOServer,
  userId: string,
  event: string,
  data: any
): boolean {
  const user = connectedUsers.get(userId);
  if (user) {
    io.to(user.socketId).emit(event, data);
    return true;
  }
  return false;
}
