import {
  Event,
  flags,
  HDate,
  HebrewCalendar,
  Location,
  Zmanim,
} from '@hebcal/core';

import {
  FAST_MITZVAH_IDS,
  getMitzvahIdsForEventTitle,
  HOLIDAY_MITZVAH_IDS,
  normalizeEventKey,
} from '@/constants/calendarMitzvahMap';
import type {
  CalendarDayInfo,
  CalendarHebrewMonth,
  CalendarLocationInput,
  CalendarLocationSource,
  HebrewCalendarEvent,
  HebrewCalendarEventType,
  HebrewCalendarProvider,
  HebrewDateParts,
  WeeklyParasha,
} from '@/types/calendar';
import {
  buildHebrewMonthGridKeys,
  formatGregorianRangeLabel,
} from '@/services/calendar/hebrewMonthGrid';
import { buildCalendarLocationCacheKey } from '@/utils/calendarLocation';
import {
  buildWeeklyParashaFromEvent,
  findWeeklyParashaForDate,
  getShabbatDateKeyForWeek,
  isParashaEvent,
} from '@/utils/parasha';
import { DEFAULT_PLACE_COORDINATES, DEFAULT_PLACE_NAME } from '@/constants/defaultPlace';
import {
  addDaysToDateKey,
  formatIsraelTime,
  getCalendarDateKey,
  ISRAEL_TIMEZONE,
  parseDateKey,
} from '@/utils/timezone';

const HEBREW_MONTH_NAMES = [
  '',
  'ניסן',
  'אייר',
  'סיוון',
  'תמוז',
  'אב',
  'אלול',
  'תשרי',
  'חשוון',
  'כסלו',
  'טבת',
  'שבט',
  'אדר',
  'אדר ב׳',
];

const FALLBACK_LOCATION_LABEL = `${DEFAULT_PLACE_NAME} (מיקום ברירת מחדל)`;

const DEFAULT_LOCATION = new Location(
  DEFAULT_PLACE_COORDINATES.latitude,
  DEFAULT_PLACE_COORDINATES.longitude,
  true,
  ISRAEL_TIMEZONE,
  DEFAULT_PLACE_NAME,
  'IL',
);

const yearEventsCache = new Map<string, Event[]>();

interface ResolvedCalendarLocation {
  location: Location;
  source: CalendarLocationSource;
  label: string;
}

function resolveLocation(
  locationInput?: CalendarLocationInput,
): ResolvedCalendarLocation {
  if (
    locationInput?.latitude !== undefined &&
    locationInput?.longitude !== undefined
  ) {
    return {
      location: new Location(
        locationInput.latitude,
        locationInput.longitude,
        true,
        ISRAEL_TIMEZONE,
        'Israel',
        'IL',
      ),
      source: 'gps',
      label: 'מיקום נוכחי',
    };
  }

  return {
    location: DEFAULT_LOCATION,
    source: 'fallback',
    label: FALLBACK_LOCATION_LABEL,
  };
}

function gregorianDateKeyFromHDate(hd: HDate): string {
  const gregorian = hd.greg();
  const year = gregorian.getFullYear();
  const month = String(gregorian.getMonth() + 1).padStart(2, '0');
  const day = String(gregorian.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toHebrewDateParts(hd: HDate): HebrewDateParts {
  const month = hd.getMonth();
  const monthName = HEBREW_MONTH_NAMES[month] ?? `חודש ${month}`;
  return {
    day: hd.getDate(),
    month,
    monthName,
    year: hd.getFullYear(),
    displayString: hd.renderGematriya(true),
  };
}

function isTimedEvent(ev: Event): ev is Event & { eventTime: Date } {
  return 'eventTime' in ev && ev.eventTime instanceof Date;
}

function classifyEventType(ev: Event): HebrewCalendarEventType {
  const desc = ev.getDesc().toLowerCase();
  const eventFlags = ev.getFlags();

  if (
    eventFlags & flags.LIGHT_CANDLES ||
    desc.includes('candle lighting')
  ) {
    return 'CANDLE_LIGHTING';
  }

  if (desc.includes('havdalah')) {
    return 'HAVDALAH';
  }

  if (eventFlags & flags.CHAG) {
    return 'HOLIDAY';
  }

  if (eventFlags & (flags.MINOR_FAST | flags.MAJOR_FAST)) {
    return 'FAST';
  }

  if (eventFlags & flags.ROSH_CHODESH) {
    return 'ROSH_CHODESH';
  }

  if (isParashaEvent(ev) || desc.includes('shabbat')) {
    return 'SHABBAT';
  }

  return 'OTHER';
}

function resolveFastVariant(ev: Event): 'major' | 'minor' | undefined {
  const eventFlags = ev.getFlags();
  if (eventFlags & flags.MAJOR_FAST) {
    return 'major';
  }
  if (eventFlags & flags.MINOR_FAST) {
    return 'minor';
  }
  return undefined;
}

function mapHebcalEvent(ev: Event, dateKey: string): HebrewCalendarEvent {
  const type = classifyEventType(ev);
  const titleHebrew = ev.render('he');
  const eventDesc = ev.getDesc();
  const eventKey = normalizeEventKey(ev.basename());
  const linkedMitzvahIds = [
    ...getMitzvahIdsForEventTitle(ev.basename()),
    ...getMitzvahIdsForEventTitle(ev.getDesc()),
  ].filter((value, index, array) => array.indexOf(value) === index);

  let startTime: string | undefined;
  let startDate: string | undefined;

  if (isTimedEvent(ev)) {
    startTime = formatIsraelTime(ev.eventTime);
    startDate = ev.eventTime.toISOString();
  }

  const fastVariant = type === 'FAST' ? resolveFastVariant(ev) : undefined;

  return {
    id: `${eventKey}-${dateKey}-${type}`,
    type,
    titleHebrew,
    eventDesc,
    dateKey,
    startDate,
    startTime,
    fastVariant,
    eventKey,
    linkedMitzvahIds,
  };
}

function buildYearCacheKey(year: number, location: Location): string {
  const lat = location.getLatitude().toFixed(3);
  const lng = location.getLongitude().toFixed(3);
  return `${year}:${lat},${lng}`;
}

function getEventsForYear(year: number, location: Location): Event[] {
  const cacheKey = buildYearCacheKey(year, location);
  const cached = yearEventsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location,
    sedrot: true,
  });

  yearEventsCache.set(cacheKey, events);
  return events;
}

function collectEventsForDate(dateKey: string, location: Location): Event[] {
  const date = parseDateKey(dateKey);
  const year = date.getFullYear();

  const allEvents = [
    ...getEventsForYear(year - 1, location),
    ...getEventsForYear(year, location),
    ...getEventsForYear(year + 1, location),
  ];

  return allEvents.filter(
    (ev) => gregorianDateKeyFromHDate(ev.getDate()) === dateKey,
  );
}

function collectRawEventsForRange(
  startDateKey: string,
  endDateKey: string,
  location: Location,
): Event[] {
  const start = parseDateKey(startDateKey);
  const end = parseDateKey(endDateKey);
  const years = new Set<number>();

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    years.add(cursor.getFullYear());
    years.add(cursor.getFullYear() - 1);
    years.add(cursor.getFullYear() + 1);
  }

  const allEvents: Event[] = [];
  for (const year of years) {
    allEvents.push(...getEventsForYear(year, location));
  }

  return allEvents;
}

function buildWeeklyParasha(
  dateKey: string,
  location: Location,
): WeeklyParasha | null {
  const shabbatDateKey = getShabbatDateKeyForWeek(dateKey);
  const rawEvents = collectRawEventsForRange(
    shabbatDateKey,
    shabbatDateKey,
    location,
  );
  return findWeeklyParashaForDate(dateKey, rawEvents);
}

function buildDayInfo(
  dateKey: string,
  resolved: ResolvedCalendarLocation,
): CalendarDayInfo {
  const { location, source, label } = resolved;
  const date = parseDateKey(dateKey);
  const hd = new HDate(date);
  const hebrewDate = toHebrewDateParts(hd);
  const rawEvents = collectEventsForDate(dateKey, location);
  const events = rawEvents.map((ev) => mapHebcalEvent(ev, dateKey));
  const weeklyParasha = buildWeeklyParasha(dateKey, location);

  const activeFastMitzvahIds = new Set<string>();
  const activeHolidayMitzvahIds = new Set<string>();

  for (const event of events) {
    for (const mitzvahId of event.linkedMitzvahIds ?? []) {
      if (FAST_MITZVAH_IDS.has(mitzvahId)) {
        activeFastMitzvahIds.add(mitzvahId);
      }
      if (HOLIDAY_MITZVAH_IDS.has(mitzvahId)) {
        activeHolidayMitzvahIds.add(mitzvahId);
      }
    }
  }

  const isShabbat =
    date.getDay() === 6 ||
    events.some(
      (event) =>
        event.type === 'SHABBAT' ||
        event.titleHebrew.includes('שבת'),
    );

  return {
    gregorianDateKey: dateKey,
    hebrewDate,
    isShabbat,
    isFastDay: activeFastMitzvahIds.size > 0,
    isHoliday: activeHolidayMitzvahIds.size > 0,
    activeFastMitzvahIds: [...activeFastMitzvahIds],
    activeHolidayMitzvahIds: [...activeHolidayMitzvahIds],
    events,
    weeklyParasha,
    locationSource: source,
    locationLabel: label,
    freshness: 'fresh',
  };
}

function eventToUpcoming(ev: Event): HebrewCalendarEvent | null {
  const dateKey = gregorianDateKeyFromHDate(ev.getDate());
  const mapped = mapHebcalEvent(ev, dateKey);

  const relevantTypes: HebrewCalendarEventType[] = [
    'HOLIDAY',
    'FAST',
    'CANDLE_LIGHTING',
    'HAVDALAH',
  ];

  if (!relevantTypes.includes(mapped.type)) {
    return null;
  }

  if (
    (mapped.type === 'CANDLE_LIGHTING' ||
      mapped.type === 'HAVDALAH' ||
      mapped.type === 'FAST') &&
    !mapped.startTime
  ) {
    return null;
  }

  return mapped;
}

export class HebcalCalendarProvider implements HebrewCalendarProvider {
  async getDayInfo(
    dateKey: string,
    locationInput?: CalendarLocationInput,
  ): Promise<CalendarDayInfo> {
    const resolved = resolveLocation(locationInput);
    return buildDayInfo(dateKey, resolved);
  }

  async getHebrewMonth(
    hebrewYear: number,
    hebrewMonth: number,
    locationInput?: CalendarLocationInput,
  ): Promise<CalendarHebrewMonth> {
    const resolved = resolveLocation(locationInput);
    const monthStart = new HDate(1, hebrewMonth, hebrewYear);
    const firstDateKey = gregorianDateKeyFromHDate(monthStart);
    const keys = buildHebrewMonthGridKeys(
      firstDateKey,
      monthStart.daysInMonth(),
      monthStart.getDay(),
    );
    const cells = keys.map((key) => ({
      dateKey: key.dateKey,
      inCurrentMonth: key.inCurrentMonth,
      dayInfo: buildDayInfo(key.dateKey, resolved),
    }));
    const inMonth = cells.filter((cell) => cell.inCurrentMonth);
    const firstInMonth = inMonth[0];
    const lastInMonth = inMonth[inMonth.length - 1];
    const hebrewYearLabel =
      monthStart
        .renderGematriya(true)
        .replace(/[\u0591-\u05C7]/g, '')
        .trim()
        .split(/\s+/)
        .at(-1) ?? String(hebrewYear);

    return {
      hebrewYear: monthStart.getFullYear(),
      hebrewMonth: monthStart.getMonth(),
      hebrewMonthName:
        firstInMonth?.dayInfo.hebrewDate.monthName ??
        HEBREW_MONTH_NAMES[hebrewMonth] ??
        '',
      hebrewYearLabel,
      gregorianRangeLabel: formatGregorianRangeLabel(
        firstInMonth?.dateKey ?? firstDateKey,
        lastInMonth?.dateKey ?? firstDateKey,
      ),
      cells,
    };
  }

  async getUpcomingEvents(
    fromDate: Date,
    daysAhead: number,
    locationInput?: CalendarLocationInput,
  ): Promise<HebrewCalendarEvent[]> {
    const resolved = resolveLocation(locationInput);
    const location = resolved.location;
    const startKey = getCalendarDateKey(fromDate);
    const start = parseDateKey(startKey);
    const end = new Date(start);
    end.setDate(end.getDate() + daysAhead);
    const endKey = getCalendarDateKey(end);

    const allRawEvents = collectRawEventsForRange(startKey, endKey, location);

    const nowMs = fromDate.getTime();
    const upcoming: HebrewCalendarEvent[] = [];

    for (const ev of allRawEvents) {
      const mapped = eventToUpcoming(ev);
      if (!mapped) {
        continue;
      }

      if (!mapped.startDate) {
        continue;
      }

      const eventMs = new Date(mapped.startDate).getTime();

      if (eventMs > nowMs) {
        upcoming.push(mapped);
      }
    }

    upcoming.sort((a, b) => {
      const aMs = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bMs = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aMs - bMs;
    });

    return upcoming;
  }
}

export const hebcalCalendarProvider = new HebcalCalendarProvider();

/** Test helper: clears in-memory year cache between deterministic runs. */
export function clearHebcalYearCache(): void {
  yearEventsCache.clear();
}

/** Test helper: exposes location cache key format used for year/event caches. */
export function buildHebcalLocationCacheKey(
  locationInput?: CalendarLocationInput,
): string {
  return buildCalendarLocationCacheKey(locationInput);
}

/** Test helper: builds weekly parasha for a date without async wrapper. */
export function getWeeklyParashaForDateKey(
  dateKey: string,
  locationInput?: CalendarLocationInput,
): WeeklyParasha | null {
  const resolved = resolveLocation(locationInput);
  return buildWeeklyParasha(dateKey, resolved.location);
}

/** Test helper: candle-lighting time for a Friday date key at a location. */
export function getCandleLightingForDateKey(
  dateKey: string,
  locationInput?: CalendarLocationInput,
): HebrewCalendarEvent | null {
  const resolved = resolveLocation(locationInput);
  const rawEvents = collectEventsForDate(dateKey, resolved.location);
  const candle = rawEvents.find(
    (ev) => classifyEventType(ev) === 'CANDLE_LIGHTING',
  );

  if (!candle) {
    return null;
  }

  return mapHebcalEvent(candle, dateKey);
}

/** Test helper: exposes resolved location source for verification. */
export function getResolvedLocationSource(
  locationInput?: CalendarLocationInput,
): CalendarLocationSource {
  return resolveLocation(locationInput).source;
}

/**
 * Same location the calendar already resolved. Read-only for zmanim display.
 * Does not change event or parasha calculation.
 */
export function getCalendarLocation(locationInput?: CalendarLocationInput): {
  location: Location;
  source: CalendarLocationSource;
  label: string;
} {
  return resolveLocation(locationInput);
}

/** Test helper: build parasha from a raw Hebcal event. */
export { buildWeeklyParashaFromEvent };

export interface OccasionReminderContext {
  events: HebrewCalendarEvent[];
}

function isOccasionReminderEvent(event: HebrewCalendarEvent): boolean {
  if (
    event.type === 'CANDLE_LIGHTING' ||
    event.type === 'FAST' ||
    event.type === 'HOLIDAY'
  ) {
    return true;
  }

  return (event.linkedMitzvahIds ?? []).some(
    (mitzvahId) =>
      FAST_MITZVAH_IDS.has(mitzvahId) || HOLIDAY_MITZVAH_IDS.has(mitzvahId),
  );
}

/**
 * Holiday and fast events for the next occurrence window, including untimed
 * holiday days that {@link HebcalCalendarProvider.getUpcomingEvents} drops.
 */
export function getOccasionReminderContext(
  fromDate: Date,
  daysAhead: number,
  locationInput?: CalendarLocationInput,
): OccasionReminderContext {
  const resolved = resolveLocation(locationInput);
  const startKey = addDaysToDateKey(getCalendarDateKey(fromDate), -2);
  const endKey = addDaysToDateKey(getCalendarDateKey(fromDate), daysAhead);
  const rawEvents = collectRawEventsForRange(
    startKey,
    endKey,
    resolved.location,
  );
  const events: HebrewCalendarEvent[] = [];
  const seen = new Set<string>();

  for (const ev of rawEvents) {
    const dateKey = gregorianDateKeyFromHDate(ev.getDate());
    if (dateKey < startKey || dateKey > endKey) {
      continue;
    }

    const mapped = mapHebcalEvent(ev, dateKey);
    if (!isOccasionReminderEvent(mapped) || seen.has(mapped.id)) {
      continue;
    }

    seen.add(mapped.id);
    events.push(mapped);
  }

  return { events };
}

export function formatHebrewDateLabelForDateKey(dateKey: string): string {
  const hd = new HDate(parseDateKey(dateKey));
  return hd.renderGematriya(true);
}

export function getSunsetIsoForDateKey(
  dateKey: string,
  locationInput?: CalendarLocationInput,
): string | null {
  try {
    const sunset = new Zmanim(
      resolveLocation(locationInput).location,
      parseDateKey(dateKey),
      false,
    ).sunset();
    if (!(sunset instanceof Date) || Number.isNaN(sunset.getTime())) {
      return null;
    }

    return sunset.toISOString();
  } catch {
    return null;
  }
}
