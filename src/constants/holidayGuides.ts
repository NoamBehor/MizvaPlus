import {
  getHolidayGuide as getStructuredHolidayGuide,
  toLegacyHolidayGuide,
} from '@/services/holidayGuideService';
import type { HolidayGuideLegacy } from '@/types/holidayGuide';

/** @deprecated Use HolidayGuide from @/types/holidayGuide via holidayGuideService */
export type HolidayGuide = HolidayGuideLegacy;

/** @deprecated Use getAllHolidayGuides() from holidayGuideService */
export const HOLIDAY_GUIDES: HolidayGuide[] = [];

export function getHolidayGuide(holidayKey: string): HolidayGuide | null {
  const guide = getStructuredHolidayGuide(holidayKey);
  if (!guide) {
    return null;
  }
  return toLegacyHolidayGuide(guide);
}

export {
  getHolidayGuide as getHolidayGuideFull,
  getAllHolidayGuides,
} from '@/services/holidayGuideService';
