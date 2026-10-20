import type { AuthError, Session } from '@supabase/supabase-js';

import { getCurrentSession } from '@/services/auth';
import { isDevAuthBypassActive } from '@/services/auth/devAuthBypass';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

/** Banner shown when a real anonymous Supabase session is active in development. */
export const DEV_ANONYMOUS_AUTH_BANNER = 'מצב פיתוח — משתמש אנונימי';

export interface DevAnonymousAuthFailure {
  classification: string;
  message: string;
  code: string | null;
  status: number | null;
}

let lastDevAnonymousAuthFailure: DevAnonymousAuthFailure | null = null;

export function getDevAnonymousAuthFailure(): DevAnonymousAuthFailure | null {
  return lastDevAnonymousAuthFailure;
}

export function clearDevAnonymousAuthFailure(): void {
  lastDevAnonymousAuthFailure = null;
}

export function isAnonymousAuthUser(session: Session | null | undefined): boolean {
  return session?.user.is_anonymous === true;
}

function classifyAnonymousSignInFailure(error: AuthError | null): DevAnonymousAuthFailure {
  if (!isSupabaseConfigured()) {
    return {
      classification: 'SUPABASE_NOT_CONFIGURED',
      message: 'Supabase is not configured for anonymous sign-in',
      code: null,
      status: null,
    };
  }

  const code = typeof error?.code === 'string' ? error.code : null;
  const status = typeof error?.status === 'number' ? error.status : null;
  const message = error?.message ?? 'Anonymous sign-in returned no session';
  const normalized = message.toLowerCase();

  if (
    code === 'anonymous_provider_disabled' ||
    normalized.includes('anonymous sign-ins are disabled') ||
    normalized.includes('anonymous sign-in is disabled')
  ) {
    return {
      classification: 'ANONYMOUS_SIGN_IN_DISABLED',
      message,
      code,
      status,
    };
  }

  if (code === 'signup_disabled' || normalized.includes('signups not allowed')) {
    return {
      classification: 'ANONYMOUS_SIGN_IN_DISABLED',
      message,
      code,
      status,
    };
  }

  return {
    classification: 'ANONYMOUS_SIGN_IN_FAILED',
    message,
    code,
    status,
  };
}

/**
 * Ensures a real Supabase anonymous session exists in development builds.
 * Production callers must never invoke this path.
 */
export async function ensureDevAnonymousSession(): Promise<Session | null> {
  if (!__DEV__ || !isDevAuthBypassActive() || !isSupabaseConfigured()) {
    if (__DEV__ && isDevAuthBypassActive() && !isSupabaseConfigured()) {
      lastDevAnonymousAuthFailure = classifyAnonymousSignInFailure(null);
    }
    return null;
  }

  const existing = await getCurrentSession();
  if (existing) {
    clearDevAnonymousAuthFailure();
    return existing;
  }

  const { data, error } = await getSupabaseClient().auth.signInAnonymously();

  if (error || !data.session) {
    lastDevAnonymousAuthFailure = classifyAnonymousSignInFailure(error);
    logDiagnosticEvent('AUTH', 'dev_anonymous_sign_in_failed', 'error', {
      classification: lastDevAnonymousAuthFailure.classification,
      message: lastDevAnonymousAuthFailure.message,
      code: lastDevAnonymousAuthFailure.code,
      status: lastDevAnonymousAuthFailure.status,
    });
    return null;
  }

  clearDevAnonymousAuthFailure();
  logDiagnosticEvent('AUTH', 'dev_anonymous_sign_in_success', 'info', {
    userId: data.session.user.id,
    anonymous: data.session.user.is_anonymous === true,
  });

  return data.session;
}
