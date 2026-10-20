import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import { requestAutoRefreshWhenIdle } from '@/services/authRefreshGate';

/**
 * Wires Supabase Auth auto-refresh to React Native AppState.
 * Required in RN so token refresh runs while the app is foregrounded and
 * pauses in background (see Supabase Expo / React Native auth guidance).
 */
export function useSupabaseAuthRefresh(): void {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const client = getSupabaseClient();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        requestAutoRefreshWhenIdle();
      } else {
        void client.auth.stopAutoRefresh();
      }
    };

    if (AppState.currentState === 'active') {
      requestAutoRefreshWhenIdle();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      void client.auth.stopAutoRefresh();
    };
  }, []);
}
