import { DEFAULT_PLACE_NAME } from '@/constants/defaultPlace';
import { getWeeklyParashaForDateKey } from '@/services/calendar/hebcalProvider';
import { buildCalendarDiagnosticsSnapshot } from '@/services/diagnostics/calendarDiagnostics';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { CALENDAR_CACHE_STORAGE_KEY } from '@/services/diagnostics/constants';
import type {
  CalendarDayInfo,
  CalendarHebrewMonth,
  CalendarLocationInput,
  HebrewCalendarEvent,
  HebrewCalendarProvider,
} from '@/types/calendar';
import {
  buildCalendarDayCacheKey,
  buildCalendarLocationCacheKey,
} from '@/utils/calendarLocation';
import { getCalendarDateKey } from '@/utils/timezone';
import { getJson, setJson } from '@/utils/storage';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = CALENDAR_CACHE_STORAGE_KEY;

interface CachedDayEntry {
  savedAt: number;
  data: CalendarDayInfo;
}

interface CalendarCacheStore {
  days: Record<string, CachedDayEntry>;
}

interface CachedMonthEntry {
  savedAt: number;
  data: CalendarHebrewMonth;
}

export class CalendarService {
  private monthCache = new Map<string, CachedMonthEntry>();

  constructor(private readonly provider: HebrewCalendarProvider) {}

  async getTodayInfo(
    location?: CalendarLocationInput,
  ): Promise<CalendarDayInfo> {
    const dateKey = getCalendarDateKey();
    return this.getDayInfo(dateKey, location);
  }

  async getDayInfo(
    dateKey: string,
    location?: CalendarLocationInput,
  ): Promise<CalendarDayInfo> {
    const cacheKey = this.buildCacheKey(dateKey, location);
    const cached = await this.readCache(cacheKey);

    if (cached) {
      const result = this.enrichDayInfoWithParasha(
        dateKey,
        { ...cached, freshness: 'cached' },
        location,
      );
      this.recordCalendarDiagnostics(result, {
        cacheKey,
        fromCache: true,
        fallbackUsed: false,
      }, location);
      return result;
    }

    try {
      const fresh = await this.withTimeout(
        this.provider.getDayInfo(dateKey, location),
        12000,
      );
      const enriched = this.enrichDayInfoWithParasha(dateKey, fresh, location);
      await this.writeCache(cacheKey, enriched);
      const result = { ...enriched, freshness: 'fresh' as const };
      this.recordCalendarDiagnostics(result, {
        cacheKey,
        fromCache: false,
        fallbackUsed: false,
      }, location);
      return result;
    } catch (error) {
      const stale = await this.readStaleCache(cacheKey);
      if (stale) {
        const result = this.enrichDayInfoWithParasha(
          dateKey,
          { ...stale, freshness: 'cached' },
          location,
        );
        this.recordCalendarDiagnostics(result, {
          cacheKey,
          fromCache: true,
          fallbackUsed: true,
          error: error instanceof Error ? error.message : 'provider_error',
        }, location);
        return result;
      }

      const parashaFallback = getWeeklyParashaForDateKey(dateKey, location);
      if (parashaFallback) {
        const result = {
          ...this.unavailableDayInfo(dateKey),
          weeklyParasha: parashaFallback,
          freshness: 'cached' as const,
        };
        this.recordCalendarDiagnostics(result, {
          cacheKey,
          fromCache: false,
          fallbackUsed: true,
          error: error instanceof Error ? error.message : 'provider_error',
        }, location);
        return result;
      }

      const unavailable = this.unavailableDayInfo(dateKey);
      this.recordCalendarDiagnostics(unavailable, {
        cacheKey,
        fromCache: false,
        fallbackUsed: true,
        error: error instanceof Error ? error.message : 'provider_error',
      }, location);
      return unavailable;
    }
  }

  async getHebrewMonth(
    hebrewYear: number,
    hebrewMonth: number,
    location?: CalendarLocationInput,
  ): Promise<CalendarHebrewMonth> {
    const cacheKey = `month:${hebrewYear}:${hebrewMonth}:${buildCalendarLocationCacheKey(location)}`;
    const cached = this.monthCache.get(cacheKey);

    if (cached && Date.now() - cached.savedAt <= CACHE_TTL_MS) {
      return this.withMonthFreshness(cached.data, 'cached');
    }

    try {
      const fresh = await this.withTimeout(
        this.provider.getHebrewMonth(hebrewYear, hebrewMonth, location),
        20000,
      );
      this.monthCache.set(cacheKey, { savedAt: Date.now(), data: fresh });
      return this.withMonthFreshness(fresh, 'fresh');
    } catch {
      if (cached) {
        return this.withMonthFreshness(cached.data, 'cached');
      }

      throw new Error('calendar_month_unavailable');
    }
  }

  async getUpcomingEvents(
    daysAhead = 30,
    location?: CalendarLocationInput,
  ): Promise<HebrewCalendarEvent[]> {
    try {
      return await this.withTimeout(
        this.provider.getUpcomingEvents(new Date(), daysAhead, location),
        10000,
      );
    } catch {
      return [];
    }
  }

  private buildCacheKey(
    dateKey: string,
    location?: CalendarLocationInput,
  ): string {
    return buildCalendarDayCacheKey(dateKey, location);
  }

  private async readCache(cacheKey: string): Promise<CalendarDayInfo | null> {
    const store = await getJson<CalendarCacheStore>(CACHE_KEY);
    const entry = store?.days[cacheKey];
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return entry.data;
  }

  private async readStaleCache(
    cacheKey: string,
  ): Promise<CalendarDayInfo | null> {
    const store = await getJson<CalendarCacheStore>(CACHE_KEY);
    return store?.days[cacheKey]?.data ?? null;
  }

  private async writeCache(
    cacheKey: string,
    data: CalendarDayInfo,
  ): Promise<void> {
    const store = (await getJson<CalendarCacheStore>(CACHE_KEY)) ?? {
      days: {},
    };
    store.days[cacheKey] = { savedAt: Date.now(), data };
    await setJson(CACHE_KEY, store);
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('calendar_provider_timeout'));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private enrichDayInfoWithParasha(
    dateKey: string,
    data: CalendarDayInfo,
    location?: CalendarLocationInput,
  ): CalendarDayInfo {
    if (data.weeklyParasha) {
      return data;
    }

    const weeklyParasha = getWeeklyParashaForDateKey(dateKey, location);
    if (!weeklyParasha) {
      return data;
    }

    return { ...data, weeklyParasha };
  }

  private recordCalendarDiagnostics(
    dayInfo: CalendarDayInfo,
    options: {
      cacheKey: string;
      fromCache: boolean;
      fallbackUsed: boolean;
      error?: string;
    },
    location?: CalendarLocationInput,
  ): void {
    if (!__DEV__) {
      return;
    }

    const snapshot = buildCalendarDiagnosticsSnapshot(dayInfo, options, location);
    useDiagnosticsStore.getState().setCalendarDiagnostics(snapshot);
    logDiagnosticEvent('CALENDAR', 'day_info_resolved', 'info', {
      parasha: snapshot.finalWeeklyParasha,
      fromCache: snapshot.fromCache,
      cacheVersion: snapshot.cacheVersion,
    });
  }

  private withMonthFreshness(
    month: CalendarHebrewMonth,
    freshness: CalendarDayInfo['freshness'],
  ): CalendarHebrewMonth {
    return {
      ...month,
      cells: month.cells.map((cell) => ({
        ...cell,
        dayInfo: { ...cell.dayInfo, freshness },
      })),
    };
  }

  private unavailableDayInfo(dateKey: string): CalendarDayInfo {
    return {
      gregorianDateKey: dateKey,
      hebrewDate: {
        day: 0,
        month: 0,
        monthName: '',
        year: 0,
        displayString: 'תאריך עברי לא זמין',
      },
      isShabbat: false,
      isFastDay: false,
      isHoliday: false,
      activeFastMitzvahIds: [],
      activeHolidayMitzvahIds: [],
      events: [],
      weeklyParasha: null,
      locationSource: 'fallback',
      locationLabel: `${DEFAULT_PLACE_NAME} (מיקום ברירת מחדל)`,
      freshness: 'unavailable',
    };
  }
}
