import { useEffect } from 'react';

import { onAuthStateChange } from '@/services/auth';
import { stopCloudSync } from '@/services/cloud/syncService';
import { navigateToAuth, navigateToResetPassword } from '@/navigation/navigationRef';
import { onUserLogout } from '@/services/notificationScheduler';
import { useAppStore } from '@/store/appStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useMitzvahStore } from '@/store/mitzvahStore';
import { useUserStore } from '@/store/userStore';

/**
 * Keeps in-memory auth state aligned with Supabase session lifecycle events
 * (remote sign-out, token expiry, session invalidation, password recovery).
 * Cold-start restoration remains handled by useAppInitialization().
 */
export function useAuthSession(): void {
  useEffect(() => {
    const unsubscribe = onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        navigateToResetPassword();
        return;
      }

      if (session) {
        return;
      }

      if (!useAppStore.getState().isAuthenticated) {
        return;
      }

      const userId = useUserStore.getState().user?.id;

      void (async () => {
        if (userId) {
          try {
            await onUserLogout(userId);
          } catch {
            // Best-effort notification cleanup.
          }
        }

        stopCloudSync();
        useUserStore.getState().clearUser();
        useGamificationStore.getState().clear();
        useAppStore.getState().setAuthenticated(false);
        useAppStore.getState().setOnboardingComplete(false);
        useMitzvahStore.getState().reset();
        navigateToAuth();
      })();
    });

    return unsubscribe;
  }, []);
}
