import { HOLIDAY_GUIDE_LIBRARY } from '@/content/holidays';
import type { HolidayGuide, HolidayGuideLegacy } from '@/types/holidayGuide';

export function getAllHolidayGuides(): HolidayGuide[] {
  return HOLIDAY_GUIDE_LIBRARY;
}

export function getHolidayGuide(holidayKey: string): HolidayGuide | null {
  return (
    HOLIDAY_GUIDE_LIBRARY.find((guide) => guide.holidayKey === holidayKey) ??
    null
  );
}

/** True when an existing holiday guide already contains a candle-lighting section. */
export function holidayGuideHasCandleSection(holidayKey?: string): boolean {
  if (!holidayKey) {
    return false;
  }

  const guide = getHolidayGuide(holidayKey);
  if (!guide) {
    return false;
  }

  const sections = [
    ...guide.preparation,
    ...guide.mitzvot,
    ...(guide.prayers ?? []),
  ];

  return sections.some(
    (section) =>
      section.id.includes('candle') || section.titleHebrew.includes('נרות'),
  );
}

export function toLegacyHolidayGuide(guide: HolidayGuide): HolidayGuideLegacy {
  const preparationItems = guide.preparation.flatMap((section) =>
    section.items.map((item) => item.titleHebrew),
  );

  const tips = [
    ...guide.practicalTips.map((tip) => tip.bodyHebrew),
    ...(guide.commonMistakes?.map((tip) => tip.bodyHebrew) ?? []),
  ];

  return {
    holidayKey: guide.holidayKey,
    title: guide.titleHebrew,
    preparationItems,
    tips,
  };
}

export function getHolidayGuideChecklist(holidayKey: string): string[] {
  const guide = getHolidayGuide(holidayKey);
  if (!guide) {
    return [];
  }
  return guide.checklist.map((item) => item.labelHebrew);
}
