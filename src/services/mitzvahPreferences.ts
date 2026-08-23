import type { UserMitzvahPreference } from '@/types/mitzvah';
import { getJson, preferencesStorageKey, setJson } from '@/utils/storage';

/**
 * Mitzvah preferences service abstraction.
 * AsyncStorage is the local source of truth; cloud sync is handled in Phase 10.
 */

export async function loadPreferences(
  userId: string,
): Promise<Record<string, UserMitzvahPreference> | null> {
  return getJson<Record<string, UserMitzvahPreference>>(
    preferencesStorageKey(userId),
  );
}

export async function savePreferences(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
): Promise<void> {
  await setJson(preferencesStorageKey(userId), preferences);

  // Deferred: sync to Supabase user_mitzvah_preferences table
}

export async function prepareForRemoteSync(
  userId: string,
  preferences: Record<string, UserMitzvahPreference>,
): Promise<void> {
  await savePreferences(userId, preferences);
}
