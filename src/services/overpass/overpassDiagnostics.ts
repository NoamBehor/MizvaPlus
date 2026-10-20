import { Platform } from 'react-native';

import type { OverpassCancellationClass } from '@/services/overpass/classifyOverpassError';

export interface OverpassEndpointAttemptDiagnostics {
  endpoint: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  abortControllerCreated: boolean;
  abortControllerAborted: boolean;
  timeoutMs: number;
  abortedByClientTimeout: boolean;
  abortReason: string | null;
  httpStatus: number | null;
  networkErrorName: string | null;
  networkErrorMessage: string | null;
  classification: OverpassCancellationClass;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
}

export interface OverpassProbeResult {
  endpoint: string;
  platform: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  httpStatus: number | null;
  classification: OverpassCancellationClass;
  networkErrorName: string | null;
  networkErrorMessage: string | null;
  abortedByClientTimeout: boolean;
  timeoutMs: number;
}

export type OverpassFinalSource =
  | 'LIVE'
  | 'MEMORY_CACHE'
  | 'PERSISTENT_CACHE'
  | 'PERSISTENT_CACHE_STALE'
  | null;

export interface OverpassDiagnosticsSnapshot {
  platform: string;
  capturedAt: number;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  elementCount: number | null;
  endpointAttempts: OverpassEndpointAttemptDiagnostics[];
  successfulEndpoint: string | null;
  fallbackEndpoint: string | null;
  fallbackUsed: boolean;
  timeoutMs: number;
  cacheHit: boolean;
  cacheStale: boolean;
  finalSource: OverpassFinalSource;
  finalResult: 'SUCCESS' | 'ALL_FAILED' | 'CACHE_FALLBACK' | null;
  finalStatus: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'IN_PROGRESS' | 'CACHE_FALLBACK';
  probeResult: OverpassProbeResult | null;
}

const EMPTY_SNAPSHOT: OverpassDiagnosticsSnapshot = {
  platform: Platform.OS,
  capturedAt: 0,
  latitude: null,
  longitude: null,
  radiusMeters: null,
  elementCount: null,
  endpointAttempts: [],
  successfulEndpoint: null,
  fallbackEndpoint: null,
  fallbackUsed: false,
  timeoutMs: 0,
  cacheHit: false,
  cacheStale: false,
  finalSource: null,
  finalResult: null,
  finalStatus: 'IN_PROGRESS',
  probeResult: null,
};

let latestSnapshot: OverpassDiagnosticsSnapshot = { ...EMPTY_SNAPSHOT };

export function beginOverpassDiagnosticsSession(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timeoutMs: number;
}): void {
  if (!__DEV__) {
    return;
  }

  latestSnapshot = {
    platform: Platform.OS,
    capturedAt: Date.now(),
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: input.radiusMeters,
    elementCount: null,
    endpointAttempts: [],
    successfulEndpoint: null,
    fallbackEndpoint: null,
    fallbackUsed: false,
    timeoutMs: input.timeoutMs,
    cacheHit: false,
    cacheStale: false,
    finalSource: null,
    finalResult: null,
    finalStatus: 'IN_PROGRESS',
    probeResult: latestSnapshot.probeResult,
  };
}

export function recordOverpassEndpointAttempt(
  attempt: OverpassEndpointAttemptDiagnostics,
): void {
  if (!__DEV__) {
    return;
  }

  latestSnapshot = {
    ...latestSnapshot,
    capturedAt: Date.now(),
    endpointAttempts: [...latestSnapshot.endpointAttempts, attempt],
  };
}

export function completeOverpassDiagnosticsSession(input: {
  successfulEndpoint: string | null;
  fallbackEndpoint: string | null;
  fallbackUsed: boolean;
  finalResult: 'SUCCESS' | 'ALL_FAILED' | 'CACHE_FALLBACK';
  elementCount?: number | null;
  cacheHit?: boolean;
  cacheStale?: boolean;
  finalSource?: OverpassFinalSource;
}): void {
  if (!__DEV__) {
    return;
  }

  const lastAttempt = latestSnapshot.endpointAttempts.at(-1);
  const finalStatus =
    input.finalResult === 'CACHE_FALLBACK'
      ? 'CACHE_FALLBACK'
      : input.finalResult === 'SUCCESS'
        ? 'SUCCESS'
        : lastAttempt?.status === 'CANCELLED'
          ? 'CANCELLED'
          : 'FAILED';

  latestSnapshot = {
    ...latestSnapshot,
    capturedAt: Date.now(),
    successfulEndpoint: input.successfulEndpoint,
    fallbackEndpoint: input.fallbackEndpoint,
    fallbackUsed: input.fallbackUsed,
    elementCount: input.elementCount ?? latestSnapshot.elementCount,
    cacheHit: input.cacheHit ?? latestSnapshot.cacheHit,
    cacheStale: input.cacheStale ?? latestSnapshot.cacheStale,
    finalSource: input.finalSource ?? latestSnapshot.finalSource,
    finalResult: input.finalResult,
    finalStatus,
  };
}

export function recordOverpassMemoryCacheHit(elementCount: number): void {
  if (!__DEV__) {
    return;
  }

  latestSnapshot = {
    ...latestSnapshot,
    capturedAt: Date.now(),
    elementCount,
    cacheHit: true,
    cacheStale: false,
    finalSource: 'MEMORY_CACHE',
    finalResult: 'SUCCESS',
    finalStatus: 'SUCCESS',
  };
}

export function setOverpassProbeResult(probeResult: OverpassProbeResult): void {
  if (!__DEV__) {
    return;
  }

  latestSnapshot = {
    ...latestSnapshot,
    probeResult,
  };
}

export function getOverpassDiagnosticsSnapshot(): OverpassDiagnosticsSnapshot {
  return latestSnapshot;
}

export function clearOverpassDiagnosticsSnapshot(): void {
  if (!__DEV__) {
    return;
  }

  latestSnapshot = { ...EMPTY_SNAPSHOT, platform: Platform.OS };
}
