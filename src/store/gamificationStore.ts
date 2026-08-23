import { create } from 'zustand';

import { evaluateBadges } from '@/services/gamification';
import { requestCloudSync } from '@/services/cloud/syncService';
import type { BadgeDefinition } from '@/types/gamification';
import type { DailyQuizAttempt } from '@/types/quiz';
import type { UserBadge } from '@/types/gamification';
import {
  badgesStorageKey,
  getJson,
  quizAttemptsStorageKey,
  setJson,
} from '@/utils/storage';

interface GamificationState {
  quizAttempts: DailyQuizAttempt[];
  badges: UserBadge[];
  pendingBadgeNotifications: BadgeDefinition[];
  initialize: (userId: string) => Promise<void>;
  setQuizAttempts: (attempts: DailyQuizAttempt[]) => void;
  addQuizAttempt: (attempt: DailyQuizAttempt) => Promise<void>;
  setBadges: (badges: UserBadge[]) => void;
  addBadge: (badge: UserBadge, userId: string) => Promise<void>;
  queueBadgeNotifications: (badges: BadgeDefinition[]) => void;
  dismissBadgeNotification: () => void;
  clear: () => void;
  persistQuizAttempts: (userId: string) => Promise<void>;
  persistBadges: (userId: string) => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  quizAttempts: [],
  badges: [],
  pendingBadgeNotifications: [],

  initialize: async (userId: string) => {
    const storedAttempts = await getJson<DailyQuizAttempt[]>(
      quizAttemptsStorageKey(userId),
    );
    const storedBadges = await getJson<UserBadge[]>(badgesStorageKey(userId));

    set({
      quizAttempts: storedAttempts ?? [],
      badges: storedBadges ?? [],
      pendingBadgeNotifications: [],
    });

    const newlyUnlocked = await evaluateBadges(userId);
    if (newlyUnlocked.length > 0) {
      set((state) => ({
        pendingBadgeNotifications: [
          ...state.pendingBadgeNotifications,
          ...newlyUnlocked,
        ],
      }));
    }
  },

  setQuizAttempts: (attempts: DailyQuizAttempt[]) => {
    set({ quizAttempts: attempts });
  },

  addQuizAttempt: async (attempt: DailyQuizAttempt) => {
    const { quizAttempts } = get();
    const updated = [...quizAttempts, attempt];
    set({ quizAttempts: updated });
    await setJson(quizAttemptsStorageKey(attempt.userId), updated);
    void requestCloudSync(attempt.userId);
  },

  setBadges: (badges: UserBadge[]) => {
    set({ badges });
  },

  addBadge: async (badge: UserBadge, userId: string) => {
    const { badges } = get();
    const updated = [...badges, badge];
    set({ badges: updated });
    await setJson(badgesStorageKey(userId), updated);
    void requestCloudSync(userId);
  },

  queueBadgeNotifications: (newBadges: BadgeDefinition[]) => {
    if (newBadges.length === 0) {
      return;
    }
    set((state) => ({
      pendingBadgeNotifications: [
        ...state.pendingBadgeNotifications,
        ...newBadges,
      ],
    }));
  },

  dismissBadgeNotification: () => {
    set((state) => ({
      pendingBadgeNotifications: state.pendingBadgeNotifications.slice(1),
    }));
  },

  clear: () => {
    set({
      quizAttempts: [],
      badges: [],
      pendingBadgeNotifications: [],
    });
  },

  persistQuizAttempts: async (userId: string) => {
    const { quizAttempts } = get();
    await setJson(quizAttemptsStorageKey(userId), quizAttempts);
  },

  persistBadges: async (userId: string) => {
    const { badges } = get();
    await setJson(badgesStorageKey(userId), badges);
  },
}));
