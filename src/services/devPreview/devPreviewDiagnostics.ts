import { getDevAnonymousAuthFailure } from '@/services/auth/devAnonymousAuth';
import { isDevPreviewMode } from '@/services/devPreview/isDevPreviewMode';

export const DEV_PREVIEW_RUNTIME_LABEL = 'WEB DEVELOPMENT PREVIEW';
export const DEV_PREVIEW_AUTH_MODE = 'DEV PREVIEW — NO SESSION';

export function getDevPreviewDiagnostics(isAuthenticated: boolean): {
  runtimeLabel: string | null;
  authenticationMode: string;
  authenticatedSession: boolean;
  productionAuth: string;
} {
  if (!isDevPreviewMode()) {
    return {
      runtimeLabel: null,
      authenticationMode: 'PRODUCTION',
      authenticatedSession: isAuthenticated,
      productionAuth: 'ACTIVE',
    };
  }

  if (isAuthenticated) {
    return {
      runtimeLabel: DEV_PREVIEW_RUNTIME_LABEL,
      authenticationMode: 'DEV ANONYMOUS',
      authenticatedSession: true,
      productionAuth: 'UNCHANGED',
    };
  }

  const authFailure = getDevAnonymousAuthFailure();
  const authenticationMode = authFailure
    ? `DEV ANONYMOUS FAILED — ${authFailure.classification}`
    : DEV_PREVIEW_AUTH_MODE;

  return {
    runtimeLabel: DEV_PREVIEW_RUNTIME_LABEL,
    authenticationMode,
    authenticatedSession: false,
    productionAuth: 'UNCHANGED',
  };
}
