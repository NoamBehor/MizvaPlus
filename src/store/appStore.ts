import { create } from 'zustand';

import { requestCloudSync } from '@/services/cloud/syncService';
import { isSupabaseConfigured } from '@/services/supabase';
import { getJson, onboardingStorageKey, setJson } from '@/utils/storage';

interface AppState {
  isInitialized: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  deepLinkBootstrapComplete: boolean;
  passwordRecoveryPending: boolean;
  invalidRecoveryLink: boolean;
  initialize: (userId?: string) => Promise<void>;
  completeOnboarding: (userId: string) => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLoading: (loading: boolean) => void;
  setDeepLinkBootstrapComplete: (complete: boolean) => void;
  setPasswordRecoveryPending: (pending: boolean) => void;
  setInvalidRecoveryLink: (invalid: boolean) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isInitialized: false,
  isLoading: true,
  onboardingComplete: false,
  isAuthenticated: false,
  isSupabaseConfigured: isSupabaseConfigured(),
  deepLinkBootstrapComplete: false,
  passwordRecoveryPending: false,
  invalidRecoveryLink: false,

  initialize: async (userId?: string) => {
    let onboardingComplete = false;

    if (userId) {
      onboardingComplete =
        (await getJson<boolean>(onboardingStorageKey(userId))) ?? false;
    }

    set({
      onboardingComplete,
      isSupabaseConfigured: isSupabaseConfigured(),
      isInitialized: true,
      isLoading: false,
    });
  },

  completeOnboarding: async (userId: string) => {
    await setJson(onboardingStorageKey(userId), true);
    set({ onboardingComplete: true });
    void requestCloudSync(userId);
  },

  setAuthenticated: (authenticated: boolean) => {
    set({ isAuthenticated: authenticated });
  },

  setOnboardingComplete: (complete: boolean) => {
    set({ onboardingComplete: complete });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setDeepLinkBootstrapComplete: (complete: boolean) => {
    set({ deepLinkBootstrapComplete: complete });
  },

  setPasswordRecoveryPending: (pending: boolean) => {
    set({ passwordRecoveryPending: pending });
  },

  setInvalidRecoveryLink: (invalid: boolean) => {
    set({ invalidRecoveryLink: invalid });
  },

  reset: () => {
    set({
      isInitialized: false,
      isLoading: true,
      onboardingComplete: false,
      isAuthenticated: false,
      isSupabaseConfigured: isSupabaseConfigured(),
      deepLinkBootstrapComplete: false,
      passwordRecoveryPending: false,
      invalidRecoveryLink: false,
    });
  },
}));
