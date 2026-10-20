import {
  HOLIDAY_SUBLABEL_IN,
  HOLIDAY_SUBLABEL_OUT,
  isFastBeginsEvent,
  isFastEndsEvent,
  resolveEventDescriptor,
  resolveFastDisplayTitle,
  resolveFastSubLabel,
  resolveUpcomingEventType,
  SHABBAT_SUBLABEL_IN,
  SHABBAT_SUBLABEL_OUT,
  toUpcomingEventDisplay,
} from '@/constants/eventDescriptors';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type { EventType, UpcomingEvent, UpcomingEventDisplay } from '@/types/event';
import { stripHebrewNikkud } from '@/utils/hebrewText';

export { toUpcomingEventDisplay };

function mapCalendarTypeToEventType(
  type: HebrewCalendarEvent['type'],
  titleHebrew: string,
): EventType {
  if (type === 'CANDLE_LIGHTING' || titleHebrew.includes('הדלקת נרות')) {
    return 'SHABBAT_ENTRY';
  }

  if (type === 'HAVDALAH' || titleHebrew.includes('הבדלה')) {
    return 'SHABBAT_EXIT';
  }

  if (type === 'FAST') {
    return 'FAST';
  }

  if (type === 'HOLIDAY' || type === 'SHABBAT') {
    return 'HOLIDAY';
  }

  return 'HOLIDAY';
}

interface ActiveFastPair {
  begin: HebrewCalendarEvent;
  end: HebrewCalendarEvent;
  holidayKey: string;
}

function resolveFastHolidayKey(event: HebrewCalendarEvent): string {
  const descriptor = resolveEventDescriptor(event);
  return descriptor.holidayKey;
}

function shareFastMitzvahId(
  a: HebrewCalendarEvent,
  b: HebrewCalendarEvent,
): boolean {
  const aIds = a.linkedMitzvahIds ?? [];
  const bIds = b.linkedMitzvahIds ?? [];
  return aIds.some((id) => bIds.includes(id));
}

function findActiveFast(
  events: HebrewCalendarEvent[],
  nowMs: number,
): ActiveFastPair | null {
  const beginsByDate = new Map<string, HebrewCalendarEvent>();
  const endsByDate = new Map<string, HebrewCalendarEvent>();
  const begins: HebrewCalendarEvent[] = [];
  const ends: HebrewCalendarEvent[] = [];

  for (const event of events) {
    if (event.type !== 'FAST' || !event.startDate) {
      continue;
    }

    if (isFastBeginsEvent(event)) {
      begins.push(event);
      if (event.fastVariant === 'minor') {
        beginsByDate.set(event.dateKey, event);
      }
    } else if (isFastEndsEvent(event)) {
      ends.push(event);
      if (event.fastVariant === 'minor') {
        endsByDate.set(event.dateKey, event);
      }
    }
  }

  for (const [dateKey, end] of endsByDate) {
    const begin = beginsByDate.get(dateKey);
    if (!begin?.startDate || !end.startDate) {
      continue;
    }

    const beginMs = new Date(begin.startDate).getTime();
    const endMs = new Date(end.startDate).getTime();

    if (nowMs >= beginMs && nowMs < endMs) {
      return {
        begin,
        end,
        holidayKey: resolveFastHolidayKey(end),
      };
    }
  }

  for (const end of ends) {
    if (end.fastVariant !== 'major') {
      continue;
    }

    const begin = begins.find((candidate) => {
      if (candidate.fastVariant !== 'major' || !candidate.startDate) {
        return false;
      }

      if (shareFastMitzvahId(candidate, end)) {
        return true;
      }

      const beginMs = new Date(candidate.startDate).getTime();
      const endMs = new Date(end.startDate!).getTime();
      return beginMs < endMs && endMs - beginMs <= 36 * 60 * 60 * 1000;
    });

    if (!begin?.startDate || !end.startDate) {
      continue;
    }

    const beginMs = new Date(begin.startDate).getTime();
    const endMs = new Date(end.startDate).getTime();

    if (nowMs >= beginMs && nowMs < endMs) {
      return {
        begin,
        end,
        holidayKey: resolveFastHolidayKey(end),
      };
    }
  }

  return null;
}

const TIMER_RELEVANT_TYPES = new Set<HebrewCalendarEvent['type']>([
  'HOLIDAY',
  'FAST',
  'CANDLE_LIGHTING',
  'HAVDALAH',
]);

function isTimerRelevantEvent(event: HebrewCalendarEvent): boolean {
  return Boolean(event.startDate) && TIMER_RELEVANT_TYPES.has(event.type);
}

function findCoOccurringHoliday(
  event: HebrewCalendarEvent,
  allEvents: HebrewCalendarEvent[],
): HebrewCalendarEvent | null {
  if (event.type !== 'CANDLE_LIGHTING' && event.type !== 'HAVDALAH') {
    return null;
  }

  const sameDateHolidays = allEvents.filter((candidate) => {
    if (candidate.dateKey !== event.dateKey || candidate.type !== 'HOLIDAY') {
      return false;
    }

    const descriptor = resolveEventDescriptor(candidate);
    return descriptor.holidayKey !== 'other';
  });

  if (sameDateHolidays.length === 0) {
    return null;
  }

  const erevHoliday = sameDateHolidays.find((candidate) =>
    stripHebrewNikkud(candidate.titleHebrew).includes('ערב'),
  );

  return erevHoliday ?? sameDateHolidays[0];
}

function resolveParashaForShabbat(
  event: HebrewCalendarEvent,
  allEvents: HebrewCalendarEvent[],
): string | undefined {
  if (event.type !== 'CANDLE_LIGHTING') {
    return undefined;
  }

  const shabbatDateKey = event.dateKey;
  const parashaEvent = allEvents.find(
    (candidate) =>
      candidate.dateKey === shabbatDateKey &&
      candidate.type === 'SHABBAT' &&
      candidate.titleHebrew.includes('פרשת'),
  );

  if (!parashaEvent) {
    return undefined;
  }

  const match = parashaEvent.titleHebrew.match(/פרשת\s+(.+)/);
  return match?.[1]?.trim();
}

function buildStructuredEvent(
  event: HebrewCalendarEvent,
  allEvents: HebrewCalendarEvent[],
  options?: {
    fastStartDate?: string;
    isActiveFastEnd?: boolean;
    parashaName?: string;
    coHoliday?: HebrewCalendarEvent | null;
  },
): UpcomingEvent {
  const coHoliday =
    options?.coHoliday === undefined
      ? findCoOccurringHoliday(event, allEvents)
      : options.coHoliday;
  const descriptor = coHoliday
    ? resolveEventDescriptor(coHoliday)
    : resolveEventDescriptor(event);
  const eventType = coHoliday
    ? resolveUpcomingEventType(coHoliday)
    : resolveUpcomingEventType(event, {
        isActiveFastEnd: options?.isActiveFastEnd,
      });

  let title = descriptor.titleHebrew;
  let subLabel: string | undefined;
  let mappedType = mapCalendarTypeToEventType(event.type, event.titleHebrew);

  if (coHoliday && event.type === 'CANDLE_LIGHTING') {
    title = descriptor.titleHebrew;
    subLabel = HOLIDAY_SUBLABEL_IN;
    mappedType = 'HOLIDAY';
  } else if (coHoliday && event.type === 'HAVDALAH') {
    title = descriptor.titleHebrew;
    subLabel = HOLIDAY_SUBLABEL_OUT;
    mappedType = 'HOLIDAY';
  } else if (event.type === 'CANDLE_LIGHTING') {
    title = 'שבת';
    subLabel = SHABBAT_SUBLABEL_IN;
  } else if (event.type === 'HAVDALAH') {
    title = 'שבת';
    subLabel = SHABBAT_SUBLABEL_OUT;
  } else if (event.type === 'FAST') {
    title = resolveFastDisplayTitle(event, allEvents);
    subLabel = resolveFastSubLabel(event, options?.isActiveFastEnd);
  } else if (event.type === 'HOLIDAY') {
    subLabel = HOLIDAY_SUBLABEL_IN;
  }

  const parashaName =
    options?.parashaName ?? resolveParashaForShabbat(event, allEvents);

  return {
    id: event.id,
    type: mappedType,
    eventType,
    title,
    subLabel,
    targetDate: event.startDate ?? '',
    displayTime: event.startTime,
    fastStartDate: options?.fastStartDate,
    fastVariant: event.fastVariant,
    themeKey: descriptor.themeKey,
    holidayKey: descriptor.holidayKey,
    hebcalEventId: event.id,
    parashaName,
  };
}

export function mapCalendarEventToUpcoming(
  event: HebrewCalendarEvent,
  allEvents: HebrewCalendarEvent[] = [],
  options?: {
    fastStartDate?: string;
    isActiveFastEnd?: boolean;
    parashaName?: string;
  },
): UpcomingEvent {
  return buildStructuredEvent(event, allEvents, options);
}

function eventPriorityScore(
  event: HebrewCalendarEvent,
  allEvents: HebrewCalendarEvent[],
): number {
  const coHoliday = findCoOccurringHoliday(event, allEvents);
  if (coHoliday) {
    return 30;
  }

  if (event.type === 'HOLIDAY') {
    return 25;
  }

  if (event.type === 'FAST') {
    return 20;
  }

  if (event.type === 'CANDLE_LIGHTING' || event.type === 'HAVDALAH') {
    return 10;
  }

  return 0;
}

export function pickNextUpcomingEvent(
  events: HebrewCalendarEvent[],
  nowMs = Date.now(),
): UpcomingEvent | null {
  if (events.length === 0) {
    return null;
  }

  const activeFast = findActiveFast(events, nowMs);

  if (activeFast) {
    return buildStructuredEvent(activeFast.end, events, {
      fastStartDate: activeFast.begin.startDate,
      isActiveFastEnd: true,
    });
  }

  const upcoming = events
    .filter((event) => {
      if (!isTimerRelevantEvent(event)) {
        return false;
      }

      return new Date(event.startDate!).getTime() > nowMs;
    })
    .sort((left, right) => {
      const leftMs = new Date(left.startDate!).getTime();
      const rightMs = new Date(right.startDate!).getTime();

      if (leftMs !== rightMs) {
        return leftMs - rightMs;
      }

      return (
        eventPriorityScore(right, events) - eventPriorityScore(left, events)
      );
    });

  const next = upcoming[0];

  if (!next) {
    return null;
  }

  return buildStructuredEvent(next, events);
}

export function pickNextUpcomingEventDisplay(
  events: HebrewCalendarEvent[],
  nowMs = Date.now(),
): UpcomingEventDisplay | null {
  const event = pickNextUpcomingEvent(events, nowMs);
  if (!event) {
    return null;
  }

  return toUpcomingEventDisplay(event, nowMs);
}
