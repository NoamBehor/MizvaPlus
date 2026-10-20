export type HebrewCalendarEventType =
  | 'SHABBAT'
  | 'HOLIDAY'
  | 'FAST'
  | 'ROSH_CHODESH'
  | 'CANDLE_LIGHTING'
  | 'HAVDALAH'
  | 'OTHER';

export type CalendarDataFreshness = 'fresh' | 'cached' | 'unavailable';

export type CalendarLocationSource = 'gps' | 'fallback';

export interface WeeklyParasha {
  /** Full Hebrew label, e.g. "פרשת ראה". */
  hebrewName: string;
  /** Parasha name without prefix, e.g. "ראה" or "מטות־מסעי". */
  hebrewDisplayName: string;
  /** Gregorian date key (YYYY-MM-DD) of the Shabbat this parasha is read. */
  shabbatDateKey: string;
  /** Hebrew date of Shabbat, e.g. "י״ג באב תשפ״ו". */
  hebrewDate?: string;
  /** Localized Shabbat date label for display. */
  gregorianDate?: string;
  /** Hebcal basename key, e.g. "Matot-Masei". */
  basename?: string;
}

export interface HebrewDateParts {
  day: number;
  month: number;
  monthName: string;
  year: number;
  displayString: string;
}

export type FastVariant = 'major' | 'minor';

export interface HebrewCalendarEvent {
  id: string;
  type: HebrewCalendarEventType;
  titleHebrew: string;
  /** Raw Hebcal descriptor, e.g. "Fast begins" / "Fast ends". */
  eventDesc?: string;
  dateKey: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  fastVariant?: FastVariant;
  /** Hebcal event key used for mitzvah mapping */
  eventKey?: string;
  linkedMitzvahIds?: string[];
}

export interface CalendarDayInfo {
  gregorianDateKey: string;
  hebrewDate: HebrewDateParts;
  isShabbat: boolean;
  isFastDay: boolean;
  isHoliday: boolean;
  activeFastMitzvahIds: string[];
  activeHolidayMitzvahIds: string[];
  events: HebrewCalendarEvent[];
  weeklyParasha: WeeklyParasha | null;
  locationSource: CalendarLocationSource;
  locationLabel: string;
  freshness: CalendarDataFreshness;
}

export interface CalendarLocationInput {
  latitude?: number;
  longitude?: number;
}

export interface HebrewCalendarProvider {
  getDayInfo(
    dateKey: string,
    location?: CalendarLocationInput,
  ): Promise<CalendarDayInfo>;
  getUpcomingEvents(
    fromDate: Date,
    daysAhead: number,
    location?: CalendarLocationInput,
  ): Promise<HebrewCalendarEvent[]>;
}
