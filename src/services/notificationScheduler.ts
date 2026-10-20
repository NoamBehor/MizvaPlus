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
  type NotificationPermissionStatus,
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

export type NotificationPlanItem =
  | {
      kind: 'daily';
      identifier: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      hour: number;
      minute: number;
    }
  | {
      kind: 'date';
      identifier: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      dateIso: string;
    };

export type NotificationReconcileInput = {
  userId: string;
  permission: NotificationPermissionStatus;
  nowMs: number;
  mitzvot: Mitzvah[];
  preferences: Record<string, UserMitzvahPreference>;
  activeMitzvahIds: string[];
  calendarEvents: HebrewCalendarEvent[];
  currentlyScheduled: string[];
  dailyTriggerFromTime: (time: string) => { hour: number; minute: number };
};

type SyncArgs = {
  userId: string;
  preferences: Record<string, UserMitzvahPreference>;
  mitzvot: Mitzvah[];
  location?: CalendarLocationInput;
};

let activeUserId: string | null = null;
let syncInFlight: Promise<NotificationSchedulerResult> | null = null;
let pendingArgs: SyncArgs | null = null;

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

function parseTriggerDate(event: HebrewCalendarEvent): Date | null {
  if (!event.startDate) {
    return null;
  }

  const triggerDate = new Date(event.startDate);
  if (Number.isNaN(triggerDate.getTime())) {
    return null;
  }

  return triggerDate;
}

export function planNotificationReconcile(input: NotificationReconcileInput): {
  toSchedule: NotificationPlanItem[];
  toCancel: string[];
  skipped: string[];
} {
  const {
    userId,
    permission,
    nowMs,
    mitzvot,
    preferences,
    activeMitzvahIds,
    calendarEvents,
    currentlyScheduled,
    dailyTriggerFromTime,
  } = input;

  const toSchedule: NotificationPlanItem[] = [];
  const skipped: string[] = [];
  const desiredIds = new Set<string>();
  const scheduledIds = new Set<string>();

  if (permission === 'granted') {
    for (const mitzvah of mitzvot) {
      const preference = preferences[mitzvah.id];
      if (
        !activeMitzvahIds.includes(mitzvah.id) ||
        !preference?.enabled ||
        !preference.reminderEnabled ||
        !isReminderTimeValid(preference.reminderTime)
      ) {
        if (preference?.reminderEnabled && !isReminderTimeValid(preference.reminderTime)) {
          skipped.push(buildMitzvahReminderId(userId, mitzvah.id));
        }
        continue;
      }

      const identifier = buildMitzvahReminderId(userId, mitzvah.id);
      desiredIds.add(identifier);
      const { hour, minute } = dailyTriggerFromTime(preference.reminderTime);
      if (!scheduledIds.has(identifier)) {
        scheduledIds.add(identifier);
        toSchedule.push({
          kind: 'daily',
          identifier,
          title: mitzvah.title,
          body: mitzvah.description,
          data: { mitzvahId: mitzvah.id, userId, type: MITZVAH_TYPE },
          hour,
          minute,
        });
      }
    }

    for (const event of calendarEvents) {
      const calendarId = buildCalendarNotificationId(userId, event.id);
      if (!shouldScheduleCalendarNotification(event)) {
        skipped.push(calendarId);
        continue;
      }

      const triggerDate = parseTriggerDate(event);
      if (!triggerDate) {
        skipped.push(calendarId);
        continue;
      }
      if (triggerDate.getTime() <= nowMs) {
        skipped.push(calendarId);
        continue;
      }

      desiredIds.add(calendarId);
      if (!scheduledIds.has(calendarId)) {
        scheduledIds.add(calendarId);
        toSchedule.push({
          kind: 'date',
          identifier: calendarId,
          title: event.titleHebrew,
          body: getCalendarNotificationBody(event),
          data: { eventId: event.id, userId, type: CALENDAR_TYPE },
          dateIso: triggerDate.toISOString(),
        });
      }
    }
  }

  const toCancel = currentlyScheduled.filter(
    (id) => isUserNotificationId(userId, id) && !desiredIds.has(id),
  );

  return { toSchedule, toCancel, skipped };
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
  pendingArgs = null;
  await disableNotifications(userId);
}

export async function syncNotificationSchedule(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
  mitzvot: Mitzvah[],
  location?: CalendarLocationInput,
): Promise<NotificationSchedulerResult> {
  const args: SyncArgs = { userId, preferences, mitzvot, location };

  if (syncInFlight) {
    pendingArgs = args;
    return syncInFlight;
  }

  activeUserId = userId;

  syncInFlight = (async () => {
    let currentArgs = args;
    let result: NotificationSchedulerResult = {
      scheduled: [],
      cancelled: [],
      skipped: [],
    };

    do {
      result = await reconcileNotifications(
        currentArgs.userId,
        currentArgs.preferences,
        currentArgs.mitzvot,
        currentArgs.location,
      );
      const nextArgs = pendingArgs;
      pendingArgs = null;
      if (!nextArgs) {
        break;
      }
      currentArgs = nextArgs;
    } while (true);

    return result;
  })().finally(() => {
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
  const currentlyScheduled = await getAllScheduledNotificationIdentifiers();
  const userScheduled = currentlyScheduled.filter((id) =>
    isUserNotificationId(userId, id),
  );

  let activeMitzvahIds: string[] = [];
  let calendarEvents: HebrewCalendarEvent[] = [];

  if (permission === 'granted') {
    const dayInfo = await calendarService.getTodayInfo(location);
    const activeMitzvot = filterEnabledActiveMitzvotForToday(
      mitzvot,
      dayInfo,
      preferences,
    );
    activeMitzvahIds = activeMitzvot.map((mitzvah) => mitzvah.id);
    calendarEvents = await calendarService.getUpcomingEvents(14, location);
  }

  const plan = planNotificationReconcile({
    userId,
    permission,
    nowMs: Date.now(),
    mitzvot,
    preferences,
    activeMitzvahIds,
    calendarEvents,
    currentlyScheduled: userScheduled,
    dailyTriggerFromTime: buildDailyTriggerFromTime,
  });

  const result: NotificationSchedulerResult = {
    scheduled: [],
    cancelled: [],
    skipped: plan.skipped,
  };

  for (const item of plan.toSchedule) {
    if (item.kind === 'daily') {
      await scheduleDailyNotification({
        identifier: item.identifier,
        title: item.title,
        body: item.body,
        data: item.data,
        hour: item.hour,
        minute: item.minute,
      });
    } else {
      await scheduleDateNotification({
        identifier: item.identifier,
        title: item.title,
        body: item.body,
        data: item.data,
        date: new Date(item.dateIso),
      });
    }
    result.scheduled.push(item.identifier);
  }

  for (const identifier of plan.toCancel) {
    await cancelNotification(identifier);
    result.cancelled.push(identifier);
  }

  return result;
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
  pendingArgs = null;
}
