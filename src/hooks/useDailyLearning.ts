import { useCallback, useEffect, useMemo } from 'react';

import {
  getDailyLearningForDate,
  getDailyLearningProgress,
} from '@/services/dailyLearning';
import { useDailyLearningStore } from '@/store/dailyLearningStore';
import { useHolidayContextStore } from '@/store/holidayContextStore';
import type {
  DailyLearningCompletionState,
  DailyLearningContent,
  DailyLearningProgress,
} from '@/types/dailyLearning';
import { getActivityDateKey } from '@/utils/timezone';

export interface UseDailyLearningResult {
  content: DailyLearningContent | null;
  progress: DailyLearningProgress;
  completionState: DailyLearningCompletionState;
  sourceLabel: string;
  preview: string;
  markInProgress: () => Promise<void>;
  markCompleted: () => Promise<void>;
}

export function useDailyLearning(userId?: string): UseDailyLearningResult {
  const dateKey = getActivityDateKey();
  const holidayKey = useHolidayContextStore(
    (state) => state.context.holidayKey,
  );

  const hydrate = useDailyLearningStore((state) => state.hydrate);
  const setCompletionState = useDailyLearningStore(
    (state) => state.setCompletionState,
  );
  const storedState = useDailyLearningStore((state) =>
    userId ? state.byUserId[userId]?.[dateKey] : undefined,
  );

  useEffect(() => {
    if (userId) {
      void hydrate(userId);
    }
  }, [userId, hydrate]);

  const content = useMemo(
    () =>
      getDailyLearningForDate(new Date(), {
        relatedHolidayKey: holidayKey,
      }),
    [dateKey, holidayKey],
  );

  const completionState: DailyLearningCompletionState =
    storedState && storedState.contentId === content?.id
      ? storedState.state
      : 'not_started';

  const progress = useMemo(
    () => getDailyLearningProgress(new Date(), completionState),
    [dateKey, completionState],
  );

  const preview = useMemo(() => {
    if (!content) {
      return '';
    }
    const sentences = content.bodyHebrew
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    return sentences.slice(0, 2).join(' ');
  }, [content]);

  const sourceLabel = useMemo(() => {
    if (!content?.source) {
      return content?.sourceHebrew ?? '';
    }
    return `${content.source.sourceTitle} · ${content.source.sourceReference}`;
  }, [content]);

  const markInProgress = useCallback(async () => {
    if (!userId || !content) {
      return;
    }
    await setCompletionState(userId, dateKey, content.id, 'in_progress');
  }, [userId, content, dateKey, setCompletionState]);

  const markCompleted = useCallback(async () => {
    if (!userId || !content) {
      return;
    }
    await setCompletionState(userId, dateKey, content.id, 'completed');
  }, [userId, content, dateKey, setCompletionState]);

  return {
    content,
    progress,
    completionState,
    sourceLabel,
    preview,
    markInProgress,
    markCompleted,
  };
}
