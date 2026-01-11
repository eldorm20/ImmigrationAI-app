import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { calendarService } from "../lib/calendar";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);

// Schema for creating an event
const createEventSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional().default(""),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    attendees: z.array(z.string().email()).default([]),
    location: z.string().optional(),
    timezone: z.string().default("UTC"),
});

// GET /api/calendar/events - Get events for a range
router.get(
    "/events",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const start = req.query.start ? new Date(req.query.start as string) : new Date();
        const end = req.query.end ? new Date(req.query.end as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days default

        // In a real implementation we would filter by userId, but our mock service just returns mock data
        const events = await calendarService.getEvents(start, end);
        res.json(events);
    })
);

// POST /api/calendar/events - Create an event
router.post(
    "/events",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const eventData = createEventSchema.parse(req.body);

        const eventId = await calendarService.createEvent({
            ...eventData,
            startTime: new Date(eventData.startTime),
            endTime: new Date(eventData.endTime),
            reminders: []
        } as any); // Casting as any for now to match strict types if needed

        if (!eventId) {
            return res.status(500).json({ message: "Failed to create event" });
        }

        res.status(201).json({ success: true, eventId });
    })
);

// GET /api/calendar/sync - Trigger sync
router.post(
    "/sync",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const count = await calendarService.syncCalendarEvents(userId);
        res.json({ success: true, syncedCount: count });
    })
);

// POST /api/calendar/availability - Check availability
router.post(
    "/availability",
    asyncHandler(async (req, res) => {
        const userId = req.user!.userId;
        const { start, end } = z.object({
            start: z.string().datetime(),
            end: z.string().datetime()
        }).parse(req.body);

        const isAvailable = await calendarService.checkAvailability(
            userId,
            new Date(start),
            new Date(end)
        );

        res.json({ available: isAvailable });
    })
);

export default router;
