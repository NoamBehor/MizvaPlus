import type {
  EventType,
  HolidayThemeKey,
  UpcomingEventType,
} from '@/types/event';

export type TimerThemeKey =
  | 'shabbat'
  | 'yom_tov'
  | 'rosh_hashana'
  | 'sukkot'
  | 'fast'
  | 'default';

export type TimerDecorativeMode =
  | 'candles'
  | 'pomegranate'
  | 'harvest'
  | 'stars'
  | 'none';

export interface TimerTheme {
  key: TimerThemeKey;
  gradient: [string, string];
  accent: string;
  textColor: string;
  labelColor: string;
  icon?: string;
  decorativeMode: TimerDecorativeMode;
}

export interface TimerThemeContext {
  type: EventType;
  eventType: UpcomingEventType;
  themeKey?: HolidayThemeKey;
  holidayKey?: string;
  title?: string;
  subLabel?: string;
  isActiveFast?: boolean;
}

export const TIMER_THEMES: Record<TimerThemeKey, TimerTheme> = {
  rosh_hashana: {
    key: 'rosh_hashana',
    gradient: ['#991B1B', '#7F1D1D'],
    accent: '#D4AF37',
    textColor: '#FFF8E7',
    labelColor: 'rgba(255, 248, 231, 0.82)',
    icon: '🍎',
    decorativeMode: 'pomegranate',
  },
  sukkot: {
    key: 'sukkot',
    gradient: ['#14532D', '#166534'],
    accent: '#CA8A04',
    textColor: '#F5F0E8',
    labelColor: 'rgba(245, 240, 232, 0.82)',
    icon: '🌿',
    decorativeMode: 'harvest',
  },
  fast: {
    key: 'fast',
    gradient: ['#0F172A', '#020617'],
    accent: '#94A3B8',
    textColor: '#E2E8F0',
    labelColor: 'rgba(226, 232, 240, 0.78)',
    icon: '✦',
    decorativeMode: 'stars',
  },
  shabbat: {
    key: 'shabbat',
    gradient: ['#0B1536', '#1E3A8A'],
    accent: '#FDE68A',
    textColor: '#FEF9C3',
    labelColor: 'rgba(254, 249, 195, 0.8)',
    icon: '🕯️',
    decorativeMode: 'candles',
  },
  yom_tov: {
    key: 'yom_tov',
    gradient: ['#1E3A5F', '#312E81'],
    accent: '#FDE047',
    textColor: '#FFFFFF',
    labelColor: 'rgba(255, 255, 255, 0.78)',
    icon: '✨',
    decorativeMode: 'candles',
  },
  default: {
    key: 'default',
    gradient: ['#1B2A4A', '#334155'],
    accent: '#C9A227',
    textColor: '#FFFFFF',
    labelColor: 'rgba(255, 255, 255, 0.75)',
    icon: '✨',
    decorativeMode: 'none',
  },
};

const FAST_ACTIVE_GRADIENT: [string, string] = ['#1E293B', '#020617'];

export function resolveTimerTheme(context: TimerThemeContext): TimerThemeKey {
  const { type, eventType, themeKey, holidayKey } = context;

  if (themeKey === 'rosh_hashanah' || holidayKey === 'rosh_hashanah') {
    return 'rosh_hashana';
  }

  if (themeKey === 'sukkot' || holidayKey === 'sukkot') {
    return 'sukkot';
  }

  if (
    type === 'FAST' ||
    themeKey === 'fast' ||
    themeKey === 'yom_kippur' ||
    eventType === 'fast_start' ||
    eventType === 'fast_end'
  ) {
    return 'fast';
  }

  if (
    type === 'SHABBAT_ENTRY' ||
    type === 'SHABBAT_EXIT' ||
    eventType === 'shabbat_in' ||
    eventType === 'shabbat_out'
  ) {
    return 'shabbat';
  }

  if (
    eventType === 'holiday_in' ||
    eventType === 'holiday_out' ||
    eventType === 'holiday_day' ||
    type === 'HOLIDAY'
  ) {
    return 'yom_tov';
  }

  return 'default';
}

export function getTimerTheme(
  key: TimerThemeKey,
  options?: { isActiveFast?: boolean },
): TimerTheme {
  const theme = TIMER_THEMES[key] ?? TIMER_THEMES.default;

  if (key === 'fast' && options?.isActiveFast) {
    return {
      ...theme,
      gradient: FAST_ACTIVE_GRADIENT,
    };
  }

  return theme;
}

/** Short contextual chip label for timer presentation — not used for event detection. */
export function getTimerContextChipLabel(key: TimerThemeKey): string | null {
  switch (key) {
    case 'shabbat':
      return 'שבת';
    case 'fast':
      return 'צום';
    case 'rosh_hashana':
      return 'ראש השנה';
    case 'sukkot':
      return 'סוכות';
    case 'yom_tov':
      return 'יום טוב';
    default:
      return null;
  }
}
