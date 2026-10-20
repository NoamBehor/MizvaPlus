import type { AuthError } from '@supabase/supabase-js';

import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

import type { AuthFailureDetails, AuthFailurePhase } from './authFailure';

const HEBREW_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'אימייל או סיסמה שגויים',
  'User already registered': 'משתמש עם אימייל זה כבר קיים',
  'Password should be at least 6 characters': 'הסיסמה חייבת להכיל לפחות 6 תווים',
  'Unable to validate email address: invalid format': 'כתובת אימייל לא תקינה',
  'Email not confirmed': 'יש לאשר את כתובת האימייל לפני ההתחברות',
  'Email rate limit exceeded': 'נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות',
  'For security purposes, you can only request this once every 60 seconds':
    'נשלחו יותר מדי בקשות. נסה שוב בעוד כמה דקות',
  'Token has expired or is invalid': 'הקישור לאיפוס הסיסמה פג תוקף. בקש קישור חדש',
  'New password should be different from the old password':
    'הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת',
  'Auth session missing!': 'הקישור לאיפוס הסיסמה לא תקין. בקש קישור חדש',
};

function isAuthError(error: unknown): error is AuthError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('status' in error || 'code' in error)
  );
}

function inferUserExistsHint(
  code: string | null,
  message: string,
): AuthFailureDetails['userExistsHint'] {
  const normalizedCode = (code ?? '').toLowerCase();
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedCode === 'email_not_confirmed' ||
    normalizedMessage.includes('email not confirmed')
  ) {
    return 'email_unconfirmed';
  }

  if (
    normalizedCode === 'invalid_credentials' ||
    normalizedMessage.includes('invalid login credentials')
  ) {
    return 'unknown';
  }

  if (
    normalizedCode === 'user_not_found' ||
    normalizedMessage.includes('user not found')
  ) {
    return 'likely_missing';
  }

  return 'unknown';
}

export function translateAuthErrorMessage(message: string): string {
  return HEBREW_ERRORS[message] ?? 'אירעה שגיאה. נסה שוב.';
}

export function extractAuthErrorFields(error: unknown): {
  code: string | null;
  message: string;
  status: number | null;
} {
  if (isAuthError(error)) {
    return {
      code: typeof error.code === 'string' ? error.code : null,
      message: error.message,
      status: typeof error.status === 'number' ? error.status : null,
    };
  }

  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
      status: null,
    };
  }

  return {
    code: null,
    message: String(error),
    status: null,
  };
}

export async function readRootAuthGateSession(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) {
    return false;
  }

  return Boolean(data.session?.user);
}

export function buildAuthFailureDetails(
  error: unknown,
  phase: AuthFailurePhase,
  options: {
    sessionCreated?: boolean;
    rootAuthGateHasSession?: boolean | null;
    sessionClearedAfterSignIn?: boolean | null;
  } = {},
): AuthFailureDetails {
  const { code, message, status } = extractAuthErrorFields(error);

  return {
    code,
    message,
    status,
    phase,
    userExistsHint: inferUserExistsHint(code, message),
    sessionCreated: options.sessionCreated ?? false,
    rootAuthGateHasSession: options.rootAuthGateHasSession ?? null,
    sessionClearedAfterSignIn: options.sessionClearedAfterSignIn ?? null,
  };
}

export function logAuthFailureDiagnostics(
  eventName: string,
  details: AuthFailureDetails,
): void {
  logDiagnosticEvent('AUTH', eventName, 'error', {
    authErrorCode: details.code,
    authMessage: details.message,
    httpStatus: details.status,
    phase: details.phase,
    userExistsHint: details.userExistsHint,
    sessionCreated: details.sessionCreated,
    rootAuthGateHasSession: details.rootAuthGateHasSession,
    sessionClearedAfterSignIn: details.sessionClearedAfterSignIn,
  });
}

export function logAuthSuccessDiagnostics(
  eventName: string,
  payload: {
    sessionCreated: boolean;
    rootAuthGateHasSession: boolean;
    userId?: string;
    source?: 'manual' | 'dev_quick';
  },
): void {
  logDiagnosticEvent('AUTH', eventName, 'info', {
    sessionCreated: payload.sessionCreated,
    rootAuthGateHasSession: payload.rootAuthGateHasSession,
    userId: payload.userId,
    source: payload.source,
  });
}
