import type { CalendarDayInfo } from '@/types/calendar';
import type { Mitzvah } from '@/types/mitzvah';

export function isCalendarMitzvahActiveToday(
  mitzvah: Mitzvah,
  dayInfo: CalendarDayInfo,
): boolean {
  if (mitzvah.category === 'daily') {
    return true;
  }

  if (mitzvah.category === 'fast') {
    return dayInfo.activeFastMitzvahIds.includes(mitzvah.id);
  }

  if (mitzvah.category === 'holiday') {
    return dayInfo.activeHolidayMitzvahIds.includes(mitzvah.id);
  }

  return false;
}

export function filterActiveMitzvotForToday(
  mitzvot: Mitzvah[],
  dayInfo: CalendarDayInfo,
): Mitzvah[] {
  return mitzvot.filter((mitzvah) =>
    isCalendarMitzvahActiveToday(mitzvah, dayInfo),
  );
}

export function filterEnabledActiveMitzvotForToday(
  mitzvot: Mitzvah[],
  dayInfo: CalendarDayInfo,
  preferences: Record<string, { enabled: boolean }>,
): Mitzvah[] {
  return mitzvot.filter(
    (mitzvah) =>
      preferences[mitzvah.id]?.enabled &&
      isCalendarMitzvahActiveToday(mitzvah, dayInfo),
  );
}
