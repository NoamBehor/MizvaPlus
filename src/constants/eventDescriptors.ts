import { normalizeEventKey } from '@/constants/calendarMitzvahMap';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type {
  HolidayThemeKey,
  UpcomingEvent,
  UpcomingEventDisplay,
  UpcomingEventType,
} from '@/types/event';
import { stripHebrewNikkud } from '@/utils/hebrewText';

export interface EventDescriptor {
  holidayKey: string;
  titleHebrew: string;
  themeKey: HolidayThemeKey;
}

/** Canonical Hebrew names keyed by normalized Hebcal basename / event key. */
export const HEBCAL_EVENT_HEBREW_NAMES: Record<string, string> = {
  'rosh hashana': 'ראש השנה',
  'rosh hashanah': 'ראש השנה',
  'erev rosh hashana': 'ראש השנה',
  'yom kippur': 'יום כיפור',
  'erev yom kippur': 'יום כיפור',
  sukkot: 'סוכות',
  'erev sukkot': 'סוכות',
  'shmini atzeret': 'שמיני עצרת',
  'simchat torah': 'שמחת תורה',
  pesach: 'פסח',
  passover: 'פסח',
  'erev pesach': 'פסח',
  shavuot: 'שבועות',
  'erev shavuot': 'שבועות',
  'tzom gedaliah': 'צום גדליה',
  'taanit gedaliah': 'צום גדליה',
  "ta'anit gedaliah": 'צום גדליה',
  'tisha bav': 'תשעה באב',
  "tish'a b'av": 'תשעה באב',
  'asara btevet': 'עשרה בטבת',
  'asarah btevet': 'עשרה בטבת',
  'taanit esther': 'תענית אסתר',
  "ta'anit esther": 'תענית אסתר',
  purim: 'פורים',
  'shushan purim': 'שושן פורים',
  hanukkah: 'חנוכה',
  chanukah: 'חנוכה',
  'lag baomer': 'ל"ג בעומר',
  'lag ba omer': 'ל"ג בעומר',
  'tu bshvat': 'ט"ו בשבט',
  'tu bi shvat': 'ט"ו בשבט',
  'shiva asar btmuz': 'י״ז בתמוז',
  'shivah asar btamuz': 'י״ז בתמוז',
  '17 tammuz': 'י״ז בתמוז',
  'taanit bechorot': 'תענית בכורות',
  "ta'anit bechorot": 'תענית בכורות',
};

export const EVENT_KEY_TO_HOLIDAY_KEY: Record<string, string> = {
  'rosh hashana': 'rosh_hashanah',
  'rosh hashanah': 'rosh_hashanah',
  'erev rosh hashana': 'rosh_hashanah',
  'yom kippur': 'yom_kippur',
  'erev yom kippur': 'yom_kippur',
  sukkot: 'sukkot',
  'erev sukkot': 'sukkot',
  pesach: 'pesach',
  passover: 'pesach',
  'erev pesach': 'pesach',
  shavuot: 'shavuot',
  'erev shavuot': 'shavuot',
  'tzom gedaliah': 'taanit_gedalia',
  'taanit gedaliah': 'taanit_gedalia',
  "ta'anit gedaliah": 'taanit_gedalia',
  'tisha bav': 'tisha_bav',
  "tish'a b'av": 'tisha_bav',
  'asara btevet': 'asarah_btevet',
  'asarah btevet': 'asarah_btevet',
  'taanit esther': 'taanit_esther',
  "ta'anit esther": 'taanit_esther',
  purim: 'purim',
  'shushan purim': 'shushan_purim',
  hanukkah: 'hanukkah',
  chanukah: 'hanukkah',
  'lag baomer': 'lag_baomer',
  'lag ba omer': 'lag_baomer',
  'tu bshvat': 'tu_bshvat',
  'tu bi shvat': 'tu_bshvat',
  'shemini atzeret': 'shemini_atzeret',
  'shmini atzeret': 'shemini_atzeret',
  'simchat torah': 'simchat_torah',
  'shiva asar btmuz': 'shivah_asar_btamuz',
  'shivah asar btamuz': 'shivah_asar_btamuz',
  '17 tammuz': 'shivah_asar_btamuz',
  'taanit bechorot': 'taanit_bechorot',
  "ta'anit bechorot": 'taanit_bechorot',
};

const HOLIDAY_KEY_TO_THEME: Record<string, HolidayThemeKey> = {
  rosh_hashanah: 'rosh_hashanah',
  yom_kippur: 'yom_kippur',
  sukkot: 'sukkot',
  shemini_atzeret: 'shemini_atzeret',
  simchat_torah: 'simchat_torah',
  pesach: 'pesach',
  shavuot: 'shavuot',
  purim: 'purim',
  shushan_purim: 'shushan_purim',
  hanukkah: 'hanukkah',
  lag_baomer: 'lag_baomer',
  tu_bshvat: 'tu_bshvat',
  taanit_gedalia: 'fast',
  tisha_bav: 'fast',
  asarah_btevet: 'fast',
  taanit_esther: 'fast',
  taanit_bechorot: 'fast',
  shivah_asar_btamuz: 'fast',
};

const MITZVAH_ID_TO_HOLIDAY_KEY: Record<string, string> = {
  'rosh-hashana': 'rosh_hashanah',
  'yom-kippur': 'yom_kippur',
  'yom-kippur-fast': 'yom_kippur',
  sukkot: 'sukkot',
  'shmini-atzeret': 'shemini_atzeret',
  chanukah: 'hanukkah',
  'tu-bishvat': 'tu_bshvat',
  purim: 'purim',
  pesach: 'pesach',
  'lag-baomer': 'lag_baomer',
  shavuot: 'shavuot',
  'taanit-gedalia': 'taanit_gedalia',
  'tisha-bav': 'tisha_bav',
  'asarah-btevet': 'asarah_btevet',
  'taanit-esther': 'taanit_esther',
  'shivah-asar-btamuz': 'shivah_asar_btamuz',
};

export function getHolidayKeyForMitzvahId(mitzvahId: string): string | undefined {
  return MITZVAH_ID_TO_HOLIDAY_KEY[mitzvahId];
}

export const FAST_SUBLABEL_BEGINS = 'תחילת הצום';
export const FAST_SUBLABEL_ENDS = 'סיום הצום';
export const SHABBAT_SUBLABEL_IN = 'כניסת שבת';
export const SHABBAT_SUBLABEL_OUT = 'הבדלה';
export const HOLIDAY_SUBLABEL_IN = 'כניסת החג';
export const HOLIDAY_SUBLABEL_OUT = 'יציאת החג';

export function isFastBeginsEvent(event: HebrewCalendarEvent): boolean {
  const desc = event.eventDesc?.toLowerCase() ?? '';
  if (desc === 'fast begins') {
    return true;
  }

  const plain = stripHebrewNikkud(event.titleHebrew);
  return plain.includes('תחילת הצום');
}

export function isFastEndsEvent(event: HebrewCalendarEvent): boolean {
  const desc = event.eventDesc?.toLowerCase() ?? '';
  if (desc === 'fast ends') {
    return true;
  }

  const plain = stripHebrewNikkud(event.titleHebrew);
  return plain.includes('סיום הצום') || plain.includes('סוף הצום');
}

function resolveHolidayKeyFromMitzvahIds(
  linkedMitzvahIds?: string[],
): string | undefined {
  if (!linkedMitzvahIds?.length) {
    return undefined;
  }

  for (const mitzvahId of linkedMitzvahIds) {
    const key = MITZVAH_ID_TO_HOLIDAY_KEY[mitzvahId];
    if (key) {
      return key;
    }
  }

  return undefined;
}

function resolveHebrewNameFromKeys(
  eventKey?: string,
  eventDesc?: string,
): string | undefined {
  if (eventKey) {
    const normalized = normalizeEventKey(eventKey);
    const fromKey = HEBCAL_EVENT_HEBREW_NAMES[normalized];
    if (fromKey) {
      return fromKey;
    }
  }

  if (eventDesc) {
    const normalized = normalizeEventKey(eventDesc);
    const fromDesc = HEBCAL_EVENT_HEBREW_NAMES[normalized];
    if (fromDesc) {
      return fromDesc;
    }
  }

  return undefined;
}

function isFastLifecycleKey(eventKey: string): boolean {
  const normalized = normalizeEventKey(eventKey);
  return normalized === 'fast begins' || normalized === 'fast ends';
}

export function resolveFastDisplayTitle(
  event: HebrewCalendarEvent,
  relatedEvents: HebrewCalendarEvent[] = [],
): string {
  const descriptor = resolveEventDescriptor(event);
  if (!isFastLifecycleKey(event.eventKey ?? '')) {
    return descriptor.titleHebrew;
  }

  const namedFastOnDate = relatedEvents.find(
    (candidate) =>
      candidate.dateKey === event.dateKey &&
      candidate.eventKey &&
      !isFastLifecycleKey(candidate.eventKey) &&
      (candidate.type === 'FAST' || candidate.type === 'HOLIDAY'),
  );

  if (namedFastOnDate) {
    return resolveEventDescriptor(namedFastOnDate).titleHebrew;
  }

  return descriptor.titleHebrew;
}

function toCanonicalHolidayKey(rawKey?: string): string | undefined {
  if (!rawKey) {
    return undefined;
  }

  const normalized = normalizeEventKey(rawKey);
  return EVENT_KEY_TO_HOLIDAY_KEY[normalized] ?? normalized;
}

export function resolveEventDescriptor(
  event: HebrewCalendarEvent,
): EventDescriptor {
  const holidayKey =
    resolveHolidayKeyFromMitzvahIds(event.linkedMitzvahIds) ??
    toCanonicalHolidayKey(event.eventKey);

  const titleHebrew =
    resolveHebrewNameFromKeys(event.eventKey, event.eventDesc) ??
    (holidayKey ? HEBCAL_EVENT_HEBREW_NAMES[holidayKey] : undefined) ??
    stripHebrewNikkud(event.titleHebrew);

  let themeKey: HolidayThemeKey = 'default';

  if (event.type === 'CANDLE_LIGHTING' || event.type === 'HAVDALAH') {
    themeKey = 'shabbat';
  } else if (event.type === 'FAST') {
    themeKey = 'fast';
    if (holidayKey && HOLIDAY_KEY_TO_THEME[holidayKey]) {
      themeKey = HOLIDAY_KEY_TO_THEME[holidayKey];
    }
  } else if (holidayKey) {
    themeKey = HOLIDAY_KEY_TO_THEME[holidayKey] ?? 'default';
  }

  return {
    holidayKey: holidayKey ?? 'other',
    titleHebrew,
    themeKey,
  };
}

export function resolveUpcomingEventType(
  event: HebrewCalendarEvent,
  options?: { isActiveFastEnd?: boolean },
): UpcomingEventType {
  if (event.type === 'CANDLE_LIGHTING') {
    return 'shabbat_in';
  }

  if (event.type === 'HAVDALAH') {
    return 'shabbat_out';
  }

  if (event.type === 'FAST') {
    if (options?.isActiveFastEnd || isFastEndsEvent(event)) {
      return 'fast_end';
    }
    if (isFastBeginsEvent(event)) {
      return 'fast_start';
    }
    return 'other';
  }

  if (event.type === 'HOLIDAY') {
    const plain = stripHebrewNikkud(event.titleHebrew);
    if (plain.includes('ערב')) {
      return 'holiday_in';
    }
    return 'holiday_day';
  }

  return 'other';
}

export function resolveFastSubLabel(
  event: HebrewCalendarEvent,
  isActiveFastEnd = false,
): string {
  if (isActiveFastEnd || isFastEndsEvent(event)) {
    return FAST_SUBLABEL_ENDS;
  }
  if (isFastBeginsEvent(event)) {
    return FAST_SUBLABEL_BEGINS;
  }
  return FAST_SUBLABEL_BEGINS;
}

export function buildHeroLabel(
  subLabel?: string,
  parashaName?: string,
): string {
  if (!subLabel) {
    return '';
  }

  if (parashaName) {
    return `${subLabel} · פרשת ${parashaName}`;
  }

  return subLabel;
}

/** Primary hero headline — combines structured title + subLabel for display. */
export function buildHeroHeadline(event: UpcomingEvent): string {
  if (event.eventType === 'fast_end') {
    return `סיום ${event.title}`;
  }

  if (event.eventType === 'fast_start') {
    return `תחילת ${event.title}`;
  }

  if (event.eventType === 'holiday_in') {
    return `כניסת ${event.title}`;
  }

  if (event.subLabel && event.parashaName) {
    return buildHeroLabel(event.subLabel, event.parashaName);
  }

  if (event.subLabel) {
    return event.subLabel;
  }

  return event.title;
}

export function toUpcomingEventDisplay(
  event: UpcomingEvent,
  nowMs = Date.now(),
): UpcomingEventDisplay {
  const remainingMs = Math.max(
    0,
    new Date(event.targetDate).getTime() - nowMs,
  );

  return {
    ...event,
    remainingMs,
    heroLabel: buildHeroHeadline(event),
  };
}
