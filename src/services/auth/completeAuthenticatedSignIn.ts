import { processSyncQueue, synchronizeUserData } from '@/services/cloud/syncService';
import { createProfile, getCurrentProfile } from '@/services/profile';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

export async function completeAuthenticatedSignIn(
  userId: string,
  userEmail: string,
  userDisplayName: string,
): Promise<void> {
  let profile = await getCurrentProfile(userId);

  if (!profile) {
    profile = await createProfile(userId, userEmail, userDisplayName);
  }

  useUserStore.getState().setUser(profile);
  useAppStore.getState().setAuthenticated(true);

  await useAppStore.getState().initialize(userId);
  await useMitzvahStore.getState().initialize(userId);
  await useGamificationStore.getState().initialize(userId);

  try {
    await synchronizeUserData(userId);
  } catch {
    await processSyncQueue(userId);
  }
}
