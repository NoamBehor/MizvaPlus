/** Coarse event category kept for notifications and legacy consumers. */
export type EventType =
  | 'SHABBAT_ENTRY'
  | 'SHABBAT_EXIT'
  | 'MITZVAH'
  | 'FAST'
  | 'HOLIDAY';

/** Structured lifecycle phase for countdown display. */
export type UpcomingEventType =
  | 'fast_start'
  | 'fast_end'
  | 'shabbat_in'
  | 'shabbat_out'
  | 'holiday_in'
  | 'holiday_out'
  | 'holiday_day'
  | 'other';

export type HolidayThemeKey =
  | 'default'
  | 'shabbat'
  | 'rosh_hashanah'
  | 'yom_kippur'
  | 'sukkot'
  | 'shemini_atzeret'
  | 'simchat_torah'
  | 'pesach'
  | 'shavuot'
  | 'purim'
  | 'shushan_purim'
  | 'hanukkah'
  | 'lag_baomer'
  | 'tu_bshvat'
  | 'fast';

export interface UpcomingEvent {
  id: string;
  /** Legacy coarse type — notifications and existing consumers. */
  type: EventType;
  eventType: UpcomingEventType;
  /** Primary label, e.g. "צום גדליה", "ראש השנה", "שבת". */
  title: string;
  /** Lifecycle sub-label, e.g. "סיום הצום", "כניסת שבת". */
  subLabel?: string;
  targetDate: string;
  /** HH:mm in Israel local time when the provider supplies a timed event. */
  displayTime?: string;
  /** Dawn start of an in-progress fast (minor and major). */
  fastStartDate?: string;
  fastVariant?: 'major' | 'minor';
  themeKey: HolidayThemeKey;
  /** Canonical holiday key for context engine, e.g. "rosh_hashanah". */
  holidayKey?: string;
  hebcalEventId?: string;
  /** Parasha name without prefix, e.g. "האזינו". */
  parashaName?: string;
}

/** Runtime view model for Home hero — includes computed remaining time. */
export interface UpcomingEventDisplay extends UpcomingEvent {
  remainingMs: number;
  /** Combined hero label derived from subLabel + parasha when relevant. */
  heroLabel: string;
}
