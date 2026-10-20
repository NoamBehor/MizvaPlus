import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import {
  buildAuthFailureDetails,
  logAuthFailureDiagnostics,
  logAuthSuccessDiagnostics,
  readRootAuthGateSession,
  translateAuthErrorMessage,
} from '@/services/auth/authDiagnostics';
import { AuthFailure } from '@/services/auth/authFailure';
import { getDevTestCredentials } from '@/services/auth/devTestCredentials';
import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

export { AuthFailure } from '@/services/auth/authFailure';
export type { AuthFailureDetails } from '@/services/auth/authFailure';

export interface AuthResult {
  user: User;
  session: Session;
}

export type SignUpResult =
  | { status: 'authenticated'; user: User; session: Session }
  | { status: 'confirmation_pending'; email: string };

export const PASSWORD_RESET_REDIRECT = 'mitzvahapp://reset-password';
export const EMAIL_CONFIRMATION_REDIRECT = 'mitzvahapp://confirm';

export function isPasswordRecoveryUrl(url: string): boolean {
  return (
    url.includes('reset-password') ||
    url.includes('type=recovery') ||
    url.includes('type=password_recovery')
  );
}

export function isEmailConfirmationUrl(url: string): boolean {
  return (
    url.includes('mitzvahapp://confirm') ||
    url.includes('type=signup') ||
    url.includes('type=email_change')
  );
}

function throwAuthFailure(
  error: unknown,
  phase: 'sign_in' | 'session' | 'post_auth_init',
  options: {
    sessionCreated?: boolean;
    rootAuthGateHasSession?: boolean | null;
    sessionClearedAfterSignIn?: boolean | null;
  } = {},
): never {
  const details = buildAuthFailureDetails(error, phase, options);
  const userMessage =
    phase === 'sign_in' || phase === 'session'
      ? translateAuthErrorMessage(details.message)
      : error instanceof Error
        ? error.message
        : translateAuthErrorMessage(details.message);

  logAuthFailureDiagnostics('auth_failure', details);
  throw new AuthFailure(userMessage, details);
}

function extractUrlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramString =
    hashIndex >= 0
      ? url.substring(hashIndex + 1)
      : queryIndex >= 0
        ? url.substring(queryIndex + 1)
        : '';

  if (!paramString) {
    return params;
  }

  for (const pair of paramString.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return params;
}

export { isSupabaseConfigured };

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) {
    throwAuthFailure(error, 'session');
  }

  return data.session;
}

async function signInWithPasswordInternal(
  email: string,
  password: string,
  source: 'manual' | 'dev_quick',
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase אינו מוגדר. הגדר את משתני הסביבה EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const { data, error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    throwAuthFailure(error, 'sign_in', { sessionCreated: false });
  }

  const sessionCreated = Boolean(data.session);
  const rootAuthGateHasSession = await readRootAuthGateSession();

  if (!data.user || !data.session) {
    throwAuthFailure(new Error('ההתחברות נכשלה. נסה שוב.'), 'session', {
      sessionCreated,
      rootAuthGateHasSession,
    });
  }

  logAuthSuccessDiagnostics('auth_sign_in_success', {
    sessionCreated,
    rootAuthGateHasSession,
    userId: data.user.id,
    source,
  });

  return { user: data.user, session: data.session };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  return signInWithPasswordInternal(email, password, 'manual');
}

export async function signInWithDevTestAccount(): Promise<AuthResult> {
  if (!__DEV__) {
    throw new Error('כניסה מהירה לפיתוח זמינה רק בסביבת פיתוח.');
  }

  const credentials = getDevTestCredentials();
  if (!credentials) {
    throw new Error('לא הוגדר חשבון בדיקה לפיתוח');
  }

  return signInWithPasswordInternal(
    credentials.email,
    credentials.password,
    'dev_quick',
  );
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<SignUpResult> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase אינו מוגדר. הגדר את משתני הסביבה EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedDisplayName = displayName?.trim();
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      emailRedirectTo: EMAIL_CONFIRMATION_REDIRECT,
      ...(trimmedDisplayName
        ? { data: { display_name: trimmedDisplayName } }
        : {}),
    },
  });

  if (error) {
    throwAuthFailure(error, 'sign_in');
  }

  if (!data.user) {
    throwAuthFailure(new Error('ההרשמה נכשלה. נסה שוב.'), 'sign_in');
  }

  if (!data.session) {
    return { status: 'confirmation_pending', email: trimmedEmail };
  }

  return { status: 'authenticated', user: data.user, session: data.session };
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase אינו מוגדר. הגדר את משתני הסביבה EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: EMAIL_CONFIRMATION_REDIRECT,
    },
  });

  if (error) {
    throwAuthFailure(error, 'sign_in');
  }
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase אינו מוגדר. הגדר את משתני הסביבה EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: PASSWORD_RESET_REDIRECT },
  );

  if (error) {
    throwAuthFailure(error, 'sign_in');
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase אינו מוגדר. הגדר את משתני הסביבה EXPO_PUBLIC_SUPABASE_URL ו-EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const { error } = await getSupabaseClient().auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throwAuthFailure(error, 'sign_in');
  }
}

export async function createSessionFromUrl(url: string): Promise<Session | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const params = extractUrlParams(url);
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (!accessToken || !refreshToken) {
    return null;
  }

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    throwAuthFailure(error, 'session');
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throwAuthFailure(error, 'session');
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!isSupabaseConfigured()) {
    return () => undefined;
  }

  const { data } = getSupabaseClient().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
