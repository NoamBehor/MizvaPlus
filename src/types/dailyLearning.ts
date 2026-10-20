import type { ContentReviewMetadata, ContentSource } from '@/types/content';

export type DailyLearningContentType =
  | 'torah'
  | 'mishnah'
  | 'halacha'
  | 'tehillim'
  | 'parasha'
  | 'history'
  | 'tradition'
  | 'reflection'
  /** @deprecated Use mishnah */
  | 'pirkei_avot'
  /** @deprecated Use tradition */
  | 'mitzvah';

export type DailyLearningCompletionState =
  | 'not_started'
  | 'in_progress'
  | 'completed';

export interface DailyLearningContent extends ContentReviewMetadata {
  id: string;
  dateKey?: string;

  type: DailyLearningContentType;
  titleHebrew: string;
  topicHebrew: string;

  intro?: string;
  bodyHebrew: string;

  source?: ContentSource;
  /** @deprecated Prefer source — kept for backward compatibility */
  sourceHebrew?: string;

  reflectionQuestion?: string;

  estimatedMinutes: number;

  relatedHolidayKey?: string;
  relatedParashaKey?: string;

  moduleId?: string;
  sequence?: number;

  readMoreLabel?: string;
}

export interface DailyLearningProgress {
  moduleId: string;
  currentDay: number;
  totalDays: number;
  completionPercent: number;
  state: DailyLearningCompletionState;
}
