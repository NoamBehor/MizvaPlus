import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import {
  createDevPreviewCompletions,
  createDevPreviewPreferences,
  createDevPreviewProfile,
  DEV_PREVIEW_LOCAL_USER_KEY,
} from '@/services/devPreview/devPreviewData';
import {
  isDevPreviewBootstrapped,
  markDevPreviewBootstrapped,
  resetDevPreviewBootstrapFlag,
} from '@/services/devPreview/devPreviewState';
import { isDevPreviewMode } from '@/services/devPreview/isDevPreviewMode';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';
import type { UserProfile } from '@/types/user';
import {
  completionsStorageKey,
  getJson,
  onboardingStorageKey,
  preferencesStorageKey,
  setJson,
  STORAGE_KEYS,
} from '@/utils/storage';

let bootstrapLogged = false;

export function shouldBootstrapDevPreview(): boolean {
  return isDevPreviewMode() && !isDevPreviewBootstrapped();
}

export function logDevPreviewBootstrap(): void {
  if (!isDevPreviewMode() || bootstrapLogged) {
    return;
  }
  bootstrapLogged = true;
  logDiagnosticEvent('AUTH', 'DEV_PREVIEW — local preview data loaded', 'info', {
    authenticatedSession: false,
    localUserKey: DEV_PREVIEW_LOCAL_USER_KEY,
    productionAuthUnchanged: true,
  });
}

async function seedPreviewStorageIfNeeded(userId: string): Promise<void> {
  const [storedProfile, storedPreferences, storedCompletions] = await Promise.all([
    getJson(previewProfileStorageKey(userId)),
    getJson(preferencesStorageKey(userId)),
    getJson(completionsStorageKey(userId)),
  ]);

  if (!storedProfile) {
    await setJson(previewProfileStorageKey(userId), createDevPreviewProfile());
  }

  if (!storedPreferences) {
    await setJson(
      preferencesStorageKey(userId),
      createDevPreviewPreferences(userId),
    );
  }

  if (!storedCompletions) {
    await setJson(
      completionsStorageKey(userId),
      createDevPreviewCompletions(userId),
    );
  }

  await setJson(onboardingStorageKey(userId), true);
}

/**
 * Loads deterministic local preview data into existing stores.
 * Does not create a Supabase session, JWT, or authenticated cloud user.
 */
export async function bootstrapDevPreview(): Promise<void> {
  if (!isDevPreviewMode()) {
    return;
  }

  const userId = DEV_PREVIEW_LOCAL_USER_KEY;
  await seedPreviewStorageIfNeeded(userId);

  const profile =
    (await getJson<UserProfile>(previewProfileStorageKey(userId))) ??
    createDevPreviewProfile();
  useUserStore.getState().setUser(profile);
  await useMitzvahStore.getState().initialize(userId);
  await useGamificationStore.getState().initialize(userId);
  useAppStore.getState().setOnboardingComplete(true);

  markDevPreviewBootstrapped();
  logDevPreviewBootstrap();
}

export async function resetDevPreviewSession(): Promise<void> {
  if (!isDevPreviewMode()) {
    return;
  }

  resetDevPreviewBootstrapFlag();
  await bootstrapDevPreview();
}

function previewProfileStorageKey(userId: string): string {
  return `${STORAGE_KEYS.userProfile}:${userId}`;
}
