import type {
  CalendarDayInfo,
  CalendarLocationInput,
  HebrewCalendarEvent,
  HebrewCalendarProvider,
} from '@/types/calendar';
import { buildCalendarDayCacheKey } from '@/utils/calendarLocation';
import { getCalendarDateKey } from '@/utils/timezone';
import { getJson, setJson } from '@/utils/storage';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CachedDayEntry {
  savedAt: number;
  data: CalendarDayInfo;
}

interface CalendarCacheStore {
  days: Record<string, CachedDayEntry>;
}

const CACHE_KEY = '@mitzvahapp/calendar_cache_v1';

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
      return { ...cached, freshness: 'cached' };
    }

    try {
      const fresh = await this.withTimeout(
        this.provider.getDayInfo(dateKey, location),
        8000,
      );
      await this.writeCache(cacheKey, fresh);
      return { ...fresh, freshness: 'fresh' };
    } catch {
      const stale = await this.readStaleCache(cacheKey);
      if (stale) {
        return { ...stale, freshness: 'cached' };
      }

      return this.unavailableDayInfo(dateKey);
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
