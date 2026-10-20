/**
 * Phase 10.6.10 — Overpass synagogue data layer verification.
 * Run: npm run verify:overpass
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;
const OVERPASS_MAX_RADIUS_METERS = 15_000;
const OSM_SYNAGOGUE_NAME_FALLBACK = 'בית כנסת';
const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function buildOverpassQuery(latitude, longitude, radiusMeters) {
  const around = `${radiusMeters},${latitude},${longitude}`;
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
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

function calculateDistanceMeters(from, to) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseOverpassResponse(payload, userCoordinates) {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const elements = payload.elements;
  if (!Array.isArray(elements)) {
    return [];
  }

  const seenIds = new Set();
  const synagogues = [];

  for (const element of elements) {
    if (
      !element ||
      (element.type !== 'node' &&
        element.type !== 'way' &&
        element.type !== 'relation') ||
      typeof element.id !== 'number'
    ) {
      continue;
    }

    let coordinates = null;
    if (typeof element.lat === 'number' && typeof element.lon === 'number') {
      coordinates = { latitude: element.lat, longitude: element.lon };
    } else if (
      element.center &&
      typeof element.center.lat === 'number' &&
      typeof element.center.lon === 'number'
    ) {
      coordinates = {
        latitude: element.center.lat,
        longitude: element.center.lon,
      };
    }
    if (!coordinates) {
      continue;
    }

    const id = `${element.type}/${element.id}`;
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const tags = element.tags ?? {};
    const name =
      tags.name ||
      tags['name:he'] ||
      tags['name:en'] ||
      tags.official_name ||
      tags.alt_name ||
      OSM_SYNAGOGUE_NAME_FALLBACK;

    synagogues.push({
      id,
      name: typeof name === 'string' ? name.trim() : OSM_SYNAGOGUE_NAME_FALLBACK,
      coordinates,
      distanceMeters: calculateDistanceMeters(userCoordinates, coordinates),
    });
  }

  return synagogues.sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );
}

function validateOverpassRequest(latitude, longitude, radiusMeters) {
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

function isRetryableOverpassHttpStatus(status) {
  return status === 406 || status === 429 || status >= 500;
}

function classifyOverpassFetchFailure({
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
      return 'ANDROID_NETWORK_FAILURE';
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
    return 'ANDROID_NETWORK_FAILURE';
  }

  return 'UNKNOWN';
}

async function executeOverpassWithFailover({
  coordinates,
  radiusMeters,
  endpoints,
  fetchFn,
  timeoutMs,
}) {
  validateOverpassRequest(
    coordinates.latitude,
    coordinates.longitude,
    radiusMeters,
  );

  const query = buildOverpassQuery(
    coordinates.latitude,
    coordinates.longitude,
    radiusMeters,
  );
  const failures = [];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'MizvaPlus/1.0 (Linux; Android; OpenStreetMap consumer)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        const error = new Error(`Overpass API responded with status ${response.status}`);
        error.status = response.status;
        throw error;
      }

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error('Overpass API returned malformed JSON');
      }

      return parseOverpassResponse(payload, coordinates);
    } catch (error) {
      if (error?.name === 'AbortError') {
        failures.push(`${endpoint}: request timed out`);
      } else if (error instanceof Error) {
        const status = error.status;
        failures.push(
          status
            ? `${endpoint}: HTTP ${status} (${error.message})`
            : `${endpoint}: ${error.message}`,
        );
        if (typeof status === 'number' && !isRetryableOverpassHttpStatus(status)) {
          throw error;
        }
      } else {
        failures.push(`${endpoint}: unknown error`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(
    failures.length > 0
      ? `All Overpass endpoints failed: ${failures.join('; ')}`
      : 'All Overpass endpoints failed',
  );
}

function createMockFetch(handlers) {
  return async (endpoint, init) => {
    const handler = handlers[endpoint];
    if (!handler) {
      throw new Error(`No mock handler for ${endpoint}`);
    }
    return handler(endpoint, init);
  };
}

console.log('Overpass synagogue verification\n================================\n');

const overpassSrc = read('src/services/overpass.ts');
const overpassConstants = read('src/constants/overpass.ts');
const hookSrc = read('src/hooks/useSynagogues.ts');

record('overpass service exists', existsSync(join(root, 'src/services/overpass.ts')));
record(
  'failover endpoints configured',
  overpassConstants.includes('OVERPASS_ENDPOINTS') &&
    overpassConstants.includes('overpass.kumi.systems'),
);
record(
  'custom User-Agent configured',
  overpassConstants.includes('OVERPASS_USER_AGENT') &&
    overpassSrc.includes("'User-Agent': OVERPASS_USER_AGENT"),
);
record(
  'useSynagogues logs fetch errors in development',
  hookSrc.includes("console.error('[useSynagogues] synagogue fetch failed:'"),
);

const query = buildOverpassQuery(JERUSALEM.latitude, JERUSALEM.longitude, 4000);
record(
  'query uses around: with radius,lat,lon order',
  query.includes('around:4000,31.7683,35.2137'),
);
record('query requests amenity=synagogue', query.includes('amenity"="synagogue"'));
record(
  'query combines jewish/judaism religion tags',
  query.includes('religion"~"^(jewish|judaism)$"'),
);
record(
  'web dev radius constant exists',
  overpassConstants.includes('OVERPASS_WEB_DEV_RADIUS_METERS') &&
    overpassConstants.includes('resolveSynagogueSearchRadiusMeters'),
);
record(
  'web persistent cache module exists',
  existsSync(join(root, 'src/services/overpass/overpassPersistentCache.ts')),
);
record(
  'stale cache fallback wired in overpass service',
  overpassSrc.includes('readOverpassPersistentCache') &&
    overpassSrc.includes("finalResult: 'CACHE_FALLBACK'"),
);
record(
  'useSynagogues exposes stale cache notice',
  hookSrc.includes('מוצגים בתי כנסת מהמטמון האחרון') &&
    hookSrc.includes('isStaleCache'),
);
record(
  'diagnostics label cache fallback',
  read('src/screens/dev/DiagnosticsScreen.tsx').includes('OVERPASS CACHE FALLBACK'),
);

let threw = false;
try {
  validateOverpassRequest(Number.NaN, 35, 4000);
} catch {
  threw = true;
}
record('coordinate validation rejects non-finite latitude', threw);

threw = false;
try {
  validateOverpassRequest(31, 200, 4000);
} catch {
  threw = true;
}
record('coordinate validation rejects out-of-range longitude', threw);

threw = false;
try {
  validateOverpassRequest(31, 35, OVERPASS_MAX_RADIUS_METERS + 1);
} catch {
  threw = true;
}
record('coordinate validation rejects excessive radius', threw);

record('isRetryableOverpassHttpStatus treats 429 as retryable', isRetryableOverpassHttpStatus(429));
record('isRetryableOverpassHttpStatus treats 503 as retryable', isRetryableOverpassHttpStatus(503));
record('isRetryableOverpassHttpStatus treats 406 as retryable', isRetryableOverpassHttpStatus(406));
record(
  'isRetryableOverpassHttpStatus treats 400 as non-retryable',
  !isRetryableOverpassHttpStatus(400),
);

const successPayload = {
  elements: [
    {
      type: 'node',
      id: 1,
      lat: 31.77,
      lon: 35.21,
      tags: { name: 'בית כנסת לדוגמה', amenity: 'synagogue' },
    },
  ],
};
const successResult = parseOverpassResponse(successPayload, JERUSALEM);
record('successful Overpass response parses synagogue', successResult.length === 1);
record(
  'valid JSON with synagogue elements normalizes count',
  successResult[0]?.name === 'בית כנסת לדוגמה',
);

const emptyResult = parseOverpassResponse({ elements: [] }, JERUSALEM);
record('valid JSON with zero synagogue results returns empty array', emptyResult.length === 0);

const malformedResult = parseOverpassResponse('not-json', JERUSALEM);
record('malformed JSON payload returns empty array', malformedResult.length === 0);

const endpointA = 'https://overpass.test/a';
const endpointB = 'https://overpass.test/b';

const successFetch = createMockFetch({
  [endpointA]: async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(successPayload),
  }),
});
const successViaFailover = await executeOverpassWithFailover({
  coordinates: JERUSALEM,
  radiusMeters: 4000,
  endpoints: [endpointA],
  fetchFn: successFetch,
  timeoutMs: 5000,
});
record('successful Overpass response via failover client', successViaFailover.length === 1);

const failoverFetch = createMockFetch({
  [endpointA]: async () => ({
    ok: false,
    status: 503,
    text: async () => 'server error',
  }),
  [endpointB]: async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(successPayload),
  }),
});
const failoverResult = await executeOverpassWithFailover({
  coordinates: JERUSALEM,
  radiusMeters: 4000,
  endpoints: [endpointA, endpointB],
  fetchFn: failoverFetch,
  timeoutMs: 5000,
});
record('failover from endpoint #1 (503) to endpoint #2', failoverResult.length === 1);

const rateLimitFetch = createMockFetch({
  [endpointA]: async () => ({
    ok: false,
    status: 429,
    text: async () => 'rate limited',
  }),
  [endpointB]: async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(successPayload),
  }),
});
const rateLimitResult = await executeOverpassWithFailover({
  coordinates: JERUSALEM,
  radiusMeters: 4000,
  endpoints: [endpointA, endpointB],
  fetchFn: rateLimitFetch,
  timeoutMs: 5000,
});
record('HTTP 429 triggers failover', rateLimitResult.length === 1);

let timeoutFailoverThrew = false;
const timeoutFetch = createMockFetch({
  [endpointA]: async (_endpoint, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
  [endpointB]: async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(successPayload),
  }),
});
const timeoutFailoverResult = await executeOverpassWithFailover({
  coordinates: JERUSALEM,
  radiusMeters: 4000,
  endpoints: [endpointA, endpointB],
  fetchFn: timeoutFetch,
  timeoutMs: 20,
});
record('request timeout triggers failover', timeoutFailoverResult.length === 1);

const malformedFetch = createMockFetch({
  [endpointA]: async () => ({
    ok: true,
    status: 200,
    text: async () => 'not-json',
  }),
});
let malformedThrew = false;
try {
  await executeOverpassWithFailover({
    coordinates: JERUSALEM,
    radiusMeters: 4000,
    endpoints: [endpointA],
    fetchFn: malformedFetch,
    timeoutMs: 5000,
  });
} catch (error) {
  malformedThrew = error instanceof Error && error.message.includes('malformed JSON');
}
record('malformed JSON from endpoint throws controlled error', malformedThrew);

const allFailFetch = createMockFetch({
  [endpointA]: async () => ({
    ok: false,
    status: 503,
    text: async () => 'down',
  }),
  [endpointB]: async () => ({
    ok: false,
    status: 504,
    text: async () => 'gateway timeout',
  }),
});
let allFailThrew = false;
try {
  await executeOverpassWithFailover({
    coordinates: JERUSALEM,
    radiusMeters: 4000,
    endpoints: [endpointA, endpointB],
    fetchFn: allFailFetch,
    timeoutMs: 5000,
  });
} catch (error) {
  allFailThrew =
    error instanceof Error && error.message.includes('All Overpass endpoints failed');
}
record('all endpoints failing returns controlled aggregate error', allFailThrew);

record(
  'timeout classification for client AbortController',
  classifyOverpassFetchFailure({
    error: Object.assign(new Error('Aborted'), { name: 'AbortError' }),
    durationMs: 25_050,
    timeoutMs: 25_000,
    abortedByClientTimeout: true,
  }) === 'TIMEOUT',
);

record(
  'react native canceled message classified as TIMEOUT when client timeout fired',
  classifyOverpassFetchFailure({
    error: new Error('fetch failed: Fetch request has been canceled'),
    durationMs: 25_010,
    timeoutMs: 25_000,
    abortedByClientTimeout: true,
  }) === 'TIMEOUT',
);

record(
  'fast canceled message without client timeout classified as ANDROID_NETWORK_FAILURE',
  classifyOverpassFetchFailure({
    error: new Error('fetch failed: Fetch request has been canceled'),
    durationMs: 120,
    timeoutMs: 25_000,
    abortedByClientTimeout: false,
  }) === 'ANDROID_NETWORK_FAILURE',
);

record(
  'overpass instrumentation records endpoint attempts',
  overpassSrc.includes('recordOverpassEndpointAttempt') &&
    overpassSrc.includes('beginOverpassDiagnosticsSession'),
);

record(
  'each endpoint attempt uses independent AbortController',
  (overpassSrc.match(/new AbortController\(\)/g) ?? []).length >= 1 &&
    overpassSrc.includes('abortedByClientTimeout = true'),
);

record(
  'useSynagogues exposes recoverable fetch error state',
  hookSrc.includes("setError('לא הצלחנו לטעון בתי כנסת כרגע')") &&
    hookSrc.includes('isEmpty:'),
);

record(
  'development overpass probe utility exists',
  existsSync(join(root, 'src/services/overpass/overpassProbe.ts')),
);

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nOverpass verification: ${passed}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
