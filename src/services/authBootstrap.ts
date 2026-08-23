import { Linking } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import {
  createSessionFromUrl,
  isEmailConfirmationUrl,
  isPasswordRecoveryUrl,
} from '@/services/auth';

export type AuthDeepLinkBootstrapResult = {
  session: Session | null;
  passwordRecovery: boolean;
  emailConfirmation: boolean;
  hadInitialUrl: boolean;
  invalidRecoveryLink: boolean;
};

/**
 * Processes the cold-start deep link before splash routing (P10.5-002).
 * Warm-start links are handled by useDeepLinkAuth.
 */
export async function bootstrapAuthFromInitialDeepLink(): Promise<AuthDeepLinkBootstrapResult> {
  const url = await Linking.getInitialURL();

  if (!url) {
    return {
      session: null,
      passwordRecovery: false,
      emailConfirmation: false,
      hadInitialUrl: false,
      invalidRecoveryLink: false,
    };
  }

  const passwordRecovery = isPasswordRecoveryUrl(url);
  const emailConfirmation = isEmailConfirmationUrl(url);

  try {
    const session = await createSessionFromUrl(url);
    return {
      session,
      passwordRecovery: passwordRecovery && Boolean(session),
      emailConfirmation: emailConfirmation && Boolean(session),
      hadInitialUrl: true,
      invalidRecoveryLink: passwordRecovery && !session,
    };
  } catch {
    return {
      session: null,
      passwordRecovery: false,
      emailConfirmation: false,
      hadInitialUrl: true,
      invalidRecoveryLink: passwordRecovery,
    };
  }
}
