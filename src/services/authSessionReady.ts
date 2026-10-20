import type { Session } from '@supabase/supabase-js';

import { isAuthRefreshInProgress, waitForAuthRefreshIdle } from '@/services/authRefreshGate';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';
import {
  captureJwtForensicSnapshot,
  decodeJwtTimingClaims,
  fetchPostgrestServerTimeSec,
  isJwtIatAheadOfServer,
  isPgrst303Error,
} from '@/utils/jwtForensics';

const EXPIRY_BUFFER_SEC = 30;
const MAX_SESSION_TIMING_REFRESH_ATTEMPTS = 2;

export type SyncLifecycleStage =
  | 'auth-guard'
  | 'session-ready'
  | 'uuid-migration'
  | 'pull'
  | 'merge'
  | 'push'
  | 'finalize';

export interface SessionReadyDiagnostics {
  getSessionPhase: 'before_refresh' | 'after_refresh';
  refreshTriggered: boolean;
  refreshInProgress: boolean;
  gateIatSec: number | null;
  serverTimeSec: number | null;
  refreshAttempts: number;
}

let lastSessionReadyDiagnostics: SessionReadyDiagnostics = {
  getSessionPhase: 'before_refresh',
  refreshTriggered: false,
  refreshInProgress: false,
  gateIatSec: null,
  serverTimeSec: null,
  refreshAttempts: 0,
};

export function getLastSessionReadyDiagnostics(): SessionReadyDiagnostics {
  return lastSessionReadyDiagnostics;
}

async function readSession(client: ReturnType<typeof getSupabaseClient>): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (error) {
    throw error;
  }

  return data.session;
}

async function refreshAndWait(client: ReturnType<typeof getSupabaseClient>): Promise<Session | null> {
  const { data: refreshed, error: refreshError } = await client.auth.refreshSession();
  if (refreshError) {
    throw refreshError;
  }

  await waitForAuthRefreshIdle();
  return refreshed.session;
}

/**
 * Ensures the Supabase client holds a session suitable for authenticated REST calls.
 *
 * - Waits for any in-flight auto-refresh (getSession() does not wait when auto-refresh is on).
 * - Explicitly refreshes when the access token is expired or near expiry.
 * - Refreshes when JWT iat is ahead of the PostgREST server clock (PGRST303 precursor).
 */
export async function ensureSessionReadyForSync(): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = getSupabaseClient();
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  let session = await readSession(client);
  if (!session) {
    lastSessionReadyDiagnostics = {
      getSessionPhase: 'before_refresh',
      refreshTriggered: false,
      refreshInProgress: isAuthRefreshInProgress(),
      gateIatSec: null,
      serverTimeSec: null,
      refreshAttempts: 0,
    };
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  let refreshTriggered = expiresAt > 0 && expiresAt <= nowSec + EXPIRY_BUFFER_SEC;
  let refreshAttempts = 0;

  if (refreshTriggered) {
    session = await refreshAndWait(client);
    refreshAttempts += 1;
  }

  if (!session?.access_token) {
    return session;
  }

  let serverTimeSec = await fetchPostgrestServerTimeSec(supabaseUrl, anonKey);

  while (
    refreshAttempts < MAX_SESSION_TIMING_REFRESH_ATTEMPTS &&
    isJwtIatAheadOfServer(session.access_token, serverTimeSec)
  ) {
    refreshTriggered = true;
    session = await refreshAndWait(client);
    refreshAttempts += 1;
    if (!session?.access_token) {
      break;
    }
    serverTimeSec = await fetchPostgrestServerTimeSec(supabaseUrl, anonKey);
  }

  const gateIatSec = session?.access_token
    ? (decodeJwtTimingClaims(session.access_token)?.iat ?? null)
    : null;

  lastSessionReadyDiagnostics = {
    getSessionPhase: refreshTriggered ? 'after_refresh' : 'before_refresh',
    refreshTriggered,
    refreshInProgress: isAuthRefreshInProgress(),
    gateIatSec,
    serverTimeSec,
    refreshAttempts,
  };

  return session;
}

export interface Pgrst303ForensicContext {
  syncStage: SyncLifecycleStage;
  refreshInProgress: boolean;
  getSessionPhase: 'before_refresh' | 'after_refresh';
  refreshTriggered: boolean;
  gateIatSec: number | null;
  failureIatSec: number | null;
  tokenChanged: boolean;
}

/** __DEV__ only — logs numeric JWT timing evidence, never token strings. */
export async function logPgrst303Forensics(
  error: unknown,
  accessToken: string | undefined,
  syncStage: SyncLifecycleStage,
): Promise<void> {
  if (!__DEV__ || !isPgrst303Error(error) || !accessToken || !isSupabaseConfigured()) {
    return;
  }

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const snapshot = await captureJwtForensicSnapshot(accessToken, supabaseUrl, anonKey);
    const sessionDiagnostics = getLastSessionReadyDiagnostics();
    const failureIatSec = snapshot.claims.iat;
    const gateIatSec = sessionDiagnostics.gateIatSec;
    const tokenChanged =
      gateIatSec !== null && failureIatSec !== null && gateIatSec !== failureIatSec;

    console.warn(
      '[jwt-forensics]',
      [
        `clientNowSec=${snapshot.clientTimeSec}`,
        `iatSec=${snapshot.claims.iat}`,
        `nbfSec=${snapshot.claims.nbf}`,
        `expSec=${snapshot.claims.exp}`,
        `serverDateSec=${snapshot.serverTimeSec}`,
        `iatMinusServerSec=${snapshot.iatMinusServerSec}`,
        `refreshInProgress=${isAuthRefreshInProgress()}`,
        `syncStage=${syncStage}`,
        `getSessionPhase=${sessionDiagnostics.getSessionPhase}`,
        `refreshTriggered=${sessionDiagnostics.refreshTriggered}`,
        `refreshAttempts=${sessionDiagnostics.refreshAttempts}`,
        `gateIatSec=${gateIatSec}`,
        `failureIatSec=${failureIatSec}`,
        `tokenChanged=${tokenChanged}`,
      ].join('\n'),
    );
  } catch (forensicError) {
    console.warn('[jwt-forensics] failed to capture snapshot:', forensicError);
  }
}
