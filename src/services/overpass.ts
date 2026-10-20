import {
  OSM_SYNAGOGUE_NAME_FALLBACK,
  OVERPASS_CACHE_TTL_MS,
  OVERPASS_ENDPOINTS,
  OVERPASS_MAX_RADIUS_METERS,
  OVERPASS_USER_AGENT,
  resolveOverpassQueryTimeoutSeconds,
  resolveOverpassRequestTimeoutMs,
  resolveSynagogueSearchRadiusMeters,
} from '@/constants/overpass';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import {
  classifyOverpassFetchFailure,
  formatOverpassAttemptStatus,
} from '@/services/overpass/classifyOverpassError';
import {
  beginOverpassDiagnosticsSession,
  completeOverpassDiagnosticsSession,
  recordOverpassEndpointAttempt,
  recordOverpassMemoryCacheHit,
  type OverpassFinalSource,
} from '@/services/overpass/overpassDiagnostics';
import {
  buildOverpassPersistentCacheKey,
  readOverpassPersistentCache,
  writeOverpassPersistentCache,
} from '@/services/overpass/overpassPersistentCache';
import type { Coordinates } from '@/types/location';
import type { OsmElementType, Synagogue } from '@/types/synagogue';
import { calculateDistanceMeters } from '@/utils/distance';

interface OverpassCenter {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassCenter;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface CacheEntry {
  result: Synagogue[];
  expiresAt: number;
}

export interface OverpassRequestDiagnostics {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  endpoint: string;
  httpStatus?: number;
  responseSize?: number;
  rawElementCount?: number;
  normalizedCount?: number;
}

export interface OverpassFetchMeta {
  source: OverpassFinalSource;
  cacheHit: boolean;
  cacheStale: boolean;
  elementCount: number;
  radiusMeters: number;
}

const resultCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<Synagogue[]>>();
let lastFetchMeta: OverpassFetchMeta | null = null;

export function getLastOverpassFetchMeta(): OverpassFetchMeta | null {
  return lastFetchMeta;
}

function buildCacheKey(coordinates: Coordinates, radiusMeters: number): string {
  return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)},${radiusMeters}`;
}

/**
 * Validates WGS84 coordinates and search radius before issuing an Overpass request.
 */
export function validateOverpassRequest(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): void {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(radiusMeters)
  ) {
    throw new Error('Overpass request coordinates or radius are not finite numbers');
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Overpass request latitude is out of range');
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Overpass request longitude is out of range');
  }

  if (radiusMeters <= 0 || radiusMeters > OVERPASS_MAX_RADIUS_METERS) {
    throw new Error('Overpass request radius is out of allowed range');
  }
}

/**
 * HTTP statuses that should trigger failover to the next Overpass endpoint.
 * 406 is included because overpass-api.de rejects some default clients.
 */
export function isRetryableOverpassHttpStatus(status: number): boolean {
  return status === 406 || status === 429 || status >= 500;
}

/**
 * Builds an Overpass QL query for Jewish places of worship near a point.
 * Covers common OSM tagging variations (place_of_worship, building=synagogue, etc.).
 */
export function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  queryTimeoutSeconds: number = resolveOverpassQueryTimeoutSeconds(),
): string {
  const around = `${radiusMeters},${latitude},${longitude}`;

  return `[out:json][timeout:${queryTimeoutSeconds}];
(
  node["amenity"="place_of_worship"]["religion"~"^(jewish|judaism)$"](around:${around});
  way["amenity"="place_of_worship"]["religion"~"^(jewish|judaism)$"](around:${around});
  relation["amenity"="place_of_worship"]["religion"~"^(jewish|judaism)$"](around:${around});
  node["building"="synagogue"](around:${around});
  way["building"="synagogue"](around:${around});
  relation["building"="synagogue"](around:${around});
  node["amenity"="synagogue"](around:${around});
  way["amenity"="synagogue"](around:${around});
  relation["amenity"="synagogue"](around:${around});
);
out center tags;`;
}

function extractCoordinates(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (
    element.center &&
    typeof element.center.lat === 'number' &&
    typeof element.center.lon === 'number'
  ) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function buildAddress(tags: Record<string, string>): string {
  const streetParts: string[] = [];

  if (tags['addr:street']) {
    streetParts.push(
      tags['addr:housenumber']
        ? `${tags['addr:street']} ${tags['addr:housenumber']}`
        : tags['addr:street'],
    );
  }

  if (tags['addr:place'] && streetParts.length === 0) {
    streetParts.push(tags['addr:place']);
  }

  const localityParts: string[] = [];
  if (tags['addr:city']) {
    localityParts.push(tags['addr:city']);
  } else if (tags['addr:town']) {
    localityParts.push(tags['addr:town']);
  } else if (tags['addr:village']) {
    localityParts.push(tags['addr:village']);
  }

  const addressParts = [...streetParts, ...localityParts].filter(Boolean);
  if (addressParts.length > 0) {
    return addressParts.join(', ');
  }

  if (tags['addr:full']) {
    return tags['addr:full'];
  }

  return 'כתובת לא זמינה';
}

function extractName(tags: Record<string, string>): string {
  const candidates = [
    tags.name,
    tags['name:he'],
    tags['name:en'],
    tags.official_name,
    tags.alt_name,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return OSM_SYNAGOGUE_NAME_FALLBACK;
}

function normalizeElement(
  element: OverpassElement,
  userCoordinates: Coordinates,
): Synagogue | null {
  const coordinates = extractCoordinates(element);
  if (!coordinates) {
    return null;
  }

  const tags = element.tags ?? {};
  const distanceMeters = calculateDistanceMeters(userCoordinates, coordinates);

  return {
    id: `${element.type}/${element.id}`,
    name: extractName(tags),
    address: buildAddress(tags),
    coordinates,
    distanceMeters,
    denomination: tags.denomination,
    osmType: element.type,
    osmId: element.id,
    tags,
  };
}

export function parseOverpassResponse(
  payload: unknown,
  userCoordinates: Coordinates,
): Synagogue[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const response = payload as OverpassResponse;
  if (!Array.isArray(response.elements)) {
    return [];
  }

  const seenIds = new Set<string>();
  const synagogues: Synagogue[] = [];

  for (const element of response.elements) {
    if (
      !element ||
      (element.type !== 'node' &&
        element.type !== 'way' &&
        element.type !== 'relation') ||
      typeof element.id !== 'number'
    ) {
      continue;
    }

    const synagogue = normalizeElement(element, userCoordinates);
    if (!synagogue || seenIds.has(synagogue.id)) {
      continue;
    }

    seenIds.add(synagogue.id);
    synagogues.push(synagogue);
  }

  return synagogues.sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );
}

function logOverpassDiagnostics(diagnostics: OverpassRequestDiagnostics): void {
  if (!__DEV__) {
    return;
  }

  console.log('[Overpass]', {
    latitude: diagnostics.latitude,
    longitude: diagnostics.longitude,
    radius: diagnostics.radiusMeters,
    endpoint: diagnostics.endpoint,
    httpStatus: diagnostics.httpStatus,
    responseSize: diagnostics.responseSize,
    rawElementCount: diagnostics.rawElementCount,
    normalizedCount: diagnostics.normalizedCount,
  });
}

async function requestOverpassEndpoint(
  endpoint: string,
  query: string,
  signal: AbortSignal,
): Promise<{ payload: unknown; httpStatus: number; responseSize: number }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': OVERPASS_USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  const responseText = await response.text();
  const responseSize = responseText.length;

  if (!response.ok) {
    const error = new Error(`Overpass API responded with status ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  try {
    return {
      payload: JSON.parse(responseText) as unknown,
      httpStatus: response.status,
      responseSize,
    };
  } catch {
    throw new Error('Overpass API returned malformed JSON');
  }
}

function recordEndpointFailure(
  endpoint: string,
  error: unknown,
  startedAt: number,
  timeoutMs: number,
  abortedByClientTimeout: boolean,
  abortControllerAborted: boolean,
): string {
  const endedAt = Date.now();
  const durationMs = endedAt - startedAt;
  const httpStatus = (error as Error & { status?: number }).status;
  const networkErrorName = error instanceof Error ? error.name : null;
  const networkErrorMessage = error instanceof Error ? error.message : String(error);
  const classification = classifyOverpassFetchFailure({
    error,
    durationMs,
    timeoutMs,
    abortedByClientTimeout,
    httpStatus,
  });
  const status = formatOverpassAttemptStatus(classification, httpStatus);
  const abortReason = abortedByClientTimeout
    ? 'CLIENT_TIMEOUT'
    : abortControllerAborted
      ? 'ABORT_SIGNAL'
      : null;

  recordOverpassEndpointAttempt({
    endpoint,
    startedAt,
    endedAt,
    durationMs,
    abortControllerCreated: true,
    abortControllerAborted,
    timeoutMs,
    abortedByClientTimeout,
    abortReason,
    httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
    networkErrorName,
    networkErrorMessage,
    classification,
    status,
  });

  if (__DEV__) {
    console.log('[OverpassAttempt]', {
      endpoint,
      durationMs,
      timeoutMs,
      classification,
      status,
      abortControllerAborted,
      abortedByClientTimeout,
      abortReason,
      httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
      networkErrorName,
      networkErrorMessage,
    });

    logDiagnosticEvent('MAP', 'overpass_endpoint_failed', 'warn', {
      endpoint,
      durationMs,
      timeoutMs,
      classification,
      status,
      abortedByClientTimeout,
      abortReason,
      httpStatus: typeof httpStatus === 'number' ? httpStatus : null,
      networkErrorName,
    });
  }

  if (classification === 'TIMEOUT') {
    return `${endpoint}: request timed out after ${durationMs}ms`;
  }

  if (error instanceof Error) {
    const status = (error as Error & { status?: number }).status;
    return status
      ? `${endpoint}: HTTP ${status} (${error.message})`
      : `${endpoint}: ${error.message}`;
  }

  return `${endpoint}: unknown error`;
}

function setFetchMeta(meta: OverpassFetchMeta): void {
  lastFetchMeta = meta;
}

async function executeOverpassRequest(
  coordinates: Coordinates,
  radiusMeters: number,
): Promise<Synagogue[]> {
  validateOverpassRequest(
    coordinates.latitude,
    coordinates.longitude,
    radiusMeters,
  );

  const requestTimeoutMs = resolveOverpassRequestTimeoutMs();
  const query = buildOverpassQuery(
    coordinates.latitude,
    coordinates.longitude,
    radiusMeters,
    resolveOverpassQueryTimeoutSeconds(),
  );

  beginOverpassDiagnosticsSession({
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    radiusMeters,
    timeoutMs: requestTimeoutMs,
  });

  const failures: string[] = [];
  let attemptIndex = 0;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const startedAt = Date.now();
    const controller = new AbortController();
    let abortedByClientTimeout = false;

    const timeoutId = setTimeout(() => {
      abortedByClientTimeout = true;
      controller.abort();
    }, requestTimeoutMs);

    try {
      const { payload, httpStatus, responseSize } = await requestOverpassEndpoint(
        endpoint,
        query,
        controller.signal,
      );

      const synagogues = parseOverpassResponse(payload, coordinates);
      const rawElementCount = Array.isArray(
        (payload as OverpassResponse).elements,
      )
        ? (payload as OverpassResponse).elements!.length
        : 0;
      const endedAt = Date.now();

      recordOverpassEndpointAttempt({
        endpoint,
        startedAt,
        endedAt,
        durationMs: endedAt - startedAt,
        abortControllerCreated: true,
        abortControllerAborted: controller.signal.aborted,
        timeoutMs: requestTimeoutMs,
        abortedByClientTimeout,
        abortReason: abortedByClientTimeout ? 'CLIENT_TIMEOUT' : null,
        httpStatus,
        networkErrorName: null,
        networkErrorMessage: null,
        classification: 'UNKNOWN',
        status: 'SUCCESS',
      });

      setFetchMeta({
        source: 'LIVE',
        cacheHit: false,
        cacheStale: false,
        elementCount: synagogues.length,
        radiusMeters,
      });

      logOverpassDiagnostics({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMeters,
        endpoint,
        httpStatus,
        responseSize,
        rawElementCount,
        normalizedCount: synagogues.length,
      });

      completeOverpassDiagnosticsSession({
        successfulEndpoint: endpoint,
        fallbackEndpoint: attemptIndex > 0 ? endpoint : null,
        fallbackUsed: attemptIndex > 0,
        finalResult: 'SUCCESS',
        elementCount: synagogues.length,
        cacheHit: false,
        cacheStale: false,
        finalSource: 'LIVE',
      });

      if (__DEV__) {
        logDiagnosticEvent('MAP', 'overpass_fetch_success', 'info', {
          endpoint,
          durationMs: endedAt - startedAt,
          fallbackUsed: attemptIndex > 0,
          normalizedCount: synagogues.length,
        });
      }

      return synagogues;
    } catch (error) {
      failures.push(
        recordEndpointFailure(
          endpoint,
          error,
          startedAt,
          requestTimeoutMs,
          abortedByClientTimeout,
          controller.signal.aborted,
        ),
      );

      const status = (error as Error & { status?: number }).status;
      if (typeof status === 'number' && !isRetryableOverpassHttpStatus(status)) {
        completeOverpassDiagnosticsSession({
          successfulEndpoint: null,
          fallbackEndpoint: null,
          fallbackUsed: false,
          finalResult: 'ALL_FAILED',
        });
        throw error;
      }
    } finally {
      clearTimeout(timeoutId);
      attemptIndex += 1;
    }
  }

  completeOverpassDiagnosticsSession({
    successfulEndpoint: null,
    fallbackEndpoint:
      OVERPASS_ENDPOINTS.length > 1 ? OVERPASS_ENDPOINTS[OVERPASS_ENDPOINTS.length - 1] : null,
    fallbackUsed: false,
    finalResult: 'ALL_FAILED',
  });

  throw new Error(
    failures.length > 0
      ? `All Overpass endpoints failed: ${failures.join('; ')}`
      : 'All Overpass endpoints failed',
  );
}

/**
 * Fetches and normalizes nearby synagogues from OpenStreetMap via Overpass.
 * Includes in-flight deduplication and a short-lived in-memory cache.
 */
export async function fetchNearbySynagoguesFromOverpass(
  coordinates: Coordinates,
  radiusMeters: number,
): Promise<Synagogue[]> {
  const effectiveRadiusMeters = resolveSynagogueSearchRadiusMeters(radiusMeters);
  const cacheKey = buildCacheKey(coordinates, effectiveRadiusMeters);
  const persistentCacheKey = buildOverpassPersistentCacheKey(
    coordinates.latitude,
    coordinates.longitude,
    effectiveRadiusMeters,
  );

  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    setFetchMeta({
      source: 'MEMORY_CACHE',
      cacheHit: true,
      cacheStale: false,
      elementCount: cached.result.length,
      radiusMeters: effectiveRadiusMeters,
    });
    recordOverpassMemoryCacheHit(cached.result.length);
    return cached.result;
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = executeOverpassRequest(coordinates, effectiveRadiusMeters)
    .then((result) => {
      resultCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + OVERPASS_CACHE_TTL_MS,
      });
      writeOverpassPersistentCache({
        cacheKey: persistentCacheKey,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMeters: effectiveRadiusMeters,
        result,
      });
      return result;
    })
    .catch((error) => {
      const persistent = readOverpassPersistentCache(persistentCacheKey);
      if (persistent) {
        const source: OverpassFinalSource = persistent.isStale
          ? 'PERSISTENT_CACHE_STALE'
          : 'PERSISTENT_CACHE';

        setFetchMeta({
          source,
          cacheHit: true,
          cacheStale: persistent.isStale,
          elementCount: persistent.result.length,
          radiusMeters: effectiveRadiusMeters,
        });

        completeOverpassDiagnosticsSession({
          successfulEndpoint: null,
          fallbackEndpoint: null,
          fallbackUsed: false,
          finalResult: 'CACHE_FALLBACK',
          elementCount: persistent.result.length,
          cacheHit: true,
          cacheStale: persistent.isStale,
          finalSource: source,
        });

        if (__DEV__) {
          logDiagnosticEvent('MAP', 'overpass_cache_fallback', 'warn', {
            source,
            cacheStale: persistent.isStale,
            elementCount: persistent.result.length,
            radiusMeters: effectiveRadiusMeters,
          });
        }

        return persistent.result;
      }

      throw error;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, request);
  return request;
}
