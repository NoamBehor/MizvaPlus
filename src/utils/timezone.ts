/** Israel timezone identifier used for calendar and activity date bucketing. */
export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

const ISRAEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ISRAEL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const ISRAEL_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: ISRAEL_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Returns YYYY-MM-DD for the current instant in Israel local time.
 * Do not use UTC ISO date slices for calendar boundaries.
 */
export function getIsraelDateKey(date: Date = new Date()): string {
  const parts = ISRAEL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/**
 * Calendar "today" in Israel. Alias for {@link getIsraelDateKey}.
 */
export function getCalendarDateKey(date: Date = new Date()): string {
  return getIsraelDateKey(date);
}

/**
 * Authoritative activity date for mitzvah completions, streaks, trivia, XP, and badges.
 * All Jewish-day activity bucketing uses Israel local time (Asia/Jerusalem).
 */
export function getActivityDateKey(date: Date = new Date()): string {
  return getIsraelDateKey(date);
}

function shiftDateKeyByDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

/** Previous calendar day for an activity date key (YYYY-MM-DD). */
export function getPreviousActivityDateKey(dateKey: string): string {
  return shiftDateKeyByDays(dateKey, -1);
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return shiftDateKeyByDays(dateKey, days);
}

export function combineDateKeyAndTime(dateKey: string, time: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function formatIsraelTime(date: Date): string {
  return ISRAEL_TIME_FORMATTER.format(date);
}

export function toIsoLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
