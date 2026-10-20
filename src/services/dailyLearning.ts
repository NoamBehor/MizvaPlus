import {
  DAILY_LEARNING_CYCLE_30,
  DAILY_LEARNING_CYCLE_LENGTH,
  DAILY_LEARNING_MODULE_ID,
} from '@/content/dailyLearning';
import type {
  DailyLearningCompletionState,
  DailyLearningContent,
  DailyLearningProgress,
} from '@/types/dailyLearning';
import { getActivityDateKey } from '@/utils/timezone';

export interface DailyLearningSelectionOptions {
  relatedHolidayKey?: string;
}

function dateKeyToIndex(dateKey: string, poolSize: number): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const daysSinceEpoch = Math.floor(
    Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24),
  );
  return daysSinceEpoch % poolSize;
}

function resolveSeasonalLesson(
  holidayKey: string,
): DailyLearningContent | null {
  const seasonal = DAILY_LEARNING_CYCLE_30.filter(
    (item) => item.relatedHolidayKey === holidayKey,
  );
  if (seasonal.length === 0) {
    return null;
  }

  const dateKey = getActivityDateKey();
  const index = dateKeyToIndex(dateKey, seasonal.length);
  return seasonal[index] ?? null;
}

/**
 * Deterministically selects daily learning content for a calendar date.
 * Uses the 30-day cycle; seasonal lessons may override when a holiday key is provided.
 */
export function getDailyLearningForDate(
  date: Date = new Date(),
  options?: DailyLearningSelectionOptions,
): DailyLearningContent | null {
  if (DAILY_LEARNING_CYCLE_30.length === 0) {
    return null;
  }

  if (options?.relatedHolidayKey) {
    const seasonal = resolveSeasonalLesson(options.relatedHolidayKey);
    if (seasonal) {
      return seasonal;
    }
  }

  const dateKey = getActivityDateKey(date);
  const index = dateKeyToIndex(dateKey, DAILY_LEARNING_CYCLE_LENGTH);
  return DAILY_LEARNING_CYCLE_30[index] ?? null;
}

export function getDailyLearningBySequence(
  sequence: number,
): DailyLearningContent | null {
  return (
    DAILY_LEARNING_CYCLE_30.find((item) => item.sequence === sequence) ?? null
  );
}

export function getDailyLearningProgress(
  date: Date = new Date(),
  completionState: DailyLearningCompletionState = 'not_started',
): DailyLearningProgress {
  const dateKey = getActivityDateKey(date);
  const index = dateKeyToIndex(dateKey, DAILY_LEARNING_CYCLE_LENGTH);
  const currentDay = index + 1;
  const completionPercent = Math.round(
    ((currentDay - 1) / DAILY_LEARNING_CYCLE_LENGTH) * 100,
  );

  return {
    moduleId: DAILY_LEARNING_MODULE_ID,
    currentDay,
    totalDays: DAILY_LEARNING_CYCLE_LENGTH,
    completionPercent,
    state: completionState,
  };
}

export function getDailyLearningPreview(
  content: DailyLearningContent,
  maxLines = 3,
): string {
  const sentences = content.bodyHebrew
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  return sentences.slice(0, maxLines).join(' ');
}

export function formatDailyLearningSource(
  content: DailyLearningContent,
): string {
  if (content.source) {
    return `${content.source.sourceTitle} · ${content.source.sourceReference}`;
  }
  return content.sourceHebrew ?? '';
}
