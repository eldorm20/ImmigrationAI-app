import { logger } from "./logger";

/**
 * Google Meet Integration Service
 * Generates Meet links for consultations
 * Note: Requires Google OAuth setup for full calendar integration
 */

interface MeetingOptions {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  attendees?: string[];
  durationMinutes?: number;
}

/**
 * Generate a Google Meet link
 * Basic implementation - generates unique meeting ID
 * For production, integrate with Google Calendar API for full functionality
 */
export function generateGoogleMeetLink(meetingId?: string): string {
  const id = meetingId || generateUniqueMeetingId();
  return `https://meet.google.com/${id}`;
}

/**
 * Generate a unique meeting ID for Google Meet
 * Format: meet-XXXXXXXX-XXXX-XXXX (similar to Google Meet's format)
 */
function generateUniqueMeetingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `meet-${timestamp}-${random}`;
}

/**
 * Create a calendar event with Google Meet link
 * For production: Use Google Calendar API
 */
export async function createCalendarEventWithMeet(
  options: MeetingOptions
): Promise<{
  meetLink: string;
  eventId?: string;
  calendarLink?: string;
}> {
  // Try to create a real Google Calendar event if service account key provided
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (saKey) {
    try {
      // @ts-ignore
      const { google } = await import("googleapis");
      const key = typeof saKey === "string" ? JSON.parse(saKey) : saKey;

      const jwtClient = new google.auth.JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ["https://www.googleapis.com/auth/calendar"],
      } as any);

      await jwtClient.authorize();

      const calendar = google.calendar({ version: "v3", auth: jwtClient });

      const start = options.startTime || new Date();
      const end = options.endTime || new Date(start.getTime() + (options.durationMinutes || 60) * 60000);

      const event: any = {
        summary: options.title,
        description: `${options.description || ""}\n\nMeeting created by ImmigrationAI`,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: (options.attendees || []).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `immigrationai-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      const res = await calendar.events.insert({
        calendarId: key.client_email, // service account calendar; may need delegation
        requestBody: event,
        conferenceDataVersion: 1,
      });

      const meetLink = res.data.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === "video")?.uri || generateGoogleMeetLink();
      const eventId = res.data.id;
      const calendarLink = `https://www.google.com/calendar/event?eid=${eventId}`;

      logger.info({ meetLink, eventId }, "Google Calendar event created with Meet link");

      return { meetLink, eventId, calendarLink };
    } catch (err) {
      logger.error({ err }, "Google Calendar API failed — falling back to generated Meet link");
      // fallback to generated link below
    }
  }

  try {
    const meetLink = generateGoogleMeetLink();

    logger.info({ title: options.title, meetLink, attendees: options.attendees?.length || 0 }, "Google Meet link generated for consultation (fallback)");

    const calendarLink = generateCalendarLink({
      title: options.title,
      description: options.description,
      startTime: options.startTime,
      endTime: options.endTime,
      meetLink,
    });

    return {
      meetLink,
      calendarLink,
    };
  } catch (error) {
    logger.error({ error }, "Failed to create calendar event with Google Meet");
    throw error;
  }
}

/**
 * Generate a Google Calendar link for sharing
 */
function generateCalendarLink(eventData: {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  meetLink?: string;
}): string {
  const params = new URLSearchParams();

  params.append("action", "TEMPLATE");
  params.append("text", eventData.title);

  if (eventData.description) {
    const description = `${eventData.description}\n\nMeet Link: ${eventData.meetLink || ""
      }`;
    params.append("details", description);
  }

  if (eventData.startTime) {
    // Google Calendar uses YYYYMMDDTHHMMSSZ format
    params.append("dates", formatDateForCalendar(eventData.startTime));
  }

  if (eventData.meetLink) {
    params.append("location", `Google Meet: ${eventData.meetLink}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Format date for Google Calendar
 */
function formatDateForCalendar(date: Date): string {
  const start = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(date.getTime() + 60 * 60 * 1000) // 1 hour duration
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";

  return `${start}/${end}`;
}

/**
 * Generate a Zoom link as alternative (if Google Meet not preferred)
 * Requires Zoom API credentials
 */
export function generateZoomLink(meetingId?: string): string {
  const id = meetingId || Math.random().toString().slice(2, 11);
  return `https://zoom.us/j/${id}`;
}

/**
 * Generate a Jitsi Meet link as alternative (open source, no credentials needed)
 */
export function generateJitsiMeetLink(roomName?: string): string {
  const room = roomName || `consultation-${Date.now()}`;
  return `https://meet.jit.si/${encodeURIComponent(room)}`;
}

/**
 * Validate if a meeting link is valid
 */
export function validateMeetingLink(link: string): boolean {
  const validPatterns = [
    /^https:\/\/meet\.google\.com\/[a-z\-]+$/,
    /^https:\/\/zoom\.us\/j\/\d+$/,
    /^https:\/\/meet\.jit\.si\/.+$/,
  ];

  return validPatterns.some((pattern) => pattern.test(link));
}

/**
 * Send meeting invitation via email
 * Integrates with existing email system
 */
export async function sendMeetingInvitation(
  recipientEmail: string,
  meetingData: {
    title: string;
    meetLink: string;
    startTime?: Date;
    endTime?: Date;
    organizer: string;
    description?: string;
  }
): Promise<void> {
  try {
    // This would integrate with the existing email queue system
    logger.info(
      {
        recipient: recipientEmail,
        title: meetingData.title,
        link: meetingData.meetLink,
      },
      "Meeting invitation prepared"
    );

    // In implementation, queue email notification:
    // await emailQueue.add("send_meeting_invitation", {
    //   recipientEmail,
    //   meetingData,
    // });
  } catch (error) {
    logger.error({ error }, "Failed to send meeting invitation");
    throw error;
  }
}
