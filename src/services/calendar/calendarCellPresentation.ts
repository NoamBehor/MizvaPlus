import { gematriya, HDate, months } from '@hebcal/core';

import {
  isFastEndsEvent,
  resolveEventDescriptor,
  resolveFastDisplayTitle,
} from '@/constants/eventDescriptors';
import {
  formatGregorianDateLabel,
  WEEKDAY_TITLES_HE,
} from '@/services/calendar/hebrewMonthGrid';
import type { CalendarDayInfo, HebrewCalendarEvent } from '@/types/calendar';
import { parseDateKey } from '@/utils/timezone';

export type CalendarCellCategory =
  | 'holiday'
  | 'fast'
  | 'shabbat'
  | 'erev'
  | 'none';

export interface CalendarCellPresentation {
  category: CalendarCellCategory;
  hebrewDayLabel: string;
  gregorianDay: number;
  primaryLabel: string;
  secondaryLabel: string;
}

export interface CalendarDayDetailsModel {
  tag: string;
  title: string;
  subtitle: string;
  omerCount: number;
  candleTime?: string;
  candleCaption: string;
  closingTime?: string;
  closingCaption: string;
  locationLabel: string;
  events: HebrewCalendarEvent[];
  holidayKey?: string;
}

function shortenLabel(value: string, maxLength = 12): string {
  const plain = value.replace(/[\u0591-\u05C7]/g, '').trim();
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength - 1)}…`;
}

function isHolidayLikeEvent(event: HebrewCalendarEvent): boolean {
  if (event.type === 'HOLIDAY' || event.type === 'ROSH_CHODESH') {
    return true;
  }

  const title = event.titleHebrew;
  return title.includes('חול המועד') || title.includes('חוה״מ');
}

function namedHolidayTitle(
  event: HebrewCalendarEvent | undefined,
): string {
  if (!event) {
    return '';
  }

  return resolveEventDescriptor(event).titleHebrew;
}

export function formatHebrewDayNumber(day: number): string {
  return gematriya(day);
}

export function hebrewMonthFromDateKey(dateKey: string): {
  hebrewYear: number;
  hebrewMonth: number;
} {
  const hd = new HDate(parseDateKey(dateKey));
  return {
    hebrewYear: hd.getFullYear(),
    hebrewMonth: hd.getMonth(),
  };
}

export function shiftHebrewMonth(
  hebrewYear: number,
  hebrewMonth: number,
  delta: number,
): { hebrewYear: number; hebrewMonth: number } {
  const hd = new HDate(1, hebrewMonth, hebrewYear).add(delta, 'M');
  return {
    hebrewYear: hd.getFullYear(),
    hebrewMonth: hd.getMonth(),
  };
}

export function getOmerCount(dateKey: string): number {
  const hd = new HDate(parseDateKey(dateKey));
  const nisan16 = new HDate(16, months.NISAN, hd.getFullYear());
  const delta = hd.abs() - nisan16.abs();
  if (delta < 0 || delta > 48) {
    return 0;
  }
  return delta + 1;
}

export function presentCalendarCell(
  dayInfo: CalendarDayInfo,
): CalendarCellPresentation {
  const gregorianDay = Number(dayInfo.gregorianDateKey.slice(-2));
  const hebrewDayLabel = formatHebrewDayNumber(dayInfo.hebrewDate.day);
  const weekday = parseDateKey(dayInfo.gregorianDateKey).getDay();
  const events = dayInfo.events;
  const candle = events.find(
    (event) => event.type === 'CANDLE_LIGHTING' && event.startTime,
  );
  const havdalah = events.find(
    (event) => event.type === 'HAVDALAH' && event.startTime,
  );
  const holidayEvent = events.find(isHolidayLikeEvent);
  const fastEvent = events.find((event) => event.type === 'FAST');
  const omer = getOmerCount(dayInfo.gregorianDateKey);

  if (holidayEvent || dayInfo.isHoliday) {
    return {
      category: 'holiday',
      hebrewDayLabel,
      gregorianDay,
      primaryLabel: shortenLabel(namedHolidayTitle(holidayEvent) || 'חג'),
      secondaryLabel:
        candle?.startTime ?? (omer > 0 ? `עומר ${omer}` : ''),
    };
  }

  if (fastEvent || dayInfo.isFastDay) {
    return {
      category: 'fast',
      hebrewDayLabel,
      gregorianDay,
      primaryLabel: shortenLabel(
        (fastEvent
          ? resolveFastDisplayTitle(fastEvent, events)
          : '') || 'צום',
      ),
      secondaryLabel: fastEvent?.startTime ?? '',
    };
  }

  if (dayInfo.isShabbat) {
    return {
      category: 'shabbat',
      hebrewDayLabel,
      gregorianDay,
      primaryLabel: shortenLabel(
        dayInfo.weeklyParasha?.hebrewDisplayName ?? 'שבת',
      ),
      secondaryLabel: havdalah?.startTime ?? '',
    };
  }

  if (weekday === 5 || candle) {
    return {
      category: 'erev',
      hebrewDayLabel,
      gregorianDay,
      primaryLabel: candle?.startTime ?? '',
      secondaryLabel: '',
    };
  }

  if (omer > 0) {
    return {
      category: 'none',
      hebrewDayLabel,
      gregorianDay,
      primaryLabel: `עומר ${omer}`,
      secondaryLabel: '',
    };
  }

  return {
    category: 'none',
    hebrewDayLabel,
    gregorianDay,
    primaryLabel: '',
    secondaryLabel: '',
  };
}

function resolveDayTag(dayInfo: CalendarDayInfo): string {
  const titles = dayInfo.events.map((event) => event.titleHebrew).join(' ');
  if (titles.includes('חול המועד') || titles.includes('חוה״מ')) {
    return 'חול המועד';
  }
  if (dayInfo.isHoliday) {
    return 'יום טוב';
  }
  if (
    dayInfo.isFastDay ||
    dayInfo.events.some((event) => event.type === 'FAST')
  ) {
    return 'צום';
  }
  if (dayInfo.isShabbat) {
    return 'שבת קודש';
  }
  if (dayInfo.events.some((event) => event.type === 'ROSH_CHODESH')) {
    return 'ראש חודש';
  }
  return 'חול';
}

export function presentCalendarDayDetails(
  dayInfo: CalendarDayInfo,
): CalendarDayDetailsModel {
  const weekday = parseDateKey(dayInfo.gregorianDateKey).getDay();
  const weekdayTitle = WEEKDAY_TITLES_HE[weekday] ?? '';
  const events = dayInfo.events;
  const candle = events.find(
    (event) => event.type === 'CANDLE_LIGHTING' && event.startTime,
  );
  const havdalah = events.find(
    (event) => event.type === 'HAVDALAH' && event.startTime,
  );
  const fastEnd = events.find(
    (event) =>
      event.type === 'FAST' &&
      isFastEndsEvent(event) &&
      Boolean(event.startTime),
  );
  const holidayEvent = events.find(isHolidayLikeEvent);
  const holidayKey = holidayEvent
    ? resolveEventDescriptor(holidayEvent).holidayKey
    : undefined;
  const eventTitles = events
    .filter(
      (event) =>
        event.type !== 'CANDLE_LIGHTING' && event.type !== 'HAVDALAH',
    )
    .map((event) =>
      event.type === 'FAST'
        ? resolveFastDisplayTitle(event, events)
        : resolveEventDescriptor(event).titleHebrew,
    )
    .filter((title, index, array) => array.indexOf(title) === index);

  const closingTime = havdalah?.startTime ?? fastEnd?.startTime;
  let closingCaption = 'צאת הכוכבים';
  if (fastEnd?.startTime && !havdalah) {
    closingCaption = 'צאת הצום';
  } else if (dayInfo.isHoliday) {
    closingCaption = 'צאת החג';
  } else if (dayInfo.isShabbat) {
    closingCaption = 'צאת שבת';
  }

  const candleCaption = dayInfo.isHoliday
    ? `כניסת החג ב${dayInfo.locationLabel}`
    : `כניסת שבת ב${dayInfo.locationLabel}`;

  return {
    tag: resolveDayTag(dayInfo),
    title: `${weekdayTitle}, ${dayInfo.hebrewDate.displayString}`,
    subtitle: [
      formatGregorianDateLabel(dayInfo.gregorianDateKey),
      ...eventTitles.slice(0, 3),
    ].join(' • '),
    omerCount: getOmerCount(dayInfo.gregorianDateKey),
    candleTime: candle?.startTime,
    candleCaption,
    closingTime,
    closingCaption,
    locationLabel: dayInfo.locationLabel,
    events,
    holidayKey,
  };
}
