/**
 * Phase 11.2.1 — trusted synagogue coordinate resolution for anchor provisioning.
 * Overpass (multi-endpoint) → Nominatim → OSM API (nodes only).
 */

const VALID_OSM_TYPES = new Set(['node', 'way', 'relation']);

const DEFAULT_OVERPASS_FALLBACKS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const DEFAULT_PRIMARY_OVERPASS =
  process.env.EXPO_PUBLIC_OVERPASS_API_URL ?? 'https://overpass-api.de/api/interpreter';

export const OVERPASS_REQUEST_TIMEOUT_MS = 25_000;
export const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;

export const OVERPASS_USER_AGENT =
  'MizvaPlus/1.0 (Linux; Android; OpenStreetMap consumer)';

export const NOMINATIM_USER_AGENT =
  'MizvaPlus/1.0 (synagogue-anchor-provisioning; contact: dev@mizvaplus.local)';

export const OSM_API_BASE_URL = 'https://api.openstreetmap.org/api/0.6';

const NON_RETRYABLE_OVERPASS_HTTP = new Set([400, 401, 403, 405]);

export class SynagogueCoordinatesUnavailableError extends Error {
  constructor({ osmKey, attemptedSources, classifications }) {
    super(`Unable to resolve coordinates for ${osmKey}`);
    this.name = 'SynagogueCoordinatesUnavailableError';
    this.code = 'SYNAGOGUE_COORDINATES_UNAVAILABLE';
    this.osmKey = osmKey;
    this.attemptedSources = attemptedSources;
    this.classifications = classifications;
  }
}

export function buildOverpassEndpoints(primaryUrl = DEFAULT_PRIMARY_OVERPASS) {
  return [primaryUrl, ...DEFAULT_OVERPASS_FALLBACKS].filter(
    (url, index, all) => all.indexOf(url) === index,
  );
}

export function isRetryableOverpassHttpStatus(status) {
  return status === 406 || status === 429 || status >= 500;
}

export function classifyFetchFailure({
  error,
  durationMs,
  timeoutMs,
  abortedByClientTimeout,
  httpStatus,
}) {
  const errorName = error instanceof Error ? error.name : null;
  const errorMessage = error instanceof Error ? error.message : String(error);

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

  const normalized = errorMessage.toLowerCase();
  const isCancellationMessage =
    normalized.includes('canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('aborted');

  if (isCancellationMessage) {
    if (abortedByClientTimeout) {
      return 'TIMEOUT';
    }
    if (durationMs < timeoutMs * 0.5) {
      return 'NETWORK_FAILURE';
    }
    return 'UNKNOWN';
  }

  if (errorName === 'AbortError') {
    return abortedByClientTimeout ? 'TIMEOUT' : 'UNKNOWN';
  }

  if (
    normalized.includes('network request failed') ||
    normalized.includes('fetch failed')
  ) {
    return 'NETWORK_FAILURE';
  }

  return 'UNKNOWN';
}

export function parseOsmKey(osmKey) {
  if (typeof osmKey !== 'string') {
    throw new Error(`Invalid OSM key "${osmKey}". Expected format: node/123456`);
  }

  const trimmed = osmKey.trim();
  const match = /^(node|way|relation)\/(\d+)$/i.exec(trimmed);

  if (!match) {
    throw new Error(
      `Invalid OSM key "${osmKey}". Expected format: node/123456, way/789, or relation/42`,
    );
  }

  const osmType = match[1].toLowerCase();
  const osmId = Number(match[2]);

  if (!Number.isSafeInteger(osmId) || osmId <= 0) {
    throw new Error(`Invalid OSM id "${match[2]}".`);
  }

  return {
    synagogueOsmKey: `${osmType}/${osmId}`,
    osmType,
    osmId,
  };
}

export function buildSingleElementOverpassQuery(osmType, osmId) {
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
${osmType}(${osmId});
out center tags;`;
}

function isFiniteCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateCoordinatePair(latitude, longitude) {
  if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  return true;
}

export function extractCanonicalCoordinates(element, expectedType, expectedId) {
  if (!element || element.type !== expectedType || element.id !== expectedId) {
    return null;
  }

  let latitude;
  let longitude;

  if (expectedType === 'node') {
    latitude = element.lat;
    longitude = element.lon;
  } else if (expectedType === 'way' || expectedType === 'relation') {
    latitude = element.center?.lat;
    longitude = element.center?.lon;
  } else {
    return null;
  }

  if (!validateCoordinatePair(latitude, longitude)) {
    return null;
  }

  return {
    canonicalLatitude: latitude,
    canonicalLongitude: longitude,
  };
}

export function validateResolveResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Resolve result is missing');
  }

  const {
    synagogueOsmKey,
    osmType,
    osmId,
    canonicalLatitude,
    canonicalLongitude,
    source,
    sourceEndpoint,
  } = result;

  if (!synagogueOsmKey || !osmType || !Number.isSafeInteger(osmId) || osmId <= 0) {
    throw new Error('Resolve result has invalid OSM identity');
  }

  if (!VALID_OSM_TYPES.has(osmType)) {
    throw new Error(`Resolve result has invalid osmType: ${osmType}`);
  }

  if (synagogueOsmKey !== `${osmType}/${osmId}`) {
    throw new Error('Resolve result synagogueOsmKey is inconsistent');
  }

  if (!validateCoordinatePair(canonicalLatitude, canonicalLongitude)) {
    throw new Error('Resolve result has invalid coordinates');
  }

  if (!['overpass', 'nominatim', 'osm_api'].includes(source)) {
    throw new Error(`Resolve result has invalid source: ${source}`);
  }

  if (!sourceEndpoint || typeof sourceEndpoint !== 'string') {
    throw new Error('Resolve result is missing sourceEndpoint');
  }

  return result;
}

function endpointHostname(endpoint) {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return endpoint;
  }
}

function nominatimOsmPrefix(osmType) {
  if (osmType === 'node') {
    return 'N';
  }
  if (osmType === 'way') {
    return 'W';
  }
  return 'R';
}

async function fetchWithTimeout(fetchFn, url, init, timeoutMs) {
  const controller = new AbortController();
  const startedAt = Date.now();
  let abortedByClientTimeout = false;

  const timeoutId = setTimeout(() => {
    abortedByClientTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      ...init,
      signal: controller.signal,
    });
    return {
      response,
      durationMs: Date.now() - startedAt,
      abortedByClientTimeout,
    };
  } catch (error) {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      durationMs: Date.now() - startedAt,
      abortedByClientTimeout,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function executeOverpassQuery({
  query,
  endpoints,
  fetchFn = fetch,
  timeoutMs = OVERPASS_REQUEST_TIMEOUT_MS,
  userAgent = OVERPASS_USER_AGENT,
  onEvent,
}) {
  const failures = [];

  for (const endpoint of endpoints) {
    const hostname = endpointHostname(endpoint);
    let durationMs = 0;
    let abortedByClientTimeout = false;

    try {
      const result = await fetchWithTimeout(
        fetchFn,
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': userAgent,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        timeoutMs,
      );

      durationMs = result.durationMs;
      abortedByClientTimeout = result.abortedByClientTimeout;
      const { response } = result;
      const responseText = await response.text();

      if (!response.ok) {
        const error = new Error(`Overpass HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      try {
        const payload = JSON.parse(responseText);
        return { payload, endpoint, hostname };
      } catch {
        const error = new Error('Overpass API returned malformed JSON');
        error.classification = 'MALFORMED_JSON';
        throw error;
      }
    } catch (error) {
      const httpStatus = error?.status;
      const classification = classifyFetchFailure({
        error,
        durationMs: error.durationMs ?? durationMs,
        timeoutMs,
        abortedByClientTimeout: error.abortedByClientTimeout ?? abortedByClientTimeout,
        httpStatus,
      });

      failures.push({ endpoint, hostname, classification, httpStatus });
      onEvent?.('coordinate_resolve_endpoint_failed', {
        endpoint: hostname,
        source: 'overpass',
        status: typeof httpStatus === 'number' ? httpStatus : undefined,
        duration: error.durationMs ?? durationMs,
        classification,
      });

      if (typeof httpStatus === 'number' && NON_RETRYABLE_OVERPASS_HTTP.has(httpStatus)) {
        break;
      }

      if (typeof httpStatus === 'number' && !isRetryableOverpassHttpStatus(httpStatus)) {
        if (httpStatus === 404) {
          continue;
        }
        break;
      }
    }
  }

  const error = new Error(
    failures.length > 0
      ? `All Overpass endpoints failed: ${failures.map((f) => `${f.hostname}:${f.classification}`).join('; ')}`
      : 'All Overpass endpoints failed',
  );
  error.failures = failures;
  throw error;
}

function buildResolveResult(parsed, coordinates, source, sourceEndpoint) {
  return validateResolveResult({
    synagogueOsmKey: parsed.synagogueOsmKey,
    osmType: parsed.osmType,
    osmId: parsed.osmId,
    canonicalLatitude: coordinates.canonicalLatitude,
    canonicalLongitude: coordinates.canonicalLongitude,
    source,
    sourceEndpoint,
  });
}

async function resolveFromOverpass(parsed, options) {
  const query = buildSingleElementOverpassQuery(parsed.osmType, parsed.osmId);
  const endpoints = options.overpassEndpoints ?? buildOverpassEndpoints();
  const failures = [];

  for (const endpoint of endpoints) {
    const hostname = endpointHostname(endpoint);
    let durationMs = 0;
    let abortedByClientTimeout = false;

    try {
      const result = await fetchWithTimeout(
        options.fetchFn,
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'User-Agent': options.userAgent ?? OVERPASS_USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
      );

      durationMs = result.durationMs;
      abortedByClientTimeout = result.abortedByClientTimeout;
      const { response } = result;
      const responseText = await response.text();

      if (!response.ok) {
        const error = new Error(`Overpass HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        const error = new Error('Overpass API returned malformed JSON');
        error.classification = 'MALFORMED_JSON';
        throw error;
      }

      const elements = payload?.elements;
      if (!Array.isArray(elements) || elements.length === 0) {
        failures.push({
          source: 'overpass',
          endpoint: hostname,
          classification: 'EMPTY_RESULT',
        });
        options.onEvent?.('coordinate_resolve_endpoint_failed', {
          osmKey: parsed.synagogueOsmKey,
          endpoint: hostname,
          source: 'overpass',
          classification: 'EMPTY_RESULT',
          duration: durationMs,
        });
        continue;
      }

      for (const element of elements) {
        const coordinates = extractCanonicalCoordinates(
          element,
          parsed.osmType,
          parsed.osmId,
        );
        if (coordinates) {
          return {
            result: buildResolveResult(parsed, coordinates, 'overpass', endpoint),
          };
        }
      }

      failures.push({
        source: 'overpass',
        endpoint: hostname,
        classification: 'COORDINATE_EXTRACTION_FAILED',
      });
      options.onEvent?.('coordinate_resolve_endpoint_failed', {
        osmKey: parsed.synagogueOsmKey,
        endpoint: hostname,
        source: 'overpass',
        classification: 'COORDINATE_EXTRACTION_FAILED',
        duration: durationMs,
      });
    } catch (error) {
      const httpStatus = error?.status;
      const classification = classifyFetchFailure({
        error,
        durationMs: error.durationMs ?? durationMs,
        timeoutMs: options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
        abortedByClientTimeout: error.abortedByClientTimeout ?? abortedByClientTimeout,
        httpStatus,
      });

      failures.push({
        source: 'overpass',
        endpoint: hostname,
        classification,
        httpStatus,
      });
      options.onEvent?.('coordinate_resolve_endpoint_failed', {
        osmKey: parsed.synagogueOsmKey,
        endpoint: hostname,
        source: 'overpass',
        status: typeof httpStatus === 'number' ? httpStatus : undefined,
        duration: error.durationMs ?? durationMs,
        classification,
      });

      if (typeof httpStatus === 'number' && NON_RETRYABLE_OVERPASS_HTTP.has(httpStatus)) {
        break;
      }

      if (typeof httpStatus === 'number' && !isRetryableOverpassHttpStatus(httpStatus)) {
        if (httpStatus === 404) {
          continue;
        }
        break;
      }
    }
  }

  return { failures };
}

async function resolveFromNominatim(parsed, options) {
  const nominatimUrl =
    options.nominatimUrl ?? 'https://nominatim.openstreetmap.org/lookup';
  const osmIds = `${nominatimOsmPrefix(parsed.osmType)}${parsed.osmId}`;
  const url = `${nominatimUrl}?osm_ids=${encodeURIComponent(osmIds)}&format=json`;

  options.onEvent?.('coordinate_resolve_fallback', {
    osmKey: parsed.synagogueOsmKey,
    source: 'nominatim',
  });

  const startedAt = Date.now();
  let durationMs = 0;

  try {
    const result = await fetchWithTimeout(
      options.fetchFn,
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': options.nominatimUserAgent ?? NOMINATIM_USER_AGENT,
          Accept: 'application/json',
        },
      },
      options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
    );

    durationMs = result.durationMs;
    const { response } = result;

    if (!response.ok) {
      return {
        failure: {
          source: 'nominatim',
          endpoint: endpointHostname(nominatimUrl),
          classification: 'HTTP_ERROR',
          httpStatus: response.status,
        },
      };
    }

    const payload = await response.json();
    const place = Array.isArray(payload) ? payload[0] : null;
    if (!place) {
      return {
        failure: {
          source: 'nominatim',
          endpoint: endpointHostname(nominatimUrl),
          classification: 'EMPTY_RESULT',
        },
      };
    }

    const expectedNominatimType =
      parsed.osmType === 'relation' ? 'relation' : parsed.osmType;
    const osmId = Number(place.osm_id);
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);

    if (place.osm_type !== expectedNominatimType || osmId !== parsed.osmId) {
      return {
        failure: {
          source: 'nominatim',
          endpoint: endpointHostname(nominatimUrl),
          classification: 'TYPE_OR_ID_MISMATCH',
        },
      };
    }

    if (!validateCoordinatePair(latitude, longitude)) {
      return {
        failure: {
          source: 'nominatim',
          endpoint: endpointHostname(nominatimUrl),
          classification: 'INVALID_COORDINATES',
        },
      };
    }

    return {
      result: buildResolveResult(
        parsed,
        { canonicalLatitude: latitude, canonicalLongitude: longitude },
        'nominatim',
        nominatimUrl,
      ),
      durationMs,
    };
  } catch (error) {
    return {
      failure: {
        source: 'nominatim',
        endpoint: endpointHostname(nominatimUrl),
        classification: classifyFetchFailure({
          error,
          durationMs: error.durationMs ?? Date.now() - startedAt,
          timeoutMs: options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
          abortedByClientTimeout: error.abortedByClientTimeout ?? false,
        }),
      },
    };
  }
}

async function resolveFromOsmApi(parsed, options) {
  if (parsed.osmType !== 'node') {
    return {
      failure: {
        source: 'osm_api',
        endpoint: endpointHostname(OSM_API_BASE_URL),
        classification: 'UNSUPPORTED_OSM_TYPE',
      },
    };
  }

  const url = `${options.osmApiBaseUrl ?? OSM_API_BASE_URL}/node/${parsed.osmId}.json`;

  options.onEvent?.('coordinate_resolve_fallback', {
    osmKey: parsed.synagogueOsmKey,
    source: 'osm_api',
  });

  const startedAt = Date.now();

  try {
    const result = await fetchWithTimeout(
      options.fetchFn,
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': options.userAgent ?? OVERPASS_USER_AGENT,
          Accept: 'application/json',
        },
      },
      options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
    );

    const { response } = result;

    if (!response.ok) {
      return {
        failure: {
          source: 'osm_api',
          endpoint: endpointHostname(url),
          classification: 'HTTP_ERROR',
          httpStatus: response.status,
        },
      };
    }

    const payload = await response.json();
    const element = payload?.elements?.[0];
    const coordinates = extractCanonicalCoordinates(element, 'node', parsed.osmId);

    if (!coordinates) {
      return {
        failure: {
          source: 'osm_api',
          endpoint: endpointHostname(url),
          classification: 'COORDINATE_EXTRACTION_FAILED',
        },
      };
    }

    return {
      result: buildResolveResult(parsed, coordinates, 'osm_api', url),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      failure: {
        source: 'osm_api',
        endpoint: endpointHostname(url),
        classification: classifyFetchFailure({
          error,
          durationMs: error.durationMs ?? Date.now() - startedAt,
          timeoutMs: options.timeoutMs ?? OVERPASS_REQUEST_TIMEOUT_MS,
          abortedByClientTimeout: error.abortedByClientTimeout ?? false,
        }),
      },
    };
  }
}

export function createSynagogueCoordinateResolver(options = {}) {
  const fetchFn = options.fetchFn ?? fetch;

  async function resolve(osmKey) {
    const parsed = parseOsmKey(osmKey);
    const resolverOptions = {
      ...options,
      fetchFn,
    };

    options.onEvent?.('coordinate_resolve_started', {
      osmKey: parsed.synagogueOsmKey,
    });

    const attemptedSources = [];
    const classifications = [];

    const overpassOutcome = await resolveFromOverpass(parsed, resolverOptions);
    if (overpassOutcome.result) {
      options.onEvent?.('coordinate_resolve_succeeded', {
        osmKey: parsed.synagogueOsmKey,
        source: overpassOutcome.result.source,
        endpoint: endpointHostname(overpassOutcome.result.sourceEndpoint),
      });
      return overpassOutcome.result;
    }

    for (const failure of overpassOutcome.failures ?? []) {
      attemptedSources.push(failure.source);
      classifications.push({
        source: failure.source,
        endpoint: failure.endpoint,
        classification: failure.classification,
        httpStatus: failure.httpStatus,
      });
    }

    const nominatimOutcome = await resolveFromNominatim(parsed, resolverOptions);
    if (nominatimOutcome.result) {
      attemptedSources.push('nominatim');
      options.onEvent?.('coordinate_resolve_succeeded', {
        osmKey: parsed.synagogueOsmKey,
        source: 'nominatim',
        endpoint: endpointHostname(nominatimOutcome.result.sourceEndpoint),
      });
      return nominatimOutcome.result;
    }

    if (nominatimOutcome.failure) {
      attemptedSources.push('nominatim');
      classifications.push(nominatimOutcome.failure);
    }

    const osmApiOutcome = await resolveFromOsmApi(parsed, resolverOptions);
    if (osmApiOutcome.result) {
      attemptedSources.push('osm_api');
      options.onEvent?.('coordinate_resolve_succeeded', {
        osmKey: parsed.synagogueOsmKey,
        source: 'osm_api',
        endpoint: endpointHostname(osmApiOutcome.result.sourceEndpoint),
      });
      return osmApiOutcome.result;
    }

    if (osmApiOutcome.failure) {
      attemptedSources.push('osm_api');
      classifications.push(osmApiOutcome.failure);
    }

    options.onEvent?.('coordinate_resolve_failed', {
      osmKey: parsed.synagogueOsmKey,
      attemptedSources,
      classifications,
    });

    throw new SynagogueCoordinatesUnavailableError({
      osmKey: parsed.synagogueOsmKey,
      attemptedSources,
      classifications,
    });
  }

  return { resolve };
}
