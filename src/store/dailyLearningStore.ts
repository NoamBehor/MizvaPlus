import { create } from 'zustand';

import type { DailyLearningCompletionState } from '@/types/dailyLearning';
import { getJson, setJson } from '@/utils/storage';

const STORAGE_PREFIX = '@mitzvahapp/daily_learning_state:';

export interface DailyLearningDayState {
  dateKey: string;
  contentId: string;
  state: DailyLearningCompletionState;
  updatedAt: string;
}

interface DailyLearningStoreState {
  byUserId: Record<string, Record<string, DailyLearningDayState>>;
  hydratedUserIds: Set<string>;
  hydrate: (userId: string) => Promise<void>;
  setCompletionState: (
    userId: string,
    dateKey: string,
    contentId: string,
    state: DailyLearningCompletionState,
  ) => Promise<void>;
  getStateForDate: (
    userId: string,
    dateKey: string,
  ) => DailyLearningDayState | null;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export const useDailyLearningStore = create<DailyLearningStoreState>(
  (set, get) => ({
    byUserId: {},
    hydratedUserIds: new Set(),

    hydrate: async (userId) => {
      if (get().hydratedUserIds.has(userId)) {
        return;
      }

      const stored =
        (await getJson<Record<string, DailyLearningDayState>>(
          storageKey(userId),
        )) ?? {};

      set((current) => ({
        byUserId: { ...current.byUserId, [userId]: stored },
        hydratedUserIds: new Set([...current.hydratedUserIds, userId]),
      }));
    },

    setCompletionState: async (userId, dateKey, contentId, state) => {
      const entry: DailyLearningDayState = {
        dateKey,
        contentId,
        state,
        updatedAt: new Date().toISOString(),
      };

      const userMap = { ...(get().byUserId[userId] ?? {}), [dateKey]: entry };

      set((current) => ({
        byUserId: { ...current.byUserId, [userId]: userMap },
      }));

      await setJson(storageKey(userId), userMap);
    },

    getStateForDate: (userId, dateKey) => {
      return get().byUserId[userId]?.[dateKey] ?? null;
    },
  }),
);
