import { FAST_MITZVAH_IDS } from '@/constants/calendarMitzvahMap';
import {
  getHolidayKeyForMitzvahId,
  isFastBeginsEvent,
  isFastEndsEvent,
  resolveEventDescriptor,
  resolveFastDisplayTitle,
} from '@/constants/eventDescriptors';
import type { HebrewCalendarEvent } from '@/types/calendar';
import { formatIsraelTime } from '@/utils/timezone';

export interface MitzvahFastContext {
  titleHebrew: string;
  holidayKey: string;
  beginTime?: string;
  endTime?: string;
  isActive: boolean;
}

function shareFastMitzvahId(
  a: HebrewCalendarEvent,
  b: HebrewCalendarEvent,
): boolean {
  const aIds = a.linkedMitzvahIds ?? [];
  const bIds = b.linkedMitzvahIds ?? [];
  return aIds.some((id) => bIds.includes(id));
}

function eventMatchesMitzvah(
  event: HebrewCalendarEvent,
  mitzvahId: string,
  holidayKey: string,
): boolean {
  if (event.linkedMitzvahIds?.includes(mitzvahId)) {
    return true;
  }

  return resolveEventDescriptor(event).holidayKey === holidayKey;
}

function formatEventTime(event: HebrewCalendarEvent | undefined): string | undefined {
  if (!event) {
    return undefined;
  }

  if (event.startTime) {
    return event.startTime;
  }

  if (event.startDate) {
    return formatIsraelTime(new Date(event.startDate));
  }

  return undefined;
}

function findFastPairForMitzvah(
  events: HebrewCalendarEvent[],
  mitzvahId: string,
  holidayKey: string,
  nowMs: number,
): { begin?: HebrewCalendarEvent; end?: HebrewCalendarEvent; isActive: boolean } | null {
  const relevant = events.filter((event) =>
    eventMatchesMitzvah(event, mitzvahId, holidayKey),
  );

  const begins = relevant.filter(
    (event) => event.type === 'FAST' && isFastBeginsEvent(event) && event.startDate,
  );
  const ends = relevant.filter(
    (event) => event.type === 'FAST' && isFastEndsEvent(event) && event.startDate,
  );

  for (const end of ends) {
    if (end.fastVariant !== 'major') {
      const begin = begins.find((candidate) => candidate.dateKey === end.dateKey);
      if (begin?.startDate && end.startDate) {
        const beginMs = new Date(begin.startDate).getTime();
        const endMs = new Date(end.startDate).getTime();
        if (nowMs >= beginMs && nowMs < endMs) {
          return { begin, end, isActive: true };
        }
      }
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

    if (begin?.startDate && end.startDate) {
      const beginMs = new Date(begin.startDate).getTime();
      const endMs = new Date(end.startDate).getTime();
      if (nowMs >= beginMs && nowMs < endMs) {
        return { begin, end, isActive: true };
      }
    }
  }

  const upcomingBegin = begins
    .map((event) => ({
      event,
      startMs: new Date(event.startDate!).getTime(),
    }))
    .filter(({ startMs }) => startMs > nowMs)
    .sort((a, b) => a.startMs - b.startMs)[0]?.event;

  if (upcomingBegin) {
    const end = ends.find((candidate) => {
      if (!candidate.startDate || !upcomingBegin.startDate) {
        return false;
      }

      if (candidate.dateKey === upcomingBegin.dateKey) {
        return true;
      }

      if (upcomingBegin.fastVariant === 'major') {
        return shareFastMitzvahId(upcomingBegin, candidate);
      }

      return false;
    });

    return { begin: upcomingBegin, end, isActive: false };
  }

  const namedFast = relevant.find(
    (event) =>
      event.type === 'FAST' &&
      !isFastBeginsEvent(event) &&
      !isFastEndsEvent(event),
  );

  if (namedFast) {
    const begin = begins.find((candidate) => candidate.dateKey === namedFast.dateKey);
    const end = ends.find((candidate) => candidate.dateKey === namedFast.dateKey);
    if (begin || end) {
      return { begin, end, isActive: false };
    }
  }

  return null;
}

export function resolveMitzvahFastContext(
  mitzvahId: string,
  events: HebrewCalendarEvent[],
  nowMs = Date.now(),
): MitzvahFastContext | null {
  if (!FAST_MITZVAH_IDS.has(mitzvahId)) {
    return null;
  }

  const holidayKey = getHolidayKeyForMitzvahId(mitzvahId);
  if (!holidayKey) {
    return null;
  }

  const pair = findFastPairForMitzvah(events, mitzvahId, holidayKey, nowMs);
  if (!pair) {
    return null;
  }

  const titleEvent = pair.end ?? pair.begin;
  if (!titleEvent) {
    return null;
  }

  return {
    titleHebrew: resolveFastDisplayTitle(titleEvent, events),
    holidayKey,
    beginTime: formatEventTime(pair.begin),
    endTime: formatEventTime(pair.end),
    isActive: pair.isActive,
  };
}
