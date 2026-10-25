import { colors } from '@/constants/colors';
import { homeTheme } from '@/constants/homeTheme';
import type { CalendarCellCategory } from '@/services/calendar/calendarCellPresentation';

export const calendarTheme = {
  canvas: colors.background,
  surface: homeTheme.surface,
  sheet: '#FFFEFB',
  row: '#F3EFE8',
  note: 'rgba(253, 230, 138, 0.38)',
  text: homeTheme.text,
  muted: homeTheme.muted,
  primary: homeTheme.navy,
  today: homeTheme.goldDeep,
  holiday: {
    border: '#F59E0B',
    text: '#92400E',
    fill: '#FEF3C7',
    badge: '#FEF3C7',
  },
  fast: {
    border: '#9F1239',
    text: '#881337',
    fill: '#FFF1F2',
    badge: '#FFE4E6',
  },
  erev: {
    border: '#059669',
    text: '#065F46',
    fill: '#ECFDF5',
    badge: homeTheme.successSoft,
  },
  shabbat: {
    border: '#1E3A8A',
    text: '#1E3A8A',
    fill: '#EEF2FF',
    badge: homeTheme.primarySoft,
  },
  none: {
    border: 'rgba(198, 198, 206, 0.55)',
    text: homeTheme.text,
    fill: homeTheme.surface,
    badge: colors.canvas,
  },
} as const;

export function dayTagTokens(tag: string) {
  if (tag === 'יום טוב') {
    return { background: calendarTheme.primary, color: '#FDE68A' };
  }
  if (tag === 'שבת קודש') {
    return { background: calendarTheme.shabbat.text, color: '#FFFFFF' };
  }
  if (tag === 'צום') {
    return { background: calendarTheme.fast.text, color: '#FFFFFF' };
  }
  if (tag === 'ראש חודש') {
    return { background: calendarTheme.today, color: '#FFFFFF' };
  }
  if (tag === 'חול המועד') {
    return { background: calendarTheme.holiday.text, color: '#FEF3C7' };
  }
  return { background: '#E7E5E4', color: calendarTheme.text };
}

export const WEEKDAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'] as const;

export const CALENDAR_LEGEND = [
  { id: 'holiday', label: 'חג ומועד', color: calendarTheme.holiday.border },
  { id: 'fast', label: 'צום ותענית', color: calendarTheme.fast.border },
  { id: 'erev', label: 'ערב שבת וחג', color: calendarTheme.erev.border },
  { id: 'shabbat', label: 'שבת קודש', color: calendarTheme.shabbat.border },
] as const;

export function categoryTokens(category: CalendarCellCategory) {
  return calendarTheme[category];
}
