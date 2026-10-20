import { getWeeklyParashaForDateKey } from '@/services/calendar/hebcalProvider';
import type { CalendarDayInfo, CalendarLocationInput } from '@/types/calendar';
import { getShabbatDateKeyForWeek } from '@/utils/parasha';
import { getCalendarDateKey, ISRAEL_TIMEZONE } from '@/utils/timezone';

import { CALENDAR_CACHE_STORAGE_KEY } from './constants';
import type { CalendarDiagnosticsSnapshot } from './types';

export function buildCalendarDiagnosticsSnapshot(
  dayInfo: CalendarDayInfo | null,
  options: {
    cacheKey?: string | null;
    fromCache: boolean;
    fallbackUsed: boolean;
    providerUsed?: string;
    error?: string | null;
    hebcalRawResult?: string | null;
  },
  location?: CalendarLocationInput,
): CalendarDiagnosticsSnapshot {
  const now = new Date();
  const localDateKey = getCalendarDateKey();
  const targetShabbatDate = getShabbatDateKeyForWeek(localDateKey);
  const hebcalFallback = getWeeklyParashaForDateKey(localDateKey, location);

  return {
    deviceLocalIso: now.toISOString(),
    localDateKey,
    timezone: ISRAEL_TIMEZONE,
    targetShabbatDate,
    providerUsed: options.providerUsed ?? 'Hebcal local',
    hebcalResult:
      options.hebcalRawResult ??
      (hebcalFallback?.hebrewName ?? hebcalFallback?.hebrewDisplayName ?? null),
    normalizedParashaName: dayInfo?.weeklyParasha?.hebrewName ?? null,
    fromCache: options.fromCache,
    cacheKey: options.cacheKey ?? null,
    cacheVersion: CALENDAR_CACHE_STORAGE_KEY,
    fallbackUsed: options.fallbackUsed,
    error: options.error ?? null,
    finalWeeklyParasha: dayInfo?.weeklyParasha?.hebrewName ?? null,
  };
}
