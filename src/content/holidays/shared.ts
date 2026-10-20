import type { ContentSource } from '@/types/content';
import type {
  HolidayChecklistItem,
  HolidayFAQ,
  HolidayGuide,
  HolidayGuideItem,
  HolidayGuideSection,
  HolidayTip,
} from '@/types/holidayGuide';
import type { HolidayThemeKey } from '@/types/event';

export function item(
  id: string,
  titleHebrew: string,
  bodyHebrew: string,
  customNoteHebrew?: string,
): HolidayGuideItem {
  return { id, titleHebrew, bodyHebrew, customNoteHebrew };
}

export function section(
  id: string,
  titleHebrew: string,
  items: HolidayGuideItem[],
): HolidayGuideSection {
  return { id, titleHebrew, items };
}

export function tip(
  id: string,
  titleHebrew: string,
  bodyHebrew: string,
  customNoteHebrew?: string,
): HolidayTip {
  return { id, titleHebrew, bodyHebrew, customNoteHebrew };
}

export function faq(
  id: string,
  questionHebrew: string,
  answerHebrew: string,
  customNoteHebrew?: string,
): HolidayFAQ {
  return { id, questionHebrew, answerHebrew, customNoteHebrew };
}

export function checklist(
  id: string,
  labelHebrew: string,
  customNoteHebrew?: string,
): HolidayChecklistItem {
  return { id, labelHebrew, customNoteHebrew };
}

export function source(
  sourceTitle: string,
  sourceReference: string,
  sourceAuthor?: string,
): ContentSource {
  return { sourceTitle, sourceReference, sourceAuthor };
}

export function buildGuide(params: {
  id: string;
  holidayKey: string;
  titleHebrew: string;
  subtitleHebrew?: string;
  shortDescription: string;
  themeKey: HolidayThemeKey;
  overview: HolidayGuideSection;
  preparation: HolidayGuideSection[];
  mitzvot: HolidayGuideSection[];
  prayers?: HolidayGuideSection[];
  practicalTips: HolidayTip[];
  familyTips?: HolidayTip[];
  commonQuestions?: HolidayFAQ[];
  commonMistakes?: HolidayTip[];
  checklist: HolidayChecklistItem[];
  sources: ContentSource[];
}): HolidayGuide {
  return {
    ...params,
    supportedStates: ['approaching', 'eve', 'active', 'concluding'],
    version: '1.0.0',
    status: 'published',
    reviewedAt: '2026-03-01',
  };
}
