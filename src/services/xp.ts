import { useUserStore } from '@/store/userStore';
import { calculateLevel } from '@/types/gamification';

export type XpReason = 'MITZVAH_COMPLETED' | 'DAILY_QUIZ' | 'STREAK_BONUS';

export interface AwardXpParams {
  userId: string;
  amount: number;
  reason: XpReason;
  referenceId: string;
}

/**
 * Centralized XP operation.
 * Idempotency for mitzvah completions is enforced at the completion layer —
 * this function should only be called when a new reward is authorized.
 */
export async function awardXp({
  userId,
  amount,
}: AwardXpParams): Promise<void> {
  const { user } = useUserStore.getState();
  if (!user || user.id !== userId || amount === 0) {
    return;
  }

  const xp = Math.max(0, user.xp + amount);
  const updatedUser = {
    ...user,
    xp,
    level: calculateLevel(xp),
  };

  useUserStore.setState({ user: updatedUser });
  await useUserStore.getState().persistUser();
}
