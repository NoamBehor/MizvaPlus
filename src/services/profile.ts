import type { UserProfile } from '@/types/user';
import { getJson, removeKey, setJson, STORAGE_KEYS } from '@/utils/storage';

/**
 * Profile service abstraction.
 * Local AsyncStorage is the immediate source of truth for UI.
 * Cloud persistence is handled by the sync layer (Phase 10).
 */

function profileStorageKey(userId: string): string {
  return `${STORAGE_KEYS.userProfile}:${userId}`;
}

export async function getCurrentProfile(userId: string): Promise<UserProfile | null> {
  return getJson<UserProfile>(profileStorageKey(userId));
}

export async function createProfile(
  userId: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: userId,
    email,
    displayName,
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    streakCount: 0,
    lastActiveDate: null,
  };

  await setJson(profileStorageKey(userId), profile);
  return profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<UserProfile, 'displayName' | 'xp' | 'level' | 'streakCount' | 'lastActiveDate'>
  >,
): Promise<UserProfile> {
  const existing = await getCurrentProfile(userId);
  if (!existing) {
    throw new Error('פרופיל משתמש לא נמצא');
  }

  const updated: UserProfile = { ...existing, ...updates };
  await setJson(profileStorageKey(userId), updated);
  return updated;
}

export async function clearLocalProfile(userId: string): Promise<void> {
  await removeKey(profileStorageKey(userId));
}

/**
 * Apply reconciled profile state after cloud merge.
 * Does NOT call awardXp() — XP is derived from merged events.
 */
export async function applyProfileFromSync(
  userId: string,
  profile: UserProfile,
): Promise<void> {
  await setJson(profileStorageKey(userId), profile);
}
