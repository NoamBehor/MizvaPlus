import { calendarService } from '@/services/calendar';
import { filterEnabledActiveMitzvotForToday } from '@/services/calendarMitzvot';
import {
  buildDailyTriggerFromTime,
  cancelNotification,
  getAllScheduledNotificationIdentifiers,
  getNotificationPermissionStatus,
  isReminderTimeValid,
  requestNotificationPermissions,
  scheduleDailyNotification,
  scheduleDateNotification,
  type NotificationPermissionResult,
} from '@/services/notifications';
import type { CalendarLocationInput, HebrewCalendarEvent } from '@/types/calendar';
import type { Mitzvah, UserMitzvahPreference } from '@/types/mitzvah';

const MITZVAH_TYPE = 'mitzvah-daily';
const CALENDAR_TYPE = 'calendar-event';

export type NotificationSchedulerResult = {
  scheduled: string[];
  cancelled: string[];
  skipped: string[];
};

let activeUserId: string | null = null;
let syncInFlight: Promise<NotificationSchedulerResult> | null = null;

export function buildMitzvahReminderId(
  userId: string,
  mitzvahId: string,
): string {
  return `${userId}:${mitzvahId}:${MITZVAH_TYPE}`;
}

export function buildCalendarNotificationId(
  userId: string,
  eventId: string,
): string {
  return `${userId}:${eventId}:${CALENDAR_TYPE}`;
}

export function isUserNotificationId(
  userId: string,
  identifier: string,
): boolean {
  return identifier.startsWith(`${userId}:`);
}

export async function enableNotifications(): Promise<NotificationPermissionResult> {
  return requestNotificationPermissions();
}

export async function disableNotifications(
  userId: string,
): Promise<void> {
  const scheduled = await getAllScheduledNotificationIdentifiers();
  const userIds = scheduled.filter((id) => isUserNotificationId(userId, id));
  await Promise.all(userIds.map((id) => cancelNotification(id)));
}

export async function onUserLogout(userId: string): Promise<void> {
  activeUserId = null;
  await disableNotifications(userId);
}

export async function syncNotificationSchedule(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
  mitzvot: Mitzvah[],
  location?: CalendarLocationInput,
): Promise<NotificationSchedulerResult> {
  if (syncInFlight && activeUserId === userId) {
    return syncInFlight;
  }

  activeUserId = userId;

  syncInFlight = reconcileNotifications(userId, preferences, mitzvot, location)
    .finally(() => {
      syncInFlight = null;
    });

  return syncInFlight;
}

async function reconcileNotifications(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
  mitzvot: Mitzvah[],
  location?: CalendarLocationInput,
): Promise<NotificationSchedulerResult> {
  const permission = await getNotificationPermissionStatus();
  const result: NotificationSchedulerResult = {
    scheduled: [],
    cancelled: [],
    skipped: [],
  };

  const desiredIds = new Set<string>();

  if (permission === 'granted') {
    const dayInfo = await calendarService.getTodayInfo(location);
    const activeMitzvot = filterEnabledActiveMitzvotForToday(
      mitzvot,
      dayInfo,
      preferences,
    );

    for (const mitzvah of activeMitzvot) {
      const preference = preferences[mitzvah.id];
      if (
        !preference?.enabled ||
        !preference.reminderEnabled ||
        !isReminderTimeValid(preference.reminderTime)
      ) {
        continue;
      }

      const identifier = buildMitzvahReminderId(userId, mitzvah.id);
      desiredIds.add(identifier);

      const { hour, minute } = buildDailyTriggerFromTime(preference.reminderTime);
      await scheduleDailyNotification({
        identifier,
        title: mitzvah.title,
        body: mitzvah.description,
        data: { mitzvahId: mitzvah.id, userId, type: MITZVAH_TYPE },
        hour,
        minute,
      });
      result.scheduled.push(identifier);
    }

    const calendarEvents = await calendarService.getUpcomingEvents(14, location);
    for (const event of calendarEvents) {
      const calendarId = buildCalendarNotificationId(userId, event.id);
      if (!shouldScheduleCalendarNotification(event)) {
        result.skipped.push(calendarId);
        continue;
      }

      desiredIds.add(calendarId);
      const triggerDate = new Date(event.startDate ?? `${event.dateKey}T08:00:00`);

      if (triggerDate.getTime() <= Date.now()) {
        result.skipped.push(calendarId);
        continue;
      }

      await scheduleDateNotification({
        identifier: calendarId,
        title: event.titleHebrew,
        body: getCalendarNotificationBody(event),
        data: { eventId: event.id, userId, type: CALENDAR_TYPE },
        date: triggerDate,
      });
      result.scheduled.push(calendarId);
    }
  }

  const currentlyScheduled = await getAllScheduledNotificationIdentifiers();
  const userScheduled = currentlyScheduled.filter((id) =>
    isUserNotificationId(userId, id),
  );

  for (const identifier of userScheduled) {
    if (!desiredIds.has(identifier)) {
      await cancelNotification(identifier);
      result.cancelled.push(identifier);
    }
  }

  return result;
}

function shouldScheduleCalendarNotification(
  event: HebrewCalendarEvent,
): boolean {
  if (
    event.type === 'CANDLE_LIGHTING' ||
    event.type === 'HAVDALAH' ||
    event.type === 'FAST'
  ) {
    return Boolean(event.startDate && event.startTime);
  }

  if (event.type === 'HOLIDAY') {
    return Boolean(event.startDate);
  }

  return false;
}

function getCalendarNotificationBody(event: HebrewCalendarEvent): string {
  switch (event.type) {
    case 'CANDLE_LIGHTING':
      return 'הדלקת נרות מתקרבת';
    case 'HAVDALAH':
      return 'יציאת שבת מתקרבת';
    case 'FAST':
      return 'יום צום מתקרב';
    case 'HOLIDAY':
      return 'חג מתקרב';
    default:
      return event.titleHebrew;
  }
}

export async function rescheduleAllNotifications(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
  mitzvot: Mitzvah[],
  location?: CalendarLocationInput,
): Promise<NotificationSchedulerResult> {
  return syncNotificationSchedule(userId, preferences, mitzvot, location);
}

/** Test helper: resets in-memory scheduler state. */
export function resetNotificationSchedulerState(): void {
  activeUserId = null;
  syncInFlight = null;
}
