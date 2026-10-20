import { getHolidayTheme } from '@/constants/holidayThemes';
import type { EventType } from '@/types/event';
import type { HolidayThemeKey } from '@/types/event';

export interface EventTheme {
  gradient: [string, string];
  textColor: string;
  accentColor: string;
  labelColor: string;
}

export function getEventTheme(
  type: EventType,
  options?: { isActiveFast?: boolean; themeKey?: HolidayThemeKey },
): EventTheme {
  if (options?.themeKey) {
    const holidayTheme = getHolidayTheme(options.themeKey, {
      isActiveFast: options.isActiveFast,
    });
    return {
      gradient: holidayTheme.heroGradient,
      textColor: holidayTheme.textColor,
      accentColor: holidayTheme.accent,
      labelColor: holidayTheme.labelColor,
    };
  }

  if (type === 'SHABBAT_ENTRY' || type === 'SHABBAT_EXIT') {
    const shabbat = getHolidayTheme('shabbat');
    return {
      gradient: shabbat.heroGradient,
      textColor: shabbat.textColor,
      accentColor: shabbat.accent,
      labelColor: shabbat.labelColor,
    };
  }

  if (type === 'FAST') {
    const fast = getHolidayTheme('fast', { isActiveFast: options?.isActiveFast });
    return {
      gradient: fast.heroGradient,
      textColor: fast.textColor,
      accentColor: fast.accent,
      labelColor: fast.labelColor,
    };
  }

  if (type === 'HOLIDAY') {
    const holiday = getHolidayTheme('default');
    return {
      gradient: holiday.heroGradient,
      textColor: holiday.textColor,
      accentColor: holiday.accent,
      labelColor: holiday.labelColor,
    };
  }

  const defaultTheme = getHolidayTheme('default');
  return {
    gradient: defaultTheme.heroGradient,
    textColor: defaultTheme.textColor,
    accentColor: defaultTheme.accent,
    labelColor: defaultTheme.labelColor,
  };
}
