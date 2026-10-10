import { MITZVOT_SEED } from '@/constants/mitzvot';
import type {
  Mitzvah,
  MitzvahCategory,
  MitzvahCompletion,
  UserMitzvahPreference,
} from '@/types/mitzvah';
import { getActivityDateKey } from '@/utils/timezone';
import { generateUuidV4 } from '@/utils/uuid';

export function getAllMitzvot(): Mitzvah[] {
  return MITZVOT_SEED;
}

export function getMitzvotByCategory(category: MitzvahCategory): Mitzvah[] {
  return MITZVOT_SEED.filter((mitzvah) => mitzvah.category === category);
}

export function getMitzvahById(mitzvahId: string): Mitzvah | undefined {
  return MITZVOT_SEED.find((mitzvah) => mitzvah.id === mitzvahId);
}

export function createDefaultPreference(
  userId: string,
  mitzvah: Mitzvah,
): UserMitzvahPreference {
  const now = new Date().toISOString();

  return {
    userId,
    mitzvahId: mitzvah.id,
    enabled: mitzvah.category === 'daily',
    reminderEnabled: mitzvah.category === 'daily',
    reminderTime: mitzvah.defaultTime,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultPreferences(
  userId: string,
): Record<string, UserMitzvahPreference> {
  return MITZVOT_SEED.reduce<Record<string, UserMitzvahPreference>>(
    (acc, mitzvah) => {
      acc[mitzvah.id] = createDefaultPreference(userId, mitzvah);
      return acc;
    },
    {},
  );
}

export interface CompleteMitzvahResult {
  success: boolean;
  completion?: MitzvahCompletion;
  alreadyCompleted: boolean;
}

/**
 * Idempotent completion logic.
 * The same user must never receive XP twice for the same mitzvah on the same date.
 */
export function completeMitzvah(
  userId: string,
  mitzvahId: string,
  completions: MitzvahCompletion[],
): CompleteMitzvahResult {
  const mitzvah = getMitzvahById(mitzvahId);
  if (!mitzvah) {
    return { success: false, alreadyCompleted: false };
  }

  const completionDate = getActivityDateKey();
  const existing = completions.find(
    (completion) =>
      completion.userId === userId &&
      completion.mitzvahId === mitzvahId &&
      completion.completionDate === completionDate,
  );

  if (existing) {
    return { success: false, completion: existing, alreadyCompleted: true };
  }

  const completion: MitzvahCompletion = {
    id: generateUuidV4(),
    userId,
    mitzvahId,
    completedAt: new Date().toISOString(),
    completionDate,
    xpAwarded: mitzvah.xpReward,
  };

  return { success: true, completion, alreadyCompleted: false };
}

export function isMitzvahCompletedToday(
  userId: string,
  mitzvahId: string,
  completions: MitzvahCompletion[],
): boolean {
  const completionDate = getActivityDateKey();
  return completions.some(
    (completion) =>
      completion.userId === userId &&
      completion.mitzvahId === mitzvahId &&
      completion.completionDate === completionDate,
  );
}

export function uncompleteMitzvahToday(
  userId: string,
  mitzvahId: string,
  completions: MitzvahCompletion[],
): MitzvahCompletion[] {
  const completionDate = getActivityDateKey();
  return completions.filter(
    (completion) =>
      !(
        completion.userId === userId &&
        completion.mitzvahId === mitzvahId &&
        completion.completionDate === completionDate
      ),
  );
}
