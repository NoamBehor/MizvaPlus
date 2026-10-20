import type { ContentReviewMetadata, ContentSource } from '@/types/content';
import type { HolidayThemeKey } from '@/types/event';

export type HolidayGuideState =
  | 'approaching'
  | 'eve'
  | 'active'
  | 'concluding';

export interface HolidayGuideItem {
  id: string;
  titleHebrew: string;
  bodyHebrew: string;
  /** When practice varies by community — e.g. "לפי...", "מנהג נפוץ..." */
  customNoteHebrew?: string;
}

export interface HolidayGuideSection {
  id: string;
  titleHebrew: string;
  items: HolidayGuideItem[];
}

export interface HolidayTip {
  id: string;
  titleHebrew: string;
  bodyHebrew: string;
  customNoteHebrew?: string;
}

export interface HolidayFAQ {
  id: string;
  questionHebrew: string;
  answerHebrew: string;
  customNoteHebrew?: string;
}

export interface HolidayChecklistItem {
  id: string;
  labelHebrew: string;
  customNoteHebrew?: string;
}

export interface HolidayGuide extends ContentReviewMetadata {
  id: string;
  holidayKey: string;

  titleHebrew: string;
  subtitleHebrew?: string;

  shortDescription: string;

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

  themeKey: HolidayThemeKey;

  supportedStates: HolidayGuideState[];
}

/** Legacy compact shape — derived for backward-compatible consumers. */
export interface HolidayGuideLegacy {
  holidayKey: string;
  title: string;
  preparationItems: string[];
  tips: string[];
}
