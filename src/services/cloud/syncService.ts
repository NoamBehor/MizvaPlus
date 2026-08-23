import { fetchBadges, upsertBadges } from '@/services/cloud/badgeRepository';
import { fetchCompletions, fetchPreferences, upsertCompletions, upsertPreferences } from '@/services/cloud/mitzvahRepository';
import { fetchOnboardingState, upsertOnboardingState } from '@/services/cloud/onboardingRepository';
import { fetchProfile, upsertProfile } from '@/services/cloud/profileRepository';
import { fetchQuizAttempts, upsertQuizAttempts } from '@/services/cloud/quizRepository';
import {
  buildMergedProfile,
  localBadgeToCloud,
  localCompletionToCloud,
  localPreferenceToCloud,
  localQuizToCloud,
  mergeBadges,
  mergeCompletions,
  mergeOnboarding,
  mergePreferences,
  mergeQuizAttempts,
  profileToCloudRow,
} from '@/services/cloud/reconciliation';
import {
  clearSyncPending,
  clearSyncQueue,
  dequeueSync,
  enqueueSync,
  isSyncPending,
  peekSyncQueue,
} from '@/services/cloud/syncQueue';
import type { CloudSnapshot } from '@/services/cloud/types';
import { applyProfileFromSync } from '@/services/profile';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useSyncStore } from '@/store/syncStore';
import { useUserStore } from '@/store/userStore';
import {
  badgesStorageKey,
  completionsStorageKey,
  onboardingStorageKey,
  preferencesStorageKey,
  quizAttemptsStorageKey,
  setJson,
} from '@/utils/storage';

let syncInFlight: Promise<void> | null = null;

async function pullCloudSnapshot(userId: string): Promise<CloudSnapshot> {
  const [profile, preferences, completions, quizAttempts, badges, onboarding] =
    await Promise.all([
      fetchProfile(userId),
      fetchPreferences(userId),
      fetchCompletions(userId),
      fetchQuizAttempts(userId),
      fetchBadges(userId),
      fetchOnboardingState(userId),
    ]);

  return {
    profile,
    preferences,
    completions,
    quizAttempts,
    badges,
    onboarding,
  };
}

async function applyMergedState(
  userId: string,
  snapshot: CloudSnapshot,
): Promise<void> {
  const localProfile = useUserStore.getState().user;
  if (!localProfile || localProfile.id !== userId) {
    return;
  }

  const localPreferences = useMitzvahStore.getState().preferences;
  const localCompletions = useMitzvahStore.getState().completions;
  const localQuizAttempts = useGamificationStore.getState().quizAttempts;
  const localBadges = useGamificationStore.getState().badges;
  const localOnboarding = useAppStore.getState().onboardingComplete;

  const mergedCompletions = mergeCompletions(localCompletions, snapshot.completions);
  const mergedQuizAttempts = mergeQuizAttempts(
    localQuizAttempts,
    snapshot.quizAttempts,
  );
  const mergedBadges = mergeBadges(localBadges, snapshot.badges);
  const mergedPreferences = mergePreferences(
    localPreferences,
    snapshot.preferences,
  );
  const mergedOnboarding = mergeOnboarding(localOnboarding, snapshot.onboarding);
  const mergedProfile = buildMergedProfile(
    userId,
    localProfile,
    snapshot.profile,
    mergedCompletions,
    mergedQuizAttempts,
  );

  useMitzvahStore.setState({
    completions: mergedCompletions,
    preferences: mergedPreferences,
  });
  useGamificationStore.setState({
    quizAttempts: mergedQuizAttempts,
    badges: mergedBadges,
  });
  useAppStore.getState().setOnboardingComplete(mergedOnboarding);
  useUserStore.getState().setUser(mergedProfile);

  await Promise.all([
    setJson(completionsStorageKey(userId), mergedCompletions),
    setJson(preferencesStorageKey(userId), mergedPreferences),
    setJson(quizAttemptsStorageKey(userId), mergedQuizAttempts),
    setJson(badgesStorageKey(userId), mergedBadges),
    setJson(onboardingStorageKey(userId), mergedOnboarding),
    applyProfileFromSync(userId, mergedProfile),
  ]);
}

async function pushLocalState(userId: string): Promise<void> {
  const profile = useUserStore.getState().user;
  const preferences = useMitzvahStore.getState().preferences;
  const completions = useMitzvahStore.getState().completions;
  const quizAttempts = useGamificationStore.getState().quizAttempts;
  const badges = useGamificationStore.getState().badges;
  const onboardingComplete = useAppStore.getState().onboardingComplete;

  if (!profile || profile.id !== userId) {
    return;
  }

  const preferenceRows = Object.values(preferences)
    .map((preference) => localPreferenceToCloud(userId, preference))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const completionRows = completions
    .map((completion) => localCompletionToCloud(completion))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const quizRows = quizAttempts.map((attempt) => localQuizToCloud(attempt));

  const badgeRows = badges
    .map((badge) => localBadgeToCloud(userId, badge))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await upsertProfile(profileToCloudRow(profile));
  await upsertPreferences(preferenceRows);
  await upsertCompletions(completionRows);
  await upsertQuizAttempts(quizRows);
  await upsertBadges(badgeRows);
  await upsertOnboardingState(
    userId,
    onboardingComplete,
    onboardingComplete ? new Date().toISOString() : null,
  );
}

export async function synchronizeUserData(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    useSyncStore.getState().setStatus('idle');
    return;
  }

  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    useSyncStore.getState().setStatus('syncing');

    try {
      const snapshot = await pullCloudSnapshot(userId);
      await applyMergedState(userId, snapshot);
      await pushLocalState(userId);
      await clearSyncPending(userId);
      await clearSyncQueue(userId);
      useSyncStore.getState().markSynced();
    } catch (error) {
      console.error('Cloud sync failed:', error);
      useSyncStore.getState().setStatus('error');
      await enqueueSync(userId);
      throw error;
    } finally {
      syncInFlight = null;
    }
  })();

  await syncInFlight;
}

export async function processSyncQueue(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const pending = await isSyncPending(userId);
  const queue = await peekSyncQueue(userId);

  if (!pending && queue.length === 0) {
    return;
  }

  while ((await peekSyncQueue(userId)).length > 0) {
    await dequeueSync(userId);
  }

  await synchronizeUserData(userId);
}

export async function requestCloudSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  await enqueueSync(userId);
  useSyncStore.getState().setStatus('pending');

  void processSyncQueue(userId).catch(() => {
    // Non-fatal — local state remains authoritative for UI.
  });
}

export async function flushCloudSync(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  await synchronizeUserData(userId);
}

export function stopCloudSync(): void {
  syncInFlight = null;
  useSyncStore.getState().reset();
}
