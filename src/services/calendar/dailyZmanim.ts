import { Zmanim } from '@hebcal/core';

import { getCalendarLocation } from '@/services/calendar/hebcalProvider';
import type {
  CalendarLocationInput,
  CalendarLocationSource,
} from '@/types/calendar';
import {
  formatIsraelTime,
  getCalendarDateKey,
  parseDateKey,
} from '@/utils/timezone';

export type HalachicTimeId =
  | 'netz'
  | 'sofZmanShma'
  | 'chatzot'
  | 'minchaKetana'
  | 'shkia';

export interface DailyHalachicTime {
  id: HalachicTimeId;
  label: string;
  at: Date;
  displayTime: string;
}

export interface DailyHalachicTimes {
  times: DailyHalachicTime[];
  locationLabel: string;
  locationSource: CalendarLocationSource;
  /** Hebcal opinion note for screen readers. Not a new halachic ruling. */
  calculationNote: string;
}

const DEFINITIONS: Array<{
  id: HalachicTimeId;
  label: string;
  read: (zmanim: Zmanim) => Date;
}> = [
  { id: 'netz', label: 'הנץ החמה', read: (zmanim) => zmanim.neitzHaChama() },
  {
    id: 'sofZmanShma',
    label: 'סוף זמן ק״ש',
    read: (zmanim) => zmanim.sofZmanShma(),
  },
  { id: 'chatzot', label: 'חצות היום', read: (zmanim) => zmanim.chatzot() },
  {
    id: 'minchaKetana',
    label: 'מנחה קטנה',
    read: (zmanim) => zmanim.minchaKetana(),
  },
  { id: 'shkia', label: 'שקיעה', read: (zmanim) => zmanim.shkiah() },
];

/**
 * Read-only daily zmanim for the location the calendar already uses.
 * Sof zman Shema is Hebcal's Gra calculation.
 */
export function getDailyHalachicTimes(
  locationInput?: CalendarLocationInput,
  date: Date = new Date(),
): DailyHalachicTimes {
  const resolved = getCalendarLocation(locationInput);
  const zmanim = new Zmanim(
    resolved.location,
    parseDateKey(getCalendarDateKey(date)),
    false,
  );

  const times: DailyHalachicTime[] = [];

  for (const definition of DEFINITIONS) {
    const at = definition.read(zmanim);
    if (Number.isNaN(at.getTime())) {
      continue;
    }

    times.push({
      id: definition.id,
      label: definition.label,
      at,
      displayTime: formatIsraelTime(at),
    });
  }

  return {
    times,
    locationLabel: resolved.label,
    locationSource: resolved.source,
    calculationNote: 'זמנים לפי Hebcal. סוף זמן קריאת שמע לפי הגר״א.',
  };
}
