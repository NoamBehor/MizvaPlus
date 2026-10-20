import { useEffect } from 'react';



import { bootstrapAuthFromInitialDeepLink } from '@/services/authBootstrap';

import { getCurrentSession } from '@/services/auth';
import { ensureDevAnonymousSession } from '@/services/auth/devAnonymousAuth';
import {
  isDevAuthBypassActive,
  logDevAnonymousAuthBootstrap,
  logDevAuthBypassBootstrap,
  logDevAuthBypassCloudSyncSkipped,
} from '@/services/auth/devAuthBypass';
import {
  bootstrapDevPreview,
  shouldBootstrapDevPreview,
} from '@/services/devPreview/devPreviewProvider';
import { DEV_PREVIEW_LOCAL_USER_KEY } from '@/services/devPreview/devPreviewData';

import { processSyncQueue, synchronizeUserData } from '@/services/cloud/syncService';

import { createProfile, getCurrentProfile } from '@/services/profile';

import { useAppStore } from '@/store/appStore';

import { useGamificationStore } from '@/store/gamificationStore';

import { useMitzvahStore } from '@/store/mitzvahStore';

import { useUserStore } from '@/store/userStore';



export interface InitializationResult {

  isInitialized: boolean;

  isLoading: boolean;

  isAuthenticated: boolean;

  onboardingComplete: boolean;

  isSupabaseConfigured: boolean;

  deepLinkBootstrapComplete: boolean;

  passwordRecoveryPending: boolean;

  invalidRecoveryLink: boolean;

}



export function useAppInitialization(): InitializationResult {

  const isInitialized = useAppStore((state) => state.isInitialized);

  const isLoading = useAppStore((state) => state.isLoading);

  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const onboardingComplete = useAppStore((state) => state.onboardingComplete);

  const isSupabaseConfigured = useAppStore((state) => state.isSupabaseConfigured);

  const deepLinkBootstrapComplete = useAppStore(

    (state) => state.deepLinkBootstrapComplete,

  );

  const passwordRecoveryPending = useAppStore(

    (state) => state.passwordRecoveryPending,

  );

  const invalidRecoveryLink = useAppStore((state) => state.invalidRecoveryLink);

  const initializeApp = useAppStore((state) => state.initialize);

  const setAuthenticated = useAppStore((state) => state.setAuthenticated);

  const setDeepLinkBootstrapComplete = useAppStore(

    (state) => state.setDeepLinkBootstrapComplete,

  );

  const setPasswordRecoveryPending = useAppStore(

    (state) => state.setPasswordRecoveryPending,

  );

  const setInvalidRecoveryLink = useAppStore((state) => state.setInvalidRecoveryLink);

  const setUser = useUserStore((state) => state.setUser);

  const initializeMitzvot = useMitzvahStore((state) => state.initialize);

  const initializeGamification = useGamificationStore((state) => state.initialize);



  useEffect(() => {

    const bootstrap = async () => {

      try {

        const deepLinkResult = await bootstrapAuthFromInitialDeepLink();

        setPasswordRecoveryPending(deepLinkResult.passwordRecovery);

        setInvalidRecoveryLink(deepLinkResult.invalidRecoveryLink);



        const session =
          deepLinkResult.session ??
          (await getCurrentSession()) ??
          (isDevAuthBypassActive() ? await ensureDevAnonymousSession() : null);

        if (session?.user) {
          let profile = await getCurrentProfile(session.user.id);

          if (!profile) {
            const displayName = session.user.is_anonymous
              ? 'משתמש פיתוח'
              : session.user.user_metadata?.display_name ??
                session.user.email?.split('@')[0] ??
                'משתמש';

            profile = await createProfile(
              session.user.id,
              session.user.email ?? '',
              displayName,
            );
          }

          setUser(profile);
          setAuthenticated(true);

          if (isDevAuthBypassActive() && session.user.is_anonymous) {
            logDevAnonymousAuthBootstrap(session.user.id);
          }

          await initializeApp(session.user.id);
          await initializeMitzvot(session.user.id);
          await initializeGamification(session.user.id);

          try {
            await synchronizeUserData(session.user.id);
          } catch {
            await processSyncQueue(session.user.id);
          }

          return;
        }

        setAuthenticated(false);

        if (isDevAuthBypassActive()) {
          logDevAuthBypassBootstrap();
          logDevAuthBypassCloudSyncSkipped();
        }

        if (shouldBootstrapDevPreview()) {
          await bootstrapDevPreview();
          await initializeApp(DEV_PREVIEW_LOCAL_USER_KEY);
          return;
        }

        await initializeApp();

      } catch (error) {

        console.error('Initialization failed:', error);

        setAuthenticated(false);

        await initializeApp();

      } finally {

        setDeepLinkBootstrapComplete(true);

      }

    };



    void bootstrap();

  }, [

    initializeApp,

    initializeGamification,

    initializeMitzvot,

    setAuthenticated,

    setDeepLinkBootstrapComplete,

    setInvalidRecoveryLink,

    setPasswordRecoveryPending,

    setUser,

  ]);



  return {

    isInitialized,

    isLoading,

    isAuthenticated,

    onboardingComplete,

    isSupabaseConfigured,

    deepLinkBootstrapComplete,

    passwordRecoveryPending,

    invalidRecoveryLink,

  };

}

