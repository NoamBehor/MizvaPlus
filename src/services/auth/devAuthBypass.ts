import { getDevAnonymousAuthFailure } from '@/services/auth/devAnonymousAuth';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import {
  DEV_PREVIEW_RUNTIME_LABEL,
  getDevPreviewDiagnostics,
} from '@/services/devPreview/devPreviewDiagnostics';
import { isDevPreviewMode } from '@/services/devPreview/isDevPreviewMode';

/** Hebrew banner shown when development bypass has no Supabase session yet. */
export const DEV_AUTH_BYPASS_BANNER = 'מצב פיתוח — ללא התחברות';

let cloudSyncSkipLogged = false;
let bootstrapLogged = false;

/**
 * True only in development builds. Production auth flow is unchanged.
 */
export function isDevAuthBypassActive(): boolean {
  return __DEV__;
}

export function logDevAuthBypassBootstrap(): void {
  if (!isDevAuthBypassActive() || bootstrapLogged) {
    return;
  }
  bootstrapLogged = true;
  logDiagnosticEvent('AUTH', 'DEV_AUTH_BYPASS — development entry without login', 'info', {
    authenticatedSession: false,
    productionAuthUnchanged: true,
  });
}

export function logDevAnonymousAuthBootstrap(userId: string): void {
  if (!isDevAuthBypassActive()) {
    return;
  }

  logDiagnosticEvent('AUTH', 'DEV_ANONYMOUS — development anonymous session ready', 'info', {
    authenticatedSession: true,
    anonymous: true,
    userId,
    productionAuthUnchanged: true,
  });
}

export function logDevAuthBypassCloudSyncSkipped(): void {
  if (!isDevAuthBypassActive() || cloudSyncSkipLogged) {
    return;
  }
  cloudSyncSkipLogged = true;
  logDiagnosticEvent(
    'AUTH',
    'DEV_AUTH_BYPASS — authenticated cloud sync skipped',
    'info',
  );
}

export function getDevAuthBannerLabel(options?: {
  isAuthenticated?: boolean;
  isAnonymous?: boolean;
}): string {
  if (options?.isAuthenticated && options?.isAnonymous) {
    return 'מצב פיתוח — משתמש אנונימי';
  }

  return DEV_AUTH_BYPASS_BANNER;
}

export function getDevAuthDiagnostics(
  isAuthenticated: boolean,
  options?: { isAnonymous?: boolean },
): {
  authenticationMode: string;
  authenticatedSession: boolean;
  anonymous: boolean;
  productionAuth: string;
  runtimeLabel?: string | null;
  authFailureClassification?: string | null;
  authFailureMessage?: string | null;
} {
  if (!isDevAuthBypassActive()) {
    return {
      authenticationMode: 'PRODUCTION',
      authenticatedSession: isAuthenticated,
      anonymous: false,
      productionAuth: 'ACTIVE',
    };
  }

  if (isAuthenticated && options?.isAnonymous) {
    return {
      authenticationMode: 'DEV ANONYMOUS',
      authenticatedSession: true,
      anonymous: true,
      productionAuth: 'UNCHANGED',
      runtimeLabel: isDevPreviewMode() ? DEV_PREVIEW_RUNTIME_LABEL : null,
    };
  }

  if (isDevPreviewMode()) {
    const preview = getDevPreviewDiagnostics(isAuthenticated);
    const authFailure = getDevAnonymousAuthFailure();
    return {
      authenticationMode: preview.authenticationMode,
      authenticatedSession: preview.authenticatedSession,
      anonymous: false,
      productionAuth: preview.productionAuth,
      runtimeLabel: preview.runtimeLabel,
      authFailureClassification: authFailure?.classification ?? null,
      authFailureMessage: authFailure?.message ?? null,
    };
  }

  const authFailure = getDevAnonymousAuthFailure();

  return {
    authenticationMode: 'DEVELOPMENT BYPASS',
    authenticatedSession: isAuthenticated,
    anonymous: false,
    productionAuth: 'UNCHANGED',
    authFailureClassification: authFailure?.classification ?? null,
    authFailureMessage: authFailure?.message ?? null,
  };
}
