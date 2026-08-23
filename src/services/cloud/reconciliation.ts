import { MITZVOT_SEED } from '@/constants/mitzvot';
import { BADGE_DEFINITIONS } from '@/constants/badges';
import { calculateLevel } from '@/types/gamification';
import type { UserBadge } from '@/types/gamification';
import type {
  MitzvahCompletion,
  UserMitzvahPreference,
} from '@/types/mitzvah';
import type { DailyQuizAttempt } from '@/types/quiz';
import type { UserProfile } from '@/types/user';
import { getPreviousActivityDateKey } from '@/utils/timezone';
import type {
  CloudMitzvahCompletion,
  CloudMitzvahPreference,
  CloudOnboardingState,
  CloudProfile,
  CloudQuizAttempt,
  CloudUserBadge,
} from '@/services/cloud/types';

const VALID_MITZVAH_IDS = new Set(MITZVOT_SEED.map((m) => m.id));
const VALID_BADGE_IDS = new Set(BADGE_DEFINITIONS.map((b) => b.id));

function parseReminderTime(
  reminderTime?: string,
): { hour: number | null; minute: number | null } {
  if (!reminderTime) {
    return { hour: null, minute: null };
  }

  const [hourText, minuteText] = reminderTime.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: null, minute: null };
  }

  return { hour, minute };
}

export function formatReminderTime(
  hour: number | null,
  minute: number | null,
): string | undefined {
  if (hour === null || minute === null) {
    return undefined;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function localPreferenceToCloud(
  userId: string,
  preference: UserMitzvahPreference,
): CloudMitzvahPreference | null {
  if (!VALID_MITZVAH_IDS.has(preference.mitzvahId)) {
    return null;
  }

  const { hour, minute } = parseReminderTime(preference.reminderTime);

  return {
    user_id: userId,
    mitzvah_id: preference.mitzvahId,
    enabled: preference.enabled,
    reminder_enabled: preference.reminderEnabled,
    reminder_hour: hour,
    reminder_minute: minute,
    created_at: preference.createdAt,
    updated_at: preference.updatedAt,
  };
}

export function cloudPreferenceToLocal(
  row: CloudMitzvahPreference,
): UserMitzvahPreference | null {
  if (!VALID_MITZVAH_IDS.has(row.mitzvah_id)) {
    return null;
  }

  return {
    userId: row.user_id,
    mitzvahId: row.mitzvah_id,
    enabled: row.enabled,
    reminderEnabled: row.reminder_enabled,
    reminderTime: formatReminderTime(row.reminder_hour, row.reminder_minute),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function localCompletionToCloud(
  completion: MitzvahCompletion,
): CloudMitzvahCompletion | null {
  if (!VALID_MITZVAH_IDS.has(completion.mitzvahId)) {
    return null;
  }

  return {
    id: completion.id,
    user_id: completion.userId,
    mitzvah_id: completion.mitzvahId,
    activity_date: completion.completionDate,
    completed_at: completion.completedAt,
    xp_awarded: completion.xpAwarded,
    created_at: completion.completedAt,
  };
}

export function cloudCompletionToLocal(
  row: CloudMitzvahCompletion,
): MitzvahCompletion | null {
  if (!VALID_MITZVAH_IDS.has(row.mitzvah_id)) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    mitzvahId: row.mitzvah_id,
    completedAt: row.completed_at,
    completionDate: row.activity_date,
    xpAwarded: row.xp_awarded,
  };
}

export function localQuizToCloud(
  attempt: DailyQuizAttempt,
): CloudQuizAttempt {
  return {
    id: attempt.id,
    user_id: attempt.userId,
    quiz_date: attempt.dateKey,
    question_id: attempt.questionId,
    selected_option_id: attempt.selectedOptionId,
    is_correct: attempt.isCorrect,
    xp_awarded: attempt.xpAwarded,
    created_at: attempt.completedAt,
  };
}

export function cloudQuizToLocal(row: CloudQuizAttempt): DailyQuizAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    dateKey: row.quiz_date,
    selectedOptionId: row.selected_option_id,
    isCorrect: row.is_correct,
    xpAwarded: row.xp_awarded,
    completedAt: row.created_at,
  };
}

export function localBadgeToCloud(
  userId: string,
  badge: UserBadge,
): CloudUserBadge | null {
  if (!VALID_BADGE_IDS.has(badge.badgeId)) {
    return null;
  }

  return {
    user_id: userId,
    badge_id: badge.badgeId,
    unlocked_at: badge.unlockedAt,
    created_at: badge.unlockedAt,
  };
}

export function cloudBadgeToLocal(row: CloudUserBadge): UserBadge | null {
  if (!VALID_BADGE_IDS.has(row.badge_id)) {
    return null;
  }

  return {
    badgeId: row.badge_id,
    unlockedAt: row.unlocked_at,
  };
}

export function mergeCompletions(
  local: MitzvahCompletion[],
  cloud: CloudMitzvahCompletion[],
): MitzvahCompletion[] {
  const map = new Map<string, MitzvahCompletion>();

  for (const completion of local) {
    const key = `${completion.mitzvahId}:${completion.completionDate}`;
    map.set(key, completion);
  }

  for (const row of cloud) {
    const localItem = cloudCompletionToLocal(row);
    if (!localItem) {
      continue;
    }

    const key = `${localItem.mitzvahId}:${localItem.completionDate}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, localItem);
      continue;
    }

    map.set(key, {
      ...existing,
      xpAwarded: Math.max(existing.xpAwarded, localItem.xpAwarded),
      completedAt:
        existing.completedAt > localItem.completedAt
          ? existing.completedAt
          : localItem.completedAt,
    });
  }

  return Array.from(map.values());
}

export function mergeQuizAttempts(
  local: DailyQuizAttempt[],
  cloud: CloudQuizAttempt[],
): DailyQuizAttempt[] {
  const map = new Map<string, DailyQuizAttempt>();

  for (const attempt of local) {
    const key = `${attempt.dateKey}:${attempt.questionId}`;
    map.set(key, attempt);
  }

  for (const row of cloud) {
    const localItem = cloudQuizToLocal(row);
    const key = `${localItem.dateKey}:${localItem.questionId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, localItem);
      continue;
    }

    map.set(key, {
      ...existing,
      isCorrect: existing.isCorrect || localItem.isCorrect,
      xpAwarded: Math.max(existing.xpAwarded, localItem.xpAwarded),
      completedAt:
        existing.completedAt > localItem.completedAt
          ? existing.completedAt
          : localItem.completedAt,
    });
  }

  return Array.from(map.values());
}

export function mergeBadges(
  local: UserBadge[],
  cloud: CloudUserBadge[],
): UserBadge[] {
  const map = new Map<string, UserBadge>();

  for (const badge of local) {
    map.set(badge.badgeId, badge);
  }

  for (const row of cloud) {
    const localItem = cloudBadgeToLocal(row);
    if (!localItem) {
      continue;
    }

    const existing = map.get(localItem.badgeId);
    if (!existing) {
      map.set(localItem.badgeId, localItem);
      continue;
    }

    map.set(localItem.badgeId, {
      badgeId: localItem.badgeId,
      unlockedAt:
        existing.unlockedAt < localItem.unlockedAt
          ? existing.unlockedAt
          : localItem.unlockedAt,
    });
  }

  return Array.from(map.values());
}

export function mergePreferences(
  local: Record<string, UserMitzvahPreference>,
  cloud: CloudMitzvahPreference[],
): Record<string, UserMitzvahPreference> {
  const merged = { ...local };

  for (const row of cloud) {
    const cloudPref = cloudPreferenceToLocal(row);
    if (!cloudPref) {
      continue;
    }

    const existing = merged[cloudPref.mitzvahId];
    if (!existing || cloudPref.updatedAt > existing.updatedAt) {
      merged[cloudPref.mitzvahId] = cloudPref;
    }
  }

  return merged;
}

export function mergeOnboarding(
  localComplete: boolean,
  cloud: CloudOnboardingState | null,
): boolean {
  return localComplete || cloud?.completed === true;
}

export function recomputeXpFromEvents(
  completions: MitzvahCompletion[],
  quizAttempts: DailyQuizAttempt[],
): number {
  const completionXp = completions.reduce(
    (sum, completion) => sum + Math.max(0, completion.xpAwarded),
    0,
  );
  const quizXp = quizAttempts.reduce(
    (sum, attempt) => sum + Math.max(0, attempt.xpAwarded),
    0,
  );

  return completionXp + quizXp;
}

export function recomputeStreakFromCompletions(
  completions: MitzvahCompletion[],
): { streakCount: number; lastActiveDate: string | null } {
  const uniqueDates = [
    ...new Set(
      completions
        .map((completion) => completion.completionDate)
        .filter(Boolean),
    ),
  ].sort();

  if (uniqueDates.length === 0) {
    return { streakCount: 0, lastActiveDate: null };
  }

  const lastActiveDate = uniqueDates[uniqueDates.length - 1];
  let streakCount = 1;
  let cursor = lastActiveDate;

  while (true) {
    const previous = getPreviousActivityDateKey(cursor);
    if (!uniqueDates.includes(previous)) {
      break;
    }
    streakCount += 1;
    cursor = previous;
  }

  return { streakCount, lastActiveDate };
}

export function buildMergedProfile(
  userId: string,
  localProfile: UserProfile,
  cloudProfile: CloudProfile | null,
  completions: MitzvahCompletion[],
  quizAttempts: DailyQuizAttempt[],
): UserProfile {
  const xp = recomputeXpFromEvents(completions, quizAttempts);
  const level = calculateLevel(xp);
  const { streakCount, lastActiveDate } = recomputeStreakFromCompletions(completions);

  const displayName =
    cloudProfile &&
    cloudProfile.updated_at > localProfile.createdAt &&
    cloudProfile.display_name.trim().length > 0
      ? cloudProfile.display_name
      : localProfile.displayName;

  return {
    ...localProfile,
    id: userId,
    displayName,
    xp,
    level,
    streakCount,
    lastActiveDate,
  };
}

export function profileToCloudRow(profile: UserProfile): Omit<CloudProfile, 'created_at' | 'updated_at'> {
  return {
    id: profile.id,
    display_name: profile.displayName,
    xp: profile.xp,
    level: profile.level,
    streak: profile.streakCount,
    last_activity_date: profile.lastActiveDate,
  };
}
