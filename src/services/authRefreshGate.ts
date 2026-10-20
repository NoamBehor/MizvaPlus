import { AppState } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

/**
 * GoTrue single-flights refresh via `refreshingDeferred`. Auto-refresh calls
 * `_callRefreshToken` directly (not `refreshSession`), so sync must await this
 * before reading or using the session for REST.
 */
interface GoTrueRefreshInternals {
  refreshingDeferred?: { promise: Promise<unknown> } | null;
}

let syncAuthChain: Promise<void> = Promise.resolve();
let refreshWaiters = 0;
let syncAuthGuardDepth = 0;

export function isSyncAuthGuardActive(): boolean {
  return syncAuthGuardDepth > 0;
}

export function isAuthRefreshInProgress(): boolean {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const internals = getSupabaseClient().auth as unknown as GoTrueRefreshInternals;
  return internals.refreshingDeferred != null || refreshWaiters > 0;
}

/** Await any in-flight GoTrue token refresh without starting a new one. */
export async function waitForAuthRefreshIdle(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  refreshWaiters += 1;
  try {
    const internals = getSupabaseClient().auth as unknown as GoTrueRefreshInternals;
    const deferred = internals.refreshingDeferred;
    if (deferred?.promise) {
      await deferred.promise;
    }
  } finally {
    refreshWaiters -= 1;
  }
}

/** Start auto-refresh only when no cloud sync auth guard is active. */
export function requestAutoRefreshWhenIdle(): void {
  if (!isSupabaseConfigured() || isSyncAuthGuardActive()) {
    return;
  }

  if (AppState.currentState !== 'active') {
    return;
  }

  void getSupabaseClient().auth.startAutoRefresh();
}

/**
 * Serializes cloud sync against Supabase auto-refresh:
 * 1. Claim the guard and pause auto-refresh immediately (before awaiting prior sync)
 * 2. Queue behind any prior sync auth guard
 * 3. Wait for in-flight refresh to finish
 * 4. Run caller
 * 5. Resume auto-refresh when foregrounded and no other sync holds the guard
 */
export async function withSyncAuthGuard<T>(operation: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const previous = syncAuthChain;
  syncAuthChain = new Promise<void>((resolve) => {
    release = resolve;
  });

  syncAuthGuardDepth += 1;
  const client = isSupabaseConfigured() ? getSupabaseClient() : null;
  if (client) {
    void client.auth.stopAutoRefresh();
  }

  try {
    await previous;

    if (!client) {
      return await operation();
    }

    await waitForAuthRefreshIdle();

    try {
      return await operation();
    } finally {
      // operation finally — resume handled in outer finally
    }
  } finally {
    syncAuthGuardDepth -= 1;
    if (client && AppState.currentState === 'active' && syncAuthGuardDepth === 0) {
      void client.auth.startAutoRefresh();
    }
    release();
  }
}
