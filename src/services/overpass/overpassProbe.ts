import { Platform } from 'react-native';

import {
  OVERPASS_ENDPOINTS,
  OVERPASS_REQUEST_TIMEOUT_MS,
  OVERPASS_USER_AGENT,
} from '@/constants/overpass';
import {
  classifyOverpassFetchFailure,
  type OverpassCancellationClass,
} from '@/services/overpass/classifyOverpassError';
import {
  setOverpassProbeResult,
  type OverpassProbeResult,
} from '@/services/overpass/overpassDiagnostics';

const PROBE_QUERY = '[out:json][timeout:5];node(1);out;';
const PROBE_TIMEOUT_MS = Math.min(OVERPASS_REQUEST_TIMEOUT_MS, 15_000);

function resolveProbeEndpoint(endpoint?: string): string {
  if (endpoint && OVERPASS_ENDPOINTS.includes(endpoint)) {
    return endpoint;
  }

  return OVERPASS_ENDPOINTS[0] ?? 'https://overpass-api.de/api/interpreter';
}

/**
 * Development-only minimal HTTPS probe against a configured Overpass endpoint.
 * Does not accept arbitrary URLs — only known configured endpoints.
 */
export async function probeOverpassConnectivity(
  endpoint?: string,
): Promise<OverpassProbeResult> {
  if (!__DEV__) {
    throw new Error('Overpass probe is only available in development builds');
  }

  const targetEndpoint = resolveProbeEndpoint(endpoint);
  const startedAt = Date.now();
  const controller = new AbortController();
  let abortedByClientTimeout = false;

  const timeoutId = setTimeout(() => {
    abortedByClientTimeout = true;
    controller.abort();
  }, PROBE_TIMEOUT_MS);

  let httpStatus: number | null = null;
  let networkErrorName: string | null = null;
  let networkErrorMessage: string | null = null;
  let classification: OverpassCancellationClass = 'UNKNOWN';
  let status: OverpassProbeResult['status'] = 'FAILED';

  try {
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(PROBE_QUERY)}`,
      signal: controller.signal,
    });

    httpStatus = response.status;
    await response.text();

    if (response.ok) {
      classification = 'UNKNOWN';
      status = 'SUCCESS';
    } else if (response.status >= 500) {
      classification = 'OVERPASS_SERVER_FAILURE';
      status = 'FAILED';
    } else {
      classification = 'HTTP_ERROR';
      status = 'FAILED';
    }
  } catch (error) {
    const endedAt = Date.now();
    const durationMs = endedAt - startedAt;
    networkErrorName = error instanceof Error ? error.name : null;
    networkErrorMessage = error instanceof Error ? error.message : String(error);
    classification = classifyOverpassFetchFailure({
      error,
      durationMs,
      timeoutMs: PROBE_TIMEOUT_MS,
      abortedByClientTimeout,
      httpStatus: undefined,
    });
    status =
      classification === 'TIMEOUT' ||
      classification === 'ABORTED_BY_COMPONENT_UNMOUNT' ||
      classification === 'ABORTED_BY_NEW_REQUEST'
        ? 'CANCELLED'
        : 'FAILED';
  } finally {
    clearTimeout(timeoutId);
  }

  const endedAt = Date.now();
  const result: OverpassProbeResult = {
    endpoint: targetEndpoint,
    platform: Platform.OS,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    status,
    httpStatus,
    classification,
    networkErrorName,
    networkErrorMessage,
    abortedByClientTimeout,
    timeoutMs: PROBE_TIMEOUT_MS,
  };

  setOverpassProbeResult(result);

  if (__DEV__) {
    console.log('[OverpassProbe]', {
      endpoint: result.endpoint,
      platform: result.platform,
      status: result.status,
      durationMs: result.durationMs,
      timeoutMs: result.timeoutMs,
      classification: result.classification,
      httpStatus: result.httpStatus,
      abortedByClientTimeout: result.abortedByClientTimeout,
      networkErrorName: result.networkErrorName,
    });
  }

  return result;
}
