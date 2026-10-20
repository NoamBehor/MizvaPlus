import {
  getShacharitSectionMeta,
  SHACHARIT_SECTION_META,
} from '@/constants/shacharitStructure';
import type { CalendarDayInfo } from '@/types/calendar';
import type { PrayerSectionAvailability } from '@/types/prayer';

const SHIR_SHEL_YOM_BY_WEEKDAY: Record<number, string> = {
  0: 'יום ראשון',
  1: 'יום שני',
  2: 'יום שלישי',
  3: 'יום רביעי',
  4: 'יום חמישי',
  5: 'יום שישי',
  6: 'שבת',
};

function hasRoshChodesh(dayInfo: CalendarDayInfo): boolean {
  return dayInfo.events.some((event) => event.type === 'ROSH_CHODESH');
}

function getDayOfWeek(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00`).getDay();
}

function isTorahReadingDay(dayInfo: CalendarDayInfo): boolean {
  if (dayInfo.isShabbat || dayInfo.isHoliday || hasRoshChodesh(dayInfo)) {
    return true;
  }

  const dayOfWeek = getDayOfWeek(dayInfo.gregorianDateKey);
  return dayOfWeek === 1 || dayOfWeek === 4;
}

function isTachanunDay(dayInfo: CalendarDayInfo): boolean {
  return !dayInfo.isShabbat && !dayInfo.isHoliday && !hasRoshChodesh(dayInfo);
}

export function isSectionApplicableToday(
  sectionId: string,
  dayInfo: CalendarDayInfo | null,
): boolean {
  const meta = getShacharitSectionMeta(sectionId);

  if (meta.availability === 'always') {
    return true;
  }

  if (!dayInfo) {
    return true;
  }

  switch (sectionId) {
    case 'tachanun':
      return isTachanunDay(dayInfo);
    case 'torah-reading':
      return isTorahReadingDay(dayInfo);
    case 'shir-shel-yom':
      return true;
    default:
      return true;
  }
}

export function getSectionAvailabilityNote(
  sectionId: string,
  dayInfo: CalendarDayInfo | null,
): string | null {
  const meta = getShacharitSectionMeta(sectionId);

  if (meta.availability === 'always') {
    return null;
  }

  if (sectionId === 'shir-shel-yom' && dayInfo) {
    const weekdayLabel =
      SHIR_SHEL_YOM_BY_WEEKDAY[getDayOfWeek(dayInfo.gregorianDateKey)] ??
      'יום זה';
    return `${meta.availabilityNote ?? 'משתנה לפי יום השבוע'} — ${weekdayLabel}`;
  }

  if (
    dayInfo &&
    sectionId === 'torah-reading' &&
    isTorahReadingDay(dayInfo)
  ) {
    return 'מוצג היום — יש קריאת תורה';
  }

  if (dayInfo && sectionId === 'tachanun' && !isTachanunDay(dayInfo)) {
    return meta.availabilityNote ?? null;
  }

  return meta.availabilityNote ?? null;
}

export function getSectionAvailabilityLabel(
  availability: PrayerSectionAvailability,
): string | null {
  switch (availability) {
    case 'conditional':
      return 'מותנה';
    case 'special_day':
      return 'יום מיוחד';
    default:
      return null;
  }
}

export function countShacharitAvailabilityBreakdown(): Record<
  PrayerSectionAvailability,
  number
> {
  const counts: Record<PrayerSectionAvailability, number> = {
    always: 0,
    conditional: 0,
    special_day: 0,
  };

  for (const meta of Object.values(SHACHARIT_SECTION_META)) {
    counts[meta.availability] += 1;
  }

  return counts;
}
