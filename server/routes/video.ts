import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { db } from "../db";
import { consultations, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { Server as SocketIOServer } from "socket.io";

const router = Router();

// Store for active video calls - maps roomId to participant info
const activeRooms = new Map<string, {
    hostId: string;
    guestId?: string;
    createdAt: Date;
    consultationId?: string;
}>();

// Generate a unique room ID
function generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a video call room for a consultation
router.post(
    "/create-room",
    authenticate,
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { consultationId, guestId } = req.body;

        // If consultationId provided, verify the user is part of it
        if (consultationId) {
            const consultation = await db.query.consultations.findFirst({
                where: eq(consultations.id, consultationId),
            });

            if (!consultation) {
                return res.status(404).json({ error: "Consultation not found" });
            }

            if (consultation.lawyerId !== userId && consultation.userId !== userId) {
                return res.status(403).json({ error: "Not authorized for this consultation" });
            }
        }

        const roomId = generateRoomId();

        activeRooms.set(roomId, {
            hostId: userId,
            guestId,
            createdAt: new Date(),
            consultationId,
        });

        // Auto-cleanup after 2 hours
        setTimeout(() => {
            activeRooms.delete(roomId);
        }, 2 * 60 * 60 * 1000);

        logger.info({ roomId, hostId: userId }, "Video room created");

        res.json({
            success: true,
            roomId,
            joinUrl: `/video-call/${roomId}`,
        });
    })
);

// Join an existing room
router.post(
    "/join-room/:roomId",
    authenticate,
    asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user!.userId;

        const room = activeRooms.get(roomId);
        if (!room) {
            return res.status(404).json({ error: "Room not found or expired" });
        }

        // Allow host or invited guest
        if (room.hostId !== userId && room.guestId && room.guestId !== userId) {
            return res.status(403).json({ error: "Not authorized to join this room" });
        }

        logger.info({ roomId, userId }, "User joined video room");

        res.json({
            success: true,
            roomId,
            isHost: room.hostId === userId,
        });
    })
);

// Get room info
router.get(
    "/room/:roomId",
    authenticate,
    asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const room = activeRooms.get(roomId);

        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        res.json({
            roomId,
            hostId: room.hostId,
            guestId: room.guestId,
            createdAt: room.createdAt.toISOString(),
            consultationId: room.consultationId,
        });
    })
);

// Get TURN/STUN server configuration
router.get(
    "/ice-servers",
    authenticate,
    asyncHandler(async (req, res) => {
        // Use public STUN servers + optional TURN
        const iceServers = [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
        ];

        // Add TURN server if configured
        if (process.env.TURN_SERVER_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
            iceServers.push({
                urls: process.env.TURN_SERVER_URL,
                username: process.env.TURN_USERNAME,
                credential: process.env.TURN_CREDENTIAL,
            } as any);
        }

        res.json({ iceServers });
    })
);

// End a call
router.post(
    "/end-call/:roomId",
    authenticate,
    asyncHandler(async (req, res) => {
        const { roomId } = req.params;
        const userId = req.user!.userId;

        const room = activeRooms.get(roomId);
        if (room && room.hostId === userId) {
            activeRooms.delete(roomId);
            logger.info({ roomId, userId }, "Video room ended by host");
        }

        res.json({ success: true });
    })
);

export default router;

// WebRTC Signaling - attach to Socket.IO
export function setupVideoSignaling(io: SocketIOServer) {
    // Video call signaling namespace
    const videoNs = io.of("/video");

    videoNs.on("connection", (socket) => {
        logger.info({ socketId: socket.id }, "Video signaling client connected");

        // Join a video room
        socket.on("join-room", (data: { roomId: string; userId: string }) => {
            const { roomId, userId } = data;
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.userId = userId;

            // Notify others in the room
            socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });
            logger.info({ roomId, userId }, "User joined video room");
        });

        // WebRTC signaling: offer
        socket.on("offer", (data: { roomId: string; offer: RTCSessionDescriptionInit; targetId: string }) => {
            socket.to(data.roomId).emit("offer", {
                offer: data.offer,
                senderId: socket.data.userId,
                senderSocketId: socket.id,
            });
        });

        // WebRTC signaling: answer
        socket.on("answer", (data: { roomId: string; answer: RTCSessionDescriptionInit; targetSocketId: string }) => {
            socket.to(data.targetSocketId).emit("answer", {
                answer: data.answer,
                senderId: socket.data.userId,
            });
        });

        // WebRTC signaling: ICE candidate
        socket.on("ice-candidate", (data: { roomId: string; candidate: RTCIceCandidateInit }) => {
            socket.to(data.roomId).emit("ice-candidate", {
                candidate: data.candidate,
                senderId: socket.data.userId,
            });
        });

        // User left
        socket.on("leave-room", () => {
            const roomId = socket.data.roomId;
            if (roomId) {
                socket.to(roomId).emit("user-left", { userId: socket.data.userId });
                socket.leave(roomId);
            }
        });

        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (roomId) {
                socket.to(roomId).emit("user-left", { userId: socket.data.userId });
            }
            logger.info({ socketId: socket.id }, "Video signaling client disconnected");
        });
    });

    return videoNs;
}
