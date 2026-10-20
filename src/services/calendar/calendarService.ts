import { getWeeklyParashaForDateKey } from '@/services/calendar/hebcalProvider';
import { buildCalendarDiagnosticsSnapshot } from '@/services/diagnostics/calendarDiagnostics';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { CALENDAR_CACHE_STORAGE_KEY } from '@/services/diagnostics/constants';
import type {
  CalendarDayInfo,
  CalendarLocationInput,
  HebrewCalendarEvent,
  HebrewCalendarProvider,
} from '@/types/calendar';
import { buildCalendarDayCacheKey } from '@/utils/calendarLocation';
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

export class CalendarService {
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
      locationLabel: 'ירושלים (מיקום ברירת מחדל)',
      freshness: 'unavailable',
    };
  }
}
