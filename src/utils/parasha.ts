import type { Event } from '@hebcal/core';
import { flags, HDate } from '@hebcal/core';

import type { WeeklyParasha } from '@/types/calendar';
import { addDaysToDateKey, parseDateKey } from '@/utils/timezone';

const PARASHA_PREFIX = 'פרשת ';

function gregorianDateKeyFromEvent(ev: Event): string {
  const gregorian = ev.getDate().greg();
  const year = gregorian.getFullYear();
  const month = String(gregorian.getMonth() + 1).padStart(2, '0');
  const day = String(gregorian.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hebrewStripNikkud(str: string): string {
  const normalized = str.normalize();
  return normalized
    .replace(/[\u0590-\u05bd]/g, '')
    .replace(/[\u05bf-\u05c7]/g, '');
}

export function parseParashaFromHebcalRender(hebrewRendered: string): {
  hebrewName: string;
  hebrewDisplayName: string;
} {
  const hebrewName = hebrewStripNikkud(hebrewRendered);
  const hebrewDisplayName = hebrewName.startsWith(PARASHA_PREFIX)
    ? hebrewName.slice(PARASHA_PREFIX.length)
    : hebrewName;

  return { hebrewName, hebrewDisplayName };
}

export function isParashaEvent(ev: Event): boolean {
  const desc = ev.getDesc().toLowerCase();
  const eventFlags = ev.getFlags();
  return (
    (eventFlags & flags.PARSHA_HASHAVUA) !== 0 ||
    desc.includes('parashat')
  );
}

export function getShabbatDateKeyForWeek(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const daysUntilSaturday = day === 6 ? 0 : 6 - day;
  return addDaysToDateKey(dateKey, daysUntilSaturday);
}

function formatShabbatHebrewDate(shabbatDateKey: string): string {
  const hd = new HDate(parseDateKey(shabbatDateKey));
  return hd.renderGematriya(true);
}

function formatShabbatGregorianLabel(shabbatDateKey: string): string {
  const date = parseDateKey(shabbatDateKey);
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(date);
}

export function buildWeeklyParashaFromEvent(
  ev: Event,
  shabbatDateKey: string,
): WeeklyParasha {
  const { hebrewName, hebrewDisplayName } = parseParashaFromHebcalRender(
    ev.render('he'),
  );

  return {
    hebrewName,
    hebrewDisplayName,
    shabbatDateKey,
    hebrewDate: formatShabbatHebrewDate(shabbatDateKey),
    gregorianDate: formatShabbatGregorianLabel(shabbatDateKey),
    basename: ev.basename(),
  };
}

export function findWeeklyParashaForDate(
  dateKey: string,
  rawEvents: Event[],
): WeeklyParasha | null {
  const shabbatDateKey = getShabbatDateKeyForWeek(dateKey);
  const parashaEvent = rawEvents.find((ev) => {
    if (!isParashaEvent(ev)) {
      return false;
    }

    return gregorianDateKeyFromEvent(ev) === shabbatDateKey;
  });

  if (!parashaEvent) {
    return null;
  }

  return buildWeeklyParashaFromEvent(parashaEvent, shabbatDateKey);
}
