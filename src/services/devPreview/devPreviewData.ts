import { DEFAULT_PLACE_COORDINATES } from '@/constants/defaultPlace';
import { MITZVOT_SEED } from '@/constants/mitzvot';
import { calculateLevel } from '@/types/gamification';
import type { MitzvahCompletion, UserMitzvahPreference } from '@/types/mitzvah';
import type { UserProfile } from '@/types/user';
import { createDefaultPreferences } from '@/services/mitzvot';
import { getActivityDateKey } from '@/utils/timezone';
import { generateUuidV4 } from '@/utils/uuid';

/** Local-only key — not a Supabase user id and never sent to cloud auth. */
export const DEV_PREVIEW_LOCAL_USER_KEY = 'dev-preview-local';

export const DEV_PREVIEW_BANNER = 'מצב תצוגה למפתחים';
export const DEV_PREVIEW_AUTH_LABEL = 'ללא התחברות';

/** Default place — calendar, parasha, and map preview when GPS is unavailable. */
export const DEV_PREVIEW_DEFAULT_COORDINATES = {
  latitude: DEFAULT_PLACE_COORDINATES.latitude,
  longitude: DEFAULT_PLACE_COORDINATES.longitude,
};

/** Deterministic mitzvah selection for a populated Home / My Mitzvot preview. */
export const DEV_PREVIEW_ENABLED_MITZVAH_IDS: readonly string[] = [
  'tefillin',
  'shacharit',
  'mincha',
  'arvit',
  'kriat-shema',
  'chanukah',
  'pesach',
  'purim',
];

const DEV_PREVIEW_XP = 340;
const DEV_PREVIEW_STREAK = 12;

export function createDevPreviewProfile(): UserProfile {
  const now = new Date().toISOString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    id: DEV_PREVIEW_LOCAL_USER_KEY,
    email: '',
    displayName: '',
    createdAt: now,
    xp: DEV_PREVIEW_XP,
    level: calculateLevel(DEV_PREVIEW_XP),
    streakCount: DEV_PREVIEW_STREAK,
    lastActiveDate: yesterday.toISOString().slice(0, 10),
  };
}

export function createDevPreviewPreferences(
  userId: string,
): Record<string, UserMitzvahPreference> {
  const defaults = createDefaultPreferences(userId);
  const enabled = new Set(DEV_PREVIEW_ENABLED_MITZVAH_IDS);
  const now = new Date().toISOString();

  for (const mitzvah of MITZVOT_SEED) {
    const preference = defaults[mitzvah.id];
    if (!preference) {
      continue;
    }

    const shouldEnable = enabled.has(mitzvah.id);
    defaults[mitzvah.id] = {
      ...preference,
      enabled: shouldEnable,
      reminderEnabled: shouldEnable && mitzvah.category === 'daily',
      updatedAt: now,
    };
  }

  return defaults;
}

export function createDevPreviewCompletions(
  userId: string,
): MitzvahCompletion[] {
  const today = getActivityDateKey();
  const completedToday = ['tefillin', 'shacharit'] as const;
  const now = new Date().toISOString();

  return completedToday.map((mitzvahId) => ({
    id: generateUuidV4(),
    userId,
    mitzvahId,
    completionDate: today,
    completedAt: now,
    xpAwarded: 10,
  }));
}
