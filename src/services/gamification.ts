import { BADGE_DEFINITIONS } from '@/constants/badges';
import { requestCloudSync } from '@/services/cloud/syncService';
import { getQuizStats } from '@/services/quiz';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import type {
  BadgeDefinition,
  GamificationStats,
  UserBadge,
} from '@/types/gamification';
import { calculateLevel } from '@/types/gamification';
import { badgesStorageKey, setJson } from '@/utils/storage';

function meetsCondition(
  badge: BadgeDefinition,
  stats: GamificationStats,
): boolean {
  switch (badge.conditionType) {
    case 'STREAK':
      return stats.streakCount >= badge.conditionValue;
    case 'XP':
      return stats.xp >= badge.conditionValue;
    case 'MITZVAH_COUNT':
      return stats.completedMitzvotCount >= badge.conditionValue;
    case 'QUIZ_CORRECT':
      return stats.correctQuizCount >= badge.conditionValue;
    case 'QUIZ_COUNT':
      return stats.quizCount >= badge.conditionValue;
    default:
      return false;
  }
}

export function getGamificationStats(userId: string): GamificationStats {
  const { user } = useUserStore.getState();
  const { completions } = useMitzvahStore.getState();
  const { badges } = useGamificationStore.getState();
  const { quizCount, correctQuizCount } = getQuizStats(userId);

  const userCompletions = completions.filter((c) => c.userId === userId);

  return {
    xp: user?.id === userId ? user.xp : 0,
    level: user?.id === userId ? user.level : calculateLevel(0),
    streakCount: user?.id === userId ? user.streakCount : 0,
    completedMitzvotCount: userCompletions.length,
    quizCount,
    correctQuizCount,
    unlockedBadgeCount: badges.length,
  };
}

/**
 * Evaluates badge conditions and unlocks any newly earned badges.
 * Idempotent — already-unlocked badges are skipped.
 */
export async function evaluateBadges(
  userId: string,
): Promise<BadgeDefinition[]> {
  const stats = getGamificationStats(userId);
  const { badges } = useGamificationStore.getState();
  const unlockedIds = new Set(badges.map((b) => b.badgeId));
  const newlyUnlocked: BadgeDefinition[] = [];
  const updatedBadges = [...badges];

  for (const badge of BADGE_DEFINITIONS) {
    if (unlockedIds.has(badge.id)) {
      continue;
    }

    if (meetsCondition(badge, stats)) {
      const userBadge: UserBadge = {
        badgeId: badge.id,
        unlockedAt: new Date().toISOString(),
      };

      updatedBadges.push(userBadge);
      unlockedIds.add(badge.id);
      newlyUnlocked.push(badge);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      useGamificationStore.setState({ badges: updatedBadges });
      await setJson(badgesStorageKey(userId), updatedBadges);
      void requestCloudSync(userId);
    } catch (error) {
      console.error('Failed to persist badges:', error);
    }
  }

  return newlyUnlocked;
}

export function getUnlockedBadges(): UserBadge[] {
  return useGamificationStore.getState().badges;
}

export function isBadgeUnlocked(badgeId: string): boolean {
  const { badges } = useGamificationStore.getState();
  return badges.some((b) => b.badgeId === badgeId);
}

export { calculateLevel, getLevelFromXp, getLevelProgress } from '@/types/gamification';
