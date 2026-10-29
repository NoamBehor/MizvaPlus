import {
  isFastBeginsEvent,
  isFastEndsEvent,
  isFastOccasionHolidayKey,
  resolveEventDescriptor,
} from '@/constants/eventDescriptors';
import { formatGregorianDateLabel } from '@/services/calendar/hebrewMonthGrid';
import { getMitzvahById } from '@/services/mitzvot';
import { getHolidayKeyForMitzvahId } from '@/utils/mitzvah';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type { Mitzvah, UserMitzvahPreference } from '@/types/mitzvah';
import { israelWallTimeToDate } from '@/utils/reminderTimezone';
import { addDaysToDateKey, getIsraelDateKey } from '@/utils/timezone';

const HOUR_MS = 60 * 60 * 1000;
const DAY_REMINDER_TIME = '09:00';

export type OccasionReminderOffset = 'week' | 'day' | 'hour';

export interface CalendarMitzvahReminder {
  identifier: string;
  title: string;
  body: string;
  holidayKey: string;
  offset: OccasionReminderOffset;
  dateIso: string;
}

export interface PlanCalendarMitzvahRemindersInput {
  userId: string;
  nowMs: number;
  mitzvot: Mitzvah[];
  preferences: Record<string, UserMitzvahPreference>;
  events: HebrewCalendarEvent[];
  sunsetForDateKey: (dateKey: string) => string | null;
}

interface OccasionStart {
  startMs: number;
  startDateKey: string;
}

export function buildOccasionReminderId(
  userId: string,
  holidayKey: string,
  offset: OccasionReminderOffset,
): string {
  return `${userId}:occasion:${holidayKey}:${offset}`;
}

function holidayKeyForEvent(event: HebrewCalendarEvent): string | null {
  const holidayKey = resolveEventDescriptor(event).holidayKey;
  if (!holidayKey || holidayKey === 'other') {
    return null;
  }

  return holidayKey;
}

function isErevEvent(event: HebrewCalendarEvent): boolean {
  const desc = (event.eventDesc ?? '').toLowerCase();
  if (desc.startsWith('erev ') || desc.startsWith('erev-')) {
    return true;
  }

  const eventKey = (event.eventKey ?? '').toLowerCase();
  if (eventKey.startsWith('erev ') || eventKey.startsWith('erev-')) {
    return true;
  }

  return event.titleHebrew.trim().startsWith('ערב');
}

function fastBeginsHolidayKey(
  event: HebrewCalendarEvent,
  events: HebrewCalendarEvent[],
): string | null {
  if (!isFastBeginsEvent(event) || !event.startDate) {
    return null;
  }

  for (const mitzvahId of event.linkedMitzvahIds ?? []) {
    const key = getHolidayKeyForMitzvahId(mitzvahId);
    if (key) {
      return key;
    }
  }

  const sameDayKeys = events
    .filter((candidate) => candidate.dateKey === event.dateKey && candidate.id !== event.id)
    .map(holidayKeyForEvent)
    .filter((key): key is string => key != null && isFastOccasionHolidayKey(key));

  return sameDayKeys[0] ?? null;
}

function clusterStartDateKeys(dateKeys: string[]): string[] {
  const unique = [...new Set(dateKeys)].sort();
  const present = new Set(unique);

  return unique.filter((dateKey) => !present.has(addDaysToDateKey(dateKey, -1)));
}

function startFromInstant(startMs: number): OccasionStart | null {
  if (Number.isNaN(startMs)) {
    return null;
  }

  return {
    startMs,
    startDateKey: getIsraelDateKey(new Date(startMs)),
  };
}

function earliestStart(
  events: HebrewCalendarEvent[],
): OccasionStart | null {
  const times = events
    .map((event) => (event.startDate ? new Date(event.startDate).getTime() : Number.NaN))
    .filter((time) => !Number.isNaN(time));

  if (times.length === 0) {
    return null;
  }

  return startFromInstant(Math.min(...times));
}

function resolveFastStart(
  holidayKey: string,
  events: HebrewCalendarEvent[],
  nowMs: number,
): OccasionStart | null {
  const starts = events
    .filter((event) => fastBeginsHolidayKey(event, events) === holidayKey)
    .map((event) => new Date(event.startDate ?? '').getTime())
    .filter((time) => !Number.isNaN(time) && time > nowMs)
    .sort((left, right) => left - right);

  const next = starts[0];
  return next === undefined ? null : startFromInstant(next);
}

function holidayDayDateKeys(
  holidayKey: string,
  events: HebrewCalendarEvent[],
): string[] {
  return events
    .filter((event) => {
      if (holidayKeyForEvent(event) !== holidayKey || isErevEvent(event)) {
        return false;
      }

      if (
        event.type === 'CANDLE_LIGHTING' ||
        event.type === 'HAVDALAH' ||
        isFastBeginsEvent(event) ||
        isFastEndsEvent(event)
      ) {
        return false;
      }

      return true;
    })
    .map((event) => event.dateKey);
}

function resolveHolidayStart(
  holidayKey: string,
  events: HebrewCalendarEvent[],
  nowMs: number,
  sunsetForDateKey: (dateKey: string) => string | null,
): OccasionStart | null {
  const starts = clusterStartDateKeys(holidayDayDateKeys(holidayKey, events));

  for (const firstDay of starts) {
    const timedOnDay = events.filter(
      (event) =>
        event.dateKey === firstDay &&
        holidayKeyForEvent(event) === holidayKey &&
        Boolean(event.startDate) &&
        !isFastBeginsEvent(event) &&
        !isFastEndsEvent(event),
    );
    const timedStart = earliestStart(timedOnDay);
    if (timedStart && timedStart.startMs > nowMs) {
      return timedStart;
    }

    const eve = addDaysToDateKey(firstDay, -1);
    const candles = events.filter(
      (event) =>
        event.type === 'CANDLE_LIGHTING' &&
        event.dateKey === eve &&
        Boolean(event.startDate),
    );
    const candleStart = earliestStart(candles);
    if (candleStart && candleStart.startMs > nowMs) {
      return candleStart;
    }

    const sunsetIso = sunsetForDateKey(eve);
    if (!sunsetIso) {
      continue;
    }

    const sunsetStart = startFromInstant(new Date(sunsetIso).getTime());
    if (sunsetStart && sunsetStart.startMs > nowMs) {
      return sunsetStart;
    }
  }

  return null;
}

function reminderTitle(mitzvot: Mitzvah[]): string {
  const holiday = mitzvot.find((mitzvah) => mitzvah.category === 'holiday');
  return (holiday ?? mitzvot[0])?.title ?? '';
}

function pushFutureReminder(
  reminders: CalendarMitzvahReminder[],
  input: {
    userId: string;
    holidayKey: string;
    title: string;
    offset: OccasionReminderOffset;
    body: string;
    at: Date;
    nowMs: number;
  },
): void {
  if (Number.isNaN(input.at.getTime()) || input.at.getTime() <= input.nowMs) {
    return;
  }

  reminders.push({
    identifier: buildOccasionReminderId(input.userId, input.holidayKey, input.offset),
    title: input.title,
    body: input.body,
    holidayKey: input.holidayKey,
    offset: input.offset,
    dateIso: input.at.toISOString(),
  });
}

export function planCalendarMitzvahReminders(
  input: PlanCalendarMitzvahRemindersInput,
): CalendarMitzvahReminder[] {
  const enabledByKey = new Map<string, Mitzvah[]>();

  for (const mitzvah of input.mitzvot) {
    if (mitzvah.category !== 'fast' && mitzvah.category !== 'holiday') {
      continue;
    }

    if (!input.preferences[mitzvah.id]?.enabled) {
      continue;
    }

    const holidayKey = getHolidayKeyForMitzvahId(mitzvah.id);
    if (!holidayKey) {
      continue;
    }

    const group = enabledByKey.get(holidayKey) ?? [];
    group.push(mitzvah);
    enabledByKey.set(holidayKey, group);
  }

  const reminders: CalendarMitzvahReminder[] = [];

  for (const [holidayKey, mitzvot] of enabledByKey) {
    const representative = mitzvot[0];
    const useFastOccasionPath =
      representative?.category === 'fast' ||
      isFastOccasionHolidayKey(holidayKey);
    const start = useFastOccasionPath
      ? resolveFastStart(holidayKey, input.events, input.nowMs)
      : resolveHolidayStart(
          holidayKey,
          input.events,
          input.nowMs,
          input.sunsetForDateKey,
        );

    if (!start) {
      continue;
    }

    const title = reminderTitle(mitzvot);
    pushFutureReminder(reminders, {
      userId: input.userId,
      holidayKey,
      title,
      offset: 'week',
      body: 'בעוד שבוע',
      at: israelWallTimeToDate(addDaysToDateKey(start.startDateKey, -7), DAY_REMINDER_TIME),
      nowMs: input.nowMs,
    });
    pushFutureReminder(reminders, {
      userId: input.userId,
      holidayKey,
      title,
      offset: 'day',
      body: 'מחר',
      at: israelWallTimeToDate(addDaysToDateKey(start.startDateKey, -1), DAY_REMINDER_TIME),
      nowMs: input.nowMs,
    });
    pushFutureReminder(reminders, {
      userId: input.userId,
      holidayKey,
      title,
      offset: 'hour',
      body: 'בעוד שעה',
      at: new Date(start.startMs - HOUR_MS),
      nowMs: input.nowMs,
    });
  }

  return reminders;
}

export interface OccasionDateLabels {
  hebrew: string;
  gregorian: string;
}

function namedOccasionDateKeys(
  holidayKey: string,
  events: HebrewCalendarEvent[],
): string[] {
  return events
    .filter((event) => {
      if (holidayKeyForEvent(event) !== holidayKey) {
        return false;
      }
      if (isErevEvent(event)) {
        return false;
      }
      if (
        event.type === 'CANDLE_LIGHTING' ||
        event.type === 'HAVDALAH' ||
        isFastBeginsEvent(event) ||
        isFastEndsEvent(event)
      ) {
        return false;
      }
      return true;
    })
    .map((event) => event.dateKey);
}

function isUpcomingHolidayFirstDay(
  holidayKey: string,
  firstDay: string,
  events: HebrewCalendarEvent[],
  nowMs: number,
  sunsetForDateKey: (dateKey: string) => string | null,
): boolean {
  const timedOnDay = events.filter(
    (event) =>
      event.dateKey === firstDay &&
      holidayKeyForEvent(event) === holidayKey &&
      Boolean(event.startDate) &&
      !isFastBeginsEvent(event) &&
      !isFastEndsEvent(event),
  );
  const timedStart = earliestStart(timedOnDay);
  if (timedStart && timedStart.startMs > nowMs) {
    return true;
  }

  const eve = addDaysToDateKey(firstDay, -1);
  const candles = events.filter(
    (event) =>
      event.type === 'CANDLE_LIGHTING' &&
      event.dateKey === eve &&
      Boolean(event.startDate),
  );
  const candleStart = earliestStart(candles);
  if (candleStart && candleStart.startMs > nowMs) {
    return true;
  }

  const sunsetIso = sunsetForDateKey(eve);
  if (sunsetIso) {
    const sunsetStart = startFromInstant(new Date(sunsetIso).getTime());
    if (sunsetStart && sunsetStart.startMs > nowMs) {
      return true;
    }
  }

  return false;
}

export function resolveNextOccasionDisplayDateKey(input: {
  mitzvahId: string;
  events: HebrewCalendarEvent[];
  nowMs?: number;
  sunsetForDateKey: (dateKey: string) => string | null;
}): string | null {
  const nowMs = input.nowMs ?? Date.now();
  const holidayKey = getHolidayKeyForMitzvahId(input.mitzvahId);
  if (!holidayKey) {
    return null;
  }

  const mitzvah = getMitzvahById(input.mitzvahId);
  const useFastOccasionPath =
    mitzvah?.category === 'fast' || isFastOccasionHolidayKey(holidayKey);

  if (useFastOccasionPath) {
    const start = resolveFastStart(holidayKey, input.events, nowMs);
    if (!start) {
      return null;
    }
    const named = namedOccasionDateKeys(holidayKey, input.events)
      .filter((dateKey) => dateKey >= start.startDateKey)
      .sort();
    return named[0] ?? start.startDateKey;
  }

  for (const firstDay of clusterStartDateKeys(
    holidayDayDateKeys(holidayKey, input.events),
  )) {
    if (
      isUpcomingHolidayFirstDay(
        holidayKey,
        firstDay,
        input.events,
        nowMs,
        input.sunsetForDateKey,
      )
    ) {
      return firstDay;
    }
  }

  return null;
}

export function resolveNextOccasionDateLabels(input: {
  mitzvahId: string;
  events: HebrewCalendarEvent[];
  nowMs?: number;
  sunsetForDateKey: (dateKey: string) => string | null;
  formatHebrewDateKey: (dateKey: string) => string;
}): OccasionDateLabels | null {
  const displayDateKey = resolveNextOccasionDisplayDateKey(input);
  if (!displayDateKey) {
    return null;
  }

  return {
    hebrew: input.formatHebrewDateKey(displayDateKey),
    gregorian: formatGregorianDateLabel(displayDateKey),
  };
}
