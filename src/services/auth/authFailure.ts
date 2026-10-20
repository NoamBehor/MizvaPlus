export type AuthFailurePhase = 'sign_in' | 'session' | 'post_auth_init';

export interface AuthFailureDetails {
  code: string | null;
  message: string;
  status: number | null;
  phase: AuthFailurePhase;
  userExistsHint: 'unknown' | 'likely_exists' | 'likely_missing' | 'email_unconfirmed';
  sessionCreated: boolean;
  rootAuthGateHasSession: boolean | null;
  sessionClearedAfterSignIn: boolean | null;
}

export class AuthFailure extends Error {
  readonly details: AuthFailureDetails;

  constructor(userMessage: string, details: AuthFailureDetails) {
    super(userMessage);
    this.name = 'AuthFailure';
    this.details = details;
  }
}
