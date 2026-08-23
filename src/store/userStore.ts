import { create } from 'zustand';

import { calculateLevel } from '@/types/gamification';
import type { UserProfile } from '@/types/user';
import { setJson, STORAGE_KEYS } from '@/utils/storage';

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  clearUser: () => void;
  addXp: (amount: number) => Promise<void>;
  setStreak: (count: number, lastActiveDate?: string) => Promise<void>;
  persistUser: () => Promise<void>;
}

function profileStorageKey(userId: string): string {
  return `${STORAGE_KEYS.userProfile}:${userId}`;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  setUser: (user: UserProfile | null) => {
    set({ user });
  },

  clearUser: () => {
    set({ user: null });
  },

  addXp: async (amount: number) => {
    const { user } = get();
    if (!user) {
      return;
    }

    const xp = Math.max(0, user.xp + amount);
    const updatedUser: UserProfile = {
      ...user,
      xp,
      level: calculateLevel(xp),
    };

    set({ user: updatedUser });
    await setJson(profileStorageKey(user.id), updatedUser);
  },

  setStreak: async (count: number, lastActiveDate?: string) => {
    const { user } = get();
    if (!user) {
      return;
    }

    const updatedUser: UserProfile = {
      ...user,
      streakCount: count,
      ...(lastActiveDate !== undefined ? { lastActiveDate } : {}),
    };

    set({ user: updatedUser });
    await setJson(profileStorageKey(user.id), updatedUser);
  },

  persistUser: async () => {
    const { user } = get();
    if (user) {
      await setJson(profileStorageKey(user.id), user);
    }
  },
}));
