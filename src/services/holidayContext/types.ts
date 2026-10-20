import type { HolidayThemeKey } from '@/types/event';

export type HolidayPrepStage = 'early' | 'near' | 'today' | 'active';

export interface HolidayContext {
  active: boolean;
  holidayKey?: string;
  holidayName?: string;
  daysUntil?: number;
  hoursUntil?: number;
  themeKey: HolidayThemeKey;
  prepStage?: HolidayPrepStage;
  prepCardEnabled: boolean;
  triviaCategories: string[];
}
