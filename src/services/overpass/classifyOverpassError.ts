/** Client-side classification for Overpass fetch failures. */
export type OverpassCancellationClass =
  | 'TIMEOUT'
  | 'ABORTED_BY_COMPONENT_UNMOUNT'
  | 'ABORTED_BY_NEW_REQUEST'
  | 'ANDROID_NETWORK_FAILURE'
  | 'HTTP_ERROR'
  | 'OVERPASS_SERVER_FAILURE'
  | 'UNKNOWN';

export interface ClassifyOverpassFetchFailureInput {
  error: unknown;
  durationMs: number;
  timeoutMs: number;
  abortedByClientTimeout: boolean;
  httpStatus?: number;
}

function getErrorName(error: unknown): string | null {
  if (error instanceof Error) {
    return error.name;
  }
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isCancellationMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('aborted')
  );
}

function isAndroidNetworkFailureMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network request failed') ||
    normalized.includes('fetch failed') ||
    normalized.includes('unable to resolve host') ||
    normalized.includes('connection refused') ||
    normalized.includes('connection reset') ||
    normalized.includes('ssl') ||
    normalized.includes('timed out')
  );
}

/**
 * Classifies an Overpass fetch failure using timing, abort ownership, and error shape.
 * React Native often reports AbortController timeouts as "Fetch request has been canceled"
 * instead of `AbortError`.
 */
export function classifyOverpassFetchFailure(
  input: ClassifyOverpassFetchFailureInput,
): OverpassCancellationClass {
  const { error, durationMs, timeoutMs, abortedByClientTimeout, httpStatus } = input;
  const errorName = getErrorName(error);
  const errorMessage = getErrorMessage(error);

  if (typeof httpStatus === 'number') {
    if (httpStatus >= 500) {
      return 'OVERPASS_SERVER_FAILURE';
    }
    return 'HTTP_ERROR';
  }

  const nearTimeoutBoundary =
    abortedByClientTimeout ||
    durationMs >= timeoutMs - 250 ||
    (errorName === 'AbortError' && durationMs >= timeoutMs * 0.8);

  if (nearTimeoutBoundary && (abortedByClientTimeout || errorName === 'AbortError')) {
    return 'TIMEOUT';
  }

  if (isCancellationMessage(errorMessage)) {
    if (abortedByClientTimeout) {
      return 'TIMEOUT';
    }

    if (durationMs < timeoutMs * 0.5) {
      return 'ANDROID_NETWORK_FAILURE';
    }

    return 'UNKNOWN';
  }

  if (errorName === 'AbortError') {
    return abortedByClientTimeout ? 'TIMEOUT' : 'UNKNOWN';
  }

  if (isAndroidNetworkFailureMessage(errorMessage)) {
    return 'ANDROID_NETWORK_FAILURE';
  }

  return 'UNKNOWN';
}

export function formatOverpassAttemptStatus(
  classification: OverpassCancellationClass,
  httpStatus?: number,
): 'SUCCESS' | 'FAILED' | 'CANCELLED' {
  if (classification === 'TIMEOUT') {
    return 'CANCELLED';
  }

  if (
    classification === 'ABORTED_BY_COMPONENT_UNMOUNT' ||
    classification === 'ABORTED_BY_NEW_REQUEST'
  ) {
    return 'CANCELLED';
  }

  if (typeof httpStatus === 'number' && httpStatus >= 200 && httpStatus < 300) {
    return 'SUCCESS';
  }

  return 'FAILED';
}
