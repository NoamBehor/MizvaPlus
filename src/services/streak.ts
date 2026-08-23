import { useUserStore } from '@/store/userStore';
import { getActivityDateKey, getPreviousActivityDateKey } from '@/utils/timezone';

export interface StreakUpdateResult {
  streakCount: number;
  lastActiveDate: string;
  updated: boolean;
}

/**
 * Updates streak when the user completes their first tracked mitzvah of the day.
 * Idempotent — multiple completions on the same day do not increment streak.
 */
export async function updateStreakOnDailyActivity(
  userId: string,
): Promise<StreakUpdateResult> {
  const { user } = useUserStore.getState();
  const today = getActivityDateKey();

  if (!user || user.id !== userId) {
    return { streakCount: 0, lastActiveDate: today, updated: false };
  }

  if (user.lastActiveDate === today) {
    return {
      streakCount: user.streakCount,
      lastActiveDate: today,
      updated: false,
    };
  }

  const yesterday = getPreviousActivityDateKey(today);
  let newStreak: number;

  if (user.lastActiveDate === yesterday) {
    newStreak = user.streakCount + 1;
  } else {
    newStreak = 1;
  }

  const updatedUser = {
    ...user,
    streakCount: newStreak,
    lastActiveDate: today,
  };

  useUserStore.setState({ user: updatedUser });
  await useUserStore.getState().persistUser();

  return {
    streakCount: newStreak,
    lastActiveDate: today,
    updated: true,
  };
}
