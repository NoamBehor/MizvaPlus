const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function parseTimeString(time: string): { hours: number; minutes: number } {
  if (!isValidTimeString(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }

  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

export function timeStringToDate(time: string, baseDate: Date = new Date()): Date {
  const { hours, minutes } = parseTimeString(time);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeForDisplay(time: string, locale = 'he-IL'): string {
  const date = timeStringToDate(time);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCountdown(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}
