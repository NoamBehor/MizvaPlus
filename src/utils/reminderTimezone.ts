/**
 * Reminder timezone policy (P10.5-005)
 *
 * Daily mitzvah reminder times are stored and displayed as Israel wall-clock
 * times (Asia/Jerusalem), consistent with calendar and activity date bucketing
 * in {@link getActivityDateKey}. This is option B: reminder clock time follows
 * the application's authoritative Israel context, not the device timezone.
 *
 * expo-notifications DAILY triggers use device-local hour/minute, so scheduling
 * converts Israel wall time to device-local coordinates. Reschedule on app
 * foreground when the device timezone changes.
 */
import { parseTimeString, isValidTimeString } from '@/utils/time';
import { ISRAEL_TIMEZONE, getIsraelDateKey } from '@/utils/timezone';

function getTimeZoneOffsetMs(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  const hourRaw = Number(parts.hour);
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );

  return asUtc - date.getTime();
}

/** UTC instant for an Israel wall-clock date + HH:mm. */
export function israelWallTimeToDate(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const { hours, minutes } = parseTimeString(time);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);
  let instant = utcGuess;
  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(ISRAEL_TIMEZONE, new Date(instant));
    const next = utcGuess - offset;
    if (next === instant) {
      break;
    }
    instant = next;
  }
  return new Date(instant);
}

/**
 * Device-local hour/minute for a DAILY notification trigger that fires at
 * {@link reminderTime} Israel wall clock each day.
 */
export function getDeviceLocalDailyTriggerFromIsraelReminder(
  reminderTime: string,
  referenceDate: Date = new Date(),
): { hour: number; minute: number } {
  const dateKey = getIsraelDateKey(referenceDate);
  const instant = israelWallTimeToDate(dateKey, reminderTime);
  return {
    hour: instant.getHours(),
    minute: instant.getMinutes(),
  };
}

/** Display stored reminder time (always Israel wall clock HH:mm). */
export function formatReminderTimeForDisplay(reminderTime: string): string {
  if (!isValidTimeString(reminderTime)) {
    return reminderTime;
  }

  const { hours, minutes } = parseTimeString(reminderTime);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
