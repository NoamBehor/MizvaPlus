import {
  EVENT_KEY_TO_HOLIDAY_KEY,
  resolveEventDescriptor,
} from '@/constants/eventDescriptors';
import { normalizeEventKey } from '@/constants/calendarMitzvahMap';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type { HolidayThemeKey, UpcomingEvent } from '@/types/event';

import type { HolidayContext, HolidayPrepStage } from './types';

export type { HolidayContext, HolidayPrepStage } from './types';

/** Five-day pre-holiday window in hours (120h). */
export const HOLIDAY_PREP_WINDOW_MS = 120 * 60 * 60 * 1000;

const SUPPORTED_HOLIDAY_KEYS = new Set([
  'rosh_hashanah',
  'yom_kippur',
  'sukkot',
  'shemini_atzeret',
  'simchat_torah',
  'pesach',
  'shavuot',
  'purim',
  'shushan_purim',
  'hanukkah',
  'taanit_gedalia',
  'tisha_bav',
  'asarah_btevet',
  'taanit_esther',
  'taanit_bechorot',
  'shivah_asar_btamuz',
  'lag_baomer',
  'tu_bshvat',
]);

const TRIVIA_CATEGORIES_BY_HOLIDAY: Record<string, string[]> = {
  rosh_hashanah: ['HOLIDAYS', 'TEFILLAH', 'JEWISH_THOUGHT'],
  yom_kippur: ['HOLIDAYS', 'TEFILLAH'],
  sukkot: ['HOLIDAYS', 'JEWISH_THOUGHT'],
  shemini_atzeret: ['HOLIDAYS', 'TEFILLAH'],
  simchat_torah: ['HOLIDAYS', 'TORAH'],
  pesach: ['HOLIDAYS', 'MITZVOT'],
  shavuot: ['HOLIDAYS', 'TORAH'],
  purim: ['HOLIDAYS', 'TANAKH'],
  shushan_purim: ['HOLIDAYS', 'TANAKH'],
  hanukkah: ['HOLIDAYS', 'JEWISH_HISTORY'],
  taanit_gedalia: ['HOLIDAYS', 'HEBREW_TERMINOLOGY'],
  tisha_bav: ['HOLIDAYS', 'JEWISH_HISTORY'],
  asarah_btevet: ['HOLIDAYS', 'HEBREW_TERMINOLOGY'],
  taanit_esther: ['HOLIDAYS', 'HEBREW_TERMINOLOGY'],
  taanit_bechorot: ['HOLIDAYS', 'MITZVOT'],
  shivah_asar_btamuz: ['HOLIDAYS', 'HEBREW_TERMINOLOGY'],
  lag_baomer: ['HOLIDAYS', 'JEWISH_HISTORY'],
  tu_bshvat: ['HOLIDAYS', 'MITZVOT'],
};

const INACTIVE_CONTEXT: HolidayContext = {
  active: false,
  themeKey: 'default',
  prepCardEnabled: false,
  triviaCategories: [],
};

function isSupportedHolidayKey(holidayKey: string): boolean {
  const canonical =
    EVENT_KEY_TO_HOLIDAY_KEY[normalizeEventKey(holidayKey)] ?? holidayKey;
  return SUPPORTED_HOLIDAY_KEYS.has(canonical);
}

function resolvePrepStage(hoursUntil: number, isEventDay: boolean): HolidayPrepStage {
  if (isEventDay) {
    return 'active';
  }
  if (hoursUntil <= 24) {
    return 'today';
  }
  if (hoursUntil <= 72) {
    return 'near';
  }
  return 'early';
}

function findUpcomingHolidayEvent(
  events: HebrewCalendarEvent[],
  nowMs: number,
): { event: HebrewCalendarEvent; hoursUntil: number } | null {
  let best: { event: HebrewCalendarEvent; hoursUntil: number } | null = null;

  for (const event of events) {
    if (!event.startDate) {
      continue;
    }

    const descriptor = resolveEventDescriptor(event);
    if (!isSupportedHolidayKey(descriptor.holidayKey)) {
      continue;
    }

    if (event.type !== 'HOLIDAY' && event.type !== 'FAST') {
      continue;
    }

    const eventMs = new Date(event.startDate).getTime();
    const deltaMs = eventMs - nowMs;

    if (deltaMs < 0 || deltaMs > HOLIDAY_PREP_WINDOW_MS) {
      continue;
    }

    const hoursUntil = deltaMs / (60 * 60 * 1000);
    if (!best || hoursUntil < best.hoursUntil) {
      best = { event, hoursUntil };
    }
  }

  return best;
}

export function getHolidayTheme(
  holidayKey?: string,
): HolidayThemeKey {
  if (!holidayKey) {
    return 'default';
  }

  const descriptor = resolveEventDescriptor({
    id: holidayKey,
    type: 'HOLIDAY',
    titleHebrew: '',
    dateKey: '',
    eventKey: holidayKey.replace(/_/g, ' '),
  });

  return descriptor.themeKey;
}

export function getHolidayTriviaContext(holidayKey?: string): string[] {
  if (!holidayKey) {
    return [];
  }
  return TRIVIA_CATEGORIES_BY_HOLIDAY[holidayKey] ?? [];
}

export function getHolidayPreparation(
  holidayKey?: string,
): { enabled: boolean; stage?: HolidayPrepStage } {
  if (!holidayKey || !isSupportedHolidayKey(holidayKey)) {
    return { enabled: false };
  }
  return { enabled: true };
}

export function getHolidayContext(
  events: HebrewCalendarEvent[],
  upcomingEvent?: UpcomingEvent | null,
  nowMs = Date.now(),
): HolidayContext {
  const upcomingHoliday = findUpcomingHolidayEvent(events, nowMs);

  if (!upcomingHoliday) {
    if (upcomingEvent?.holidayKey && isSupportedHolidayKey(upcomingEvent.holidayKey)) {
      const targetMs = new Date(upcomingEvent.targetDate).getTime();
      const deltaMs = targetMs - nowMs;
      if (deltaMs >= 0 && deltaMs <= HOLIDAY_PREP_WINDOW_MS) {
        const hoursUntil = deltaMs / (60 * 60 * 1000);
        const holidayKey = upcomingEvent.holidayKey;
        const holidayName = upcomingEvent.title;
        const prepStage = resolvePrepStage(hoursUntil, hoursUntil < 12);

        return {
          active: true,
          holidayKey,
          holidayName,
          daysUntil: Math.ceil(hoursUntil / 24),
          hoursUntil: Math.ceil(hoursUntil),
          themeKey: upcomingEvent.themeKey,
          prepStage,
          prepCardEnabled: true,
          triviaCategories: getHolidayTriviaContext(holidayKey),
        };
      }
    }

    return INACTIVE_CONTEXT;
  }

  const descriptor = resolveEventDescriptor(upcomingHoliday.event);
  const hoursUntil = upcomingHoliday.hoursUntil;
  const daysUntil = Math.ceil(hoursUntil / 24);
  const prepStage = resolvePrepStage(hoursUntil, hoursUntil < 12);

  return {
    active: true,
    holidayKey: descriptor.holidayKey,
    holidayName: descriptor.titleHebrew,
    daysUntil,
    hoursUntil: Math.ceil(hoursUntil),
    themeKey: descriptor.themeKey,
    prepStage,
    prepCardEnabled: true,
    triviaCategories: getHolidayTriviaContext(descriptor.holidayKey),
  };
}
