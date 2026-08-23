import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

import { getSupabaseClient, isSupabaseConfigured } from '@/services/supabase';

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
  'New password should be different from the old password': 'הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת',
  'Auth session missing!': 'הקישור לאיפוס הסיסמה לא תקין. בקש קישור חדש',
};

function translateAuthError(message: string): string {
  return HEBREW_ERRORS[message] ?? 'אירעה שגיאה. נסה שוב.';
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
    throw new Error(translateAuthError(error.message));
  }

  return data.session;
}

export async function signInWithEmail(
  email: string,
  password: string,
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
    throw new Error(translateAuthError(error.message));
  }

  if (!data.user || !data.session) {
    throw new Error('ההתחברות נכשלה. נסה שוב.');
  }

  return { user: data.user, session: data.session };
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
    throw new Error(translateAuthError(error.message));
  }

  if (!data.user) {
    throw new Error('ההרשמה נכשלה. נסה שוב.');
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
    throw new Error(translateAuthError(error.message));
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
    throw new Error(translateAuthError(error.message));
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
    throw new Error(translateAuthError(error.message));
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
    throw new Error(translateAuthError(error.message));
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const { error } = await getSupabaseClient().auth.signOut();
  if (error) {
    throw new Error(translateAuthError(error.message));
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
