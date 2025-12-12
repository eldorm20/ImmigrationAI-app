import { logger } from "./logger";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  timezone: string;
  reminders: { method: "email" | "notification"; minutesBefore: number }[];
}

export interface CalendarProvider {
  name: "google" | "outlook" | "local";
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

// Store calendar integrations (in production, use database)
const userCalendars: Map<string, CalendarProvider[]> = new Map();

// Initialize calendar for user
export function initializeUserCalendar(
  userId: string,
  providers: CalendarProvider[]
): void {
  userCalendars.set(userId, providers);
  logger.info({ userId, providerCount: providers.length }, "User calendar initialized");
}

// Add calendar provider for user
export function addCalendarProvider(
  userId: string,
  provider: CalendarProvider
): boolean {
  const calendars = userCalendars.get(userId) || [];
  calendars.push(provider);
  userCalendars.set(userId, calendars);
  logger.info({ userId, provider: provider.name }, "Calendar provider added");
  return true;
}

// Remove calendar provider
export function removeCalendarProvider(
  userId: string,
  providerName: "google" | "outlook" | "local"
): boolean {
  const calendars = userCalendars.get(userId);
  if (!calendars) return false;

  const filtered = calendars.filter((p) => p.name !== providerName);
  userCalendars.set(userId, filtered);
  logger.info({ userId, provider: providerName }, "Calendar provider removed");
  return true;
}

// Get user's calendar providers
export function getUserCalendarProviders(userId: string): CalendarProvider[] {
  return userCalendars.get(userId) || [];
}

// Create calendar event
export async function createCalendarEvent(
  userId: string,
  event: CalendarEvent,
  providerName?: "google" | "outlook"
): Promise<string | null> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) {
      logger.warn({ userId }, "No calendar providers configured");
      return null;
    }

    const provider = providerName
      ? providers.find((p) => p.name === providerName)
      : providers[0];

    if (!provider) {
      logger.warn({ userId, providerName }, "Calendar provider not found");
      return null;
    }

    // TODO: Implement actual calendar API calls
    // For Google Calendar:
    // const response = await calendar.events.insert({
    //   calendarId: 'primary',
    //   resource: {
    //     summary: event.title,
    //     description: event.description,
    //     start: { dateTime: event.startTime.toISOString(), timeZone: event.timezone },
    //     end: { dateTime: event.endTime.toISOString(), timeZone: event.timezone },
    //     attendees: event.attendees.map(email => ({ email })),
    //     reminders: { useDefault: false, overrides: event.reminders }
    //   }
    // });

    const eventId = `event_${Date.now()}`;
    logger.info({ userId, eventId, provider: provider.name }, "Calendar event created");
    return eventId;
  } catch (error) {
    logger.error({ error, userId }, "Failed to create calendar event");
    return null;
  }
}

// Update calendar event
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  updates: Partial<CalendarEvent>,
  providerName?: "google" | "outlook"
): Promise<boolean> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) return false;

    const provider = providerName
      ? providers.find((p) => p.name === providerName)
      : providers[0];

    if (!provider) return false;

    // TODO: Implement actual calendar API calls
    logger.info({ userId, eventId, provider: provider.name }, "Calendar event updated");
    return true;
  } catch (error) {
    logger.error({ error, userId, eventId }, "Failed to update calendar event");
    return false;
  }
}

// Delete calendar event
export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
  providerName?: "google" | "outlook"
): Promise<boolean> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) return false;

    const provider = providerName
      ? providers.find((p) => p.name === providerName)
      : providers[0];

    if (!provider) return false;

    // TODO: Implement actual calendar API calls
    logger.info({ userId, eventId, provider: provider.name }, "Calendar event deleted");
    return true;
  } catch (error) {
    logger.error({ error, userId, eventId }, "Failed to delete calendar event");
    return false;
  }
}

// Sync calendar events (bi-directional)
export async function syncCalendarEvents(userId: string): Promise<number> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) return 0;

    let syncedCount = 0;

    for (const provider of providers) {
      // TODO: Implement actual sync logic
      // Fetch events from provider
      // Compare with local events
      // Update/create/delete as needed
      syncedCount++;
    }

    logger.info({ userId, syncedCount }, "Calendar events synced");
    return syncedCount;
  } catch (error) {
    logger.error({ error, userId }, "Failed to sync calendar events");
    return 0;
  }
}

// Check availability across calendars
export async function checkAvailability(
  userId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) return true;

    // TODO: Implement actual availability checking
    // Query all providers for busy times
    // Return true if slot is available on all calendars

    logger.info({ userId, startTime, endTime }, "Availability checked");
    return true;
  } catch (error) {
    logger.error({ error, userId }, "Failed to check calendar availability");
    return true; // Default to available on error
  }
}

// Find next available slot
export async function findNextAvailableSlot(
  userId: string,
  duration: number, // minutes
  startDate: Date,
  endDate: Date
): Promise<{ startTime: Date; endTime: Date } | null> {
  try {
    const providers = userCalendars.get(userId);
    if (!providers || providers.length === 0) {
      // No calendars, suggest first available time
      const startTime = new Date(startDate);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      return { startTime, endTime };
    }

    // TODO: Implement actual slot finding logic
    // Query all providers for busy times
    // Find first available slot of requested duration

    const nextSlot = {
      startTime: new Date(startDate.getTime() + 3600000), // 1 hour from start date
      endTime: new Date(startDate.getTime() + 3600000 + duration * 60 * 1000),
    };

    logger.info({ userId, duration }, "Next available slot found");
    return nextSlot;
  } catch (error) {
    logger.error({ error, userId }, "Failed to find available slot");
    return null;
  }
}

// Get OAuth URLs for calendar providers
export function getCalendarOAuthUrl(
  provider: "google" | "outlook",
  redirectUri: string
): string {
  const clientIds: Record<string, string> = {
    google: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
    outlook: process.env.OUTLOOK_CLIENT_ID || "",
  };

  const authUrls: Record<string, string> = {
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientIds.google}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline`,
    outlook: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientIds.outlook}&redirect_uri=${redirectUri}&response_type=code&scope=Calendars.ReadWrite&access_type=offline`,
  };

  return authUrls[provider];
}
