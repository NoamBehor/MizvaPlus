export interface LevelThreshold {
  level: number;
  minXp: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 250 },
  { level: 4, minXp: 500 },
  { level: 5, minXp: 1000 },
];

export function calculateLevel(xp: number): number {
  return getLevelFromXp(xp);
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.minXp) {
      level = threshold.level;
    }
  }
  return level;
}

export interface LevelProgress {
  currentLevel: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number | null;
  progressPercentage: number;
}

export type BadgeConditionType =
  | 'STREAK'
  | 'XP'
  | 'MITZVAH_COUNT'
  | 'QUIZ_CORRECT'
  | 'QUIZ_COUNT';

export interface BadgeDefinition {
  id: string;
  titleHebrew: string;
  descriptionHebrew: string;
  icon: string;
  conditionType: BadgeConditionType;
  conditionValue: number;
}

export interface UserBadge {
  badgeId: string;
  unlockedAt: string;
}

export interface GamificationStats {
  xp: number;
  level: number;
  streakCount: number;
  completedMitzvotCount: number;
  quizCount: number;
  correctQuizCount: number;
  unlockedBadgeCount: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const currentLevel = getLevelFromXp(xp);
  const currentThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel);
  const nextThreshold = LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1);

  const xpForCurrentLevel = currentThreshold?.minXp ?? 0;
  const xpForNextLevel = nextThreshold?.minXp ?? null;

  let progressPercentage = 100;
  if (xpForNextLevel !== null) {
    const range = xpForNextLevel - xpForCurrentLevel;
    const progress = xp - xpForCurrentLevel;
    progressPercentage = Math.round((progress / range) * 100);
  }

  return {
    currentLevel,
    currentXp: xp,
    xpForCurrentLevel,
    xpForNextLevel,
    progressPercentage: Math.max(0, Math.min(100, progressPercentage)),
  };
}
