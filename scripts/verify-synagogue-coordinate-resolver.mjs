/**
 * Phase 11.2.1 — synagogue coordinate resolver verification.
 * Run: npm run verify:phase11.2.1
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildOverpassEndpoints,
  buildSingleElementOverpassQuery,
  createSynagogueCoordinateResolver,
  executeOverpassQuery,
  extractCanonicalCoordinates,
  parseOsmKey,
  SynagogueCoordinatesUnavailableError,
  validateResolveResult,
} from './lib/synagogue-coordinate-resolver.mjs';
import { runBootstrap } from './bootstrap-synagogue-anchor.mjs';

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function createMockFetch(handlers) {
  return async (url, init) => {
    const handler = handlers[url];
    if (!handler) {
      const keys = Object.keys(handlers);
      const match = keys.find((key) => url.startsWith(key));
      if (!match) {
        throw new Error(`No mock handler for ${url}`);
      }
      return handlers[match](url, init);
    }
    return handler(url, init);
  };
}

function overpassSuccessBody(element) {
  return JSON.stringify({ elements: [element] });
}

const endpointA = 'https://overpass.test/a';
const endpointB = 'https://overpass.test/b';
const nominatimUrl = 'https://nominatim.test/lookup';
const osmApiUrl = 'https://api.openstreetmap.org/api/0.6';

console.log('Phase 11.2.1 Synagogue Coordinate Resolver\n==========================================\n');

// ─── Helper unit tests ───────────────────────────────────────────────────────

try {
  parseOsmKey('node/123');
  record('parseOsmKey accepts node/123', true);
} catch {
  record('parseOsmKey accepts node/123', false);
}

for (const invalid of ['node/0', 'node/-1', 'foo/123', 'node/abc', 'way/1/2']) {
  let threw = false;
  try {
    parseOsmKey(invalid);
  } catch {
    threw = true;
  }
  record(`parseOsmKey rejects ${invalid}`, threw);
}

record(
  'buildSingleElementOverpassQuery for node',
  buildSingleElementOverpassQuery('node', 42).includes('node(42);'),
);
record(
  'buildOverpassEndpoints deduplicates primary',
  buildOverpassEndpoints('https://overpass.kumi.systems/api/interpreter').length === 2,
);

record(
  'extractCanonicalCoordinates node',
  extractCanonicalCoordinates({ type: 'node', id: 1, lat: 31.77, lon: 35.21 }, 'node', 1)
    ?.canonicalLatitude === 31.77,
);
record(
  'extractCanonicalCoordinates way center',
  extractCanonicalCoordinates(
    { type: 'way', id: 2, center: { lat: 31.78, lon: 35.22 } },
    'way',
    2,
  )?.canonicalLatitude === 31.78,
);
record(
  'extractCanonicalCoordinates relation center',
  extractCanonicalCoordinates(
    { type: 'relation', id: 3, center: { lat: 31.79, lon: 35.23 } },
    'relation',
    3,
  )?.canonicalLatitude === 31.79,
);
record(
  'extractCanonicalCoordinates rejects wrong type',
  extractCanonicalCoordinates({ type: 'way', id: 1, center: { lat: 1, lon: 2 } }, 'node', 1) ===
    null,
);
record(
  'extractCanonicalCoordinates rejects wrong id',
  extractCanonicalCoordinates({ type: 'node', id: 2, lat: 1, lon: 2 }, 'node', 1) === null,
);
record(
  'extractCanonicalCoordinates rejects NaN',
  extractCanonicalCoordinates({ type: 'node', id: 1, lat: Number.NaN, lon: 2 }, 'node', 1) ===
    null,
);
record(
  'extractCanonicalCoordinates rejects latitude > 90',
  extractCanonicalCoordinates({ type: 'node', id: 1, lat: 91, lon: 2 }, 'node', 1) === null,
);
record(
  'extractCanonicalCoordinates rejects longitude > 180',
  extractCanonicalCoordinates({ type: 'node', id: 1, lat: 1, lon: 181 }, 'node', 1) === null,
);

// ─── Happy paths ─────────────────────────────────────────────────────────────

const nodeElement = {
  type: 'node',
  id: 100,
  lat: 31.7683,
  lon: 35.2137,
};

const nodeResolver = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () => overpassSuccessBody(nodeElement),
    }),
  }),
  overpassEndpoints: [endpointA],
});

const nodeResult = await nodeResolver.resolve('node/100');
record('happy path: node / endpoint 1 success', nodeResult.source === 'overpass');
record(
  'happy path: node returns exact key',
  nodeResult.synagogueOsmKey === 'node/100',
);

const wayResolver = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () =>
        overpassSuccessBody({
          type: 'way',
          id: 200,
          center: { lat: 31.77, lon: 35.21 },
        }),
    }),
  }),
  overpassEndpoints: [endpointA],
});
const wayResult = await wayResolver.resolve('way/200');
record('happy path: way / center', wayResult.canonicalLatitude === 31.77);

const relationResolver = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () =>
        overpassSuccessBody({
          type: 'relation',
          id: 300,
          center: { lat: 31.78, lon: 35.22 },
        }),
    }),
  }),
  overpassEndpoints: [endpointA],
});
const relationResult = await relationResolver.resolve('relation/300');
record('happy path: relation / center', relationResult.canonicalLatitude === 31.78);

// ─── Failover ────────────────────────────────────────────────────────────────

const failover504 = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 504, text: async () => 'gateway timeout' }),
    [endpointB]: async () => ({
      ok: true,
      status: 200,
      text: async () => overpassSuccessBody({ ...nodeElement, id: 501 }),
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
});
const failover504Result = await failover504.resolve('node/501');
record('failover: 504 → endpoint 2 success', failover504Result.sourceEndpoint === endpointB);

const failoverTimeout = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async (_url, init) =>
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
      text: async () => overpassSuccessBody({ ...nodeElement, id: 502 }),
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
  timeoutMs: 20,
});
const failoverTimeoutResult = await failoverTimeout.resolve('node/502');
record('failover: timeout → endpoint 2', failoverTimeoutResult.sourceEndpoint === endpointB);

const failover429 = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 429, text: async () => 'rate limited' }),
    [endpointB]: async () => ({
      ok: true,
      status: 200,
      text: async () => overpassSuccessBody({ ...nodeElement, id: 503 }),
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
});
const failover429Result = await failover429.resolve('node/503');
record('failover: 429 → endpoint 2', failover429Result.sourceEndpoint === endpointB);

const failoverNetwork = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => {
      throw new Error('fetch failed');
    },
    [endpointB]: async () => ({
      ok: true,
      status: 200,
      text: async () => overpassSuccessBody({ ...nodeElement, id: 504 }),
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
});
const failoverNetworkResult = await failoverNetwork.resolve('node/504');
record('failover: network error → endpoint 2', failoverNetworkResult.sourceEndpoint === endpointB);

// ─── Fallback sources ────────────────────────────────────────────────────────

const nominatimFallback = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 503, text: async () => 'down' }),
    [endpointB]: async () => ({ ok: false, status: 504, text: async () => 'down' }),
    [`${nominatimUrl}?osm_ids=N600&format=json`]: async () => ({
      ok: true,
      status: 200,
      json: async () => [
        { osm_type: 'node', osm_id: 600, lat: '31.77', lon: '35.21' },
      ],
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
  nominatimUrl,
});
const nominatimResult = await nominatimFallback.resolve('node/600');
record('fallback: all Overpass fail → Nominatim success', nominatimResult.source === 'nominatim');

const osmApiFallback = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 503, text: async () => 'down' }),
    [endpointB]: async () => ({ ok: false, status: 504, text: async () => 'down' }),
    [`${nominatimUrl}?osm_ids=N700&format=json`]: async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
    [`${osmApiUrl}/node/700.json`]: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        elements: [{ type: 'node', id: 700, lat: 31.7683, lon: 35.2137 }],
      }),
    }),
  }),
  overpassEndpoints: [endpointA, endpointB],
  nominatimUrl,
  osmApiBaseUrl: osmApiUrl,
});
const osmApiResult = await osmApiFallback.resolve('node/700');
record(
  'fallback: Overpass + Nominatim fail → OSM API success',
  osmApiResult.source === 'osm_api',
);

// ─── Validation failures ─────────────────────────────────────────────────────

let invalidKeyThrew = false;
try {
  await nodeResolver.resolve('invalid');
} catch (error) {
  invalidKeyThrew = error instanceof Error && !('code' in error);
}
record('validation: invalid key throws parse error', invalidKeyThrew);

const emptyOverpass = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ elements: [] }),
    }),
    'https://nominatim.openstreetmap.org/lookup?osm_ids=N800&format=json': async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
    'https://api.openstreetmap.org/api/0.6/node/800.json': async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }),
  }),
  overpassEndpoints: [endpointA],
});
let emptyThrew = false;
try {
  await emptyOverpass.resolve('node/800');
} catch (error) {
  emptyThrew = error instanceof SynagogueCoordinatesUnavailableError;
}
record('validation: empty Overpass result → unavailable error', emptyThrew);

const missingCoords = createSynagogueCoordinateResolver({
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () =>
        overpassSuccessBody({ type: 'node', id: 801, tags: { name: 'x' } }),
    }),
    'https://nominatim.openstreetmap.org/lookup?osm_ids=N801&format=json': async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
    'https://api.openstreetmap.org/api/0.6/node/801.json': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ elements: [{ type: 'node', id: 801 }] }),
    }),
  }),
  overpassEndpoints: [endpointA],
});
let missingCoordsThrew = false;
try {
  await missingCoords.resolve('node/801');
} catch (error) {
  missingCoordsThrew = error instanceof SynagogueCoordinatesUnavailableError;
}
record('validation: missing coordinates → unavailable error', missingCoordsThrew);

// ─── Bootstrap behavior ──────────────────────────────────────────────────────

const fakeServiceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.fake';

let upsertPayload = null;
const mockService = {
  rpc: async (name, payload) => {
    upsertPayload = { name, payload };
    return {
      data: {
        canonical_latitude: payload.p_canonical_latitude,
        canonical_longitude: payload.p_canonical_longitude,
      },
      error: null,
    };
  },
};

const bootstrapSuccess = await runBootstrap({
  cli: { osmKey: 'node/900' },
  env: {
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: fakeServiceRoleKey,
    overpassUrl: endpointA,
  },
  fetchFn: createMockFetch({
    [endpointA]: async () => ({
      ok: true,
      status: 200,
      text: async () =>
        overpassSuccessBody({ type: 'node', id: 900, lat: 31.77, lon: 35.21 }),
    }),
  }),
  serviceFactory: () => mockService,
});

record(
  'bootstrap: resolver success → correct upsert payload',
  upsertPayload?.name === 'upsert_synagogue_anchor' &&
    upsertPayload.payload.p_synagogue_osm_key === 'node/900' &&
    upsertPayload.payload.p_canonical_latitude === 31.77,
);
record('bootstrap: resolver success → exit 0', bootstrapSuccess.exitCode === 0);

let upsertCalledOnFailure = false;
const logs = [];
const originalError = console.error;
console.error = (...args) => logs.push(args.join(' '));

const bootstrapFailure = await runBootstrap({
  cli: { osmKey: 'node/901' },
  env: {
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: fakeServiceRoleKey,
    overpassUrl: endpointA,
  },
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 503, text: async () => 'down' }),
    'https://overpass.kumi.systems/api/interpreter': async () => ({
      ok: false,
      status: 503,
      text: async () => 'down',
    }),
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter': async () => ({
      ok: false,
      status: 503,
      text: async () => 'down',
    }),
    'https://nominatim.openstreetmap.org/lookup?osm_ids=N901&format=json': async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }),
    'https://api.openstreetmap.org/api/0.6/node/901.json': async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    }),
  }),
  serviceFactory: () => ({
    rpc: async () => {
      upsertCalledOnFailure = true;
      return { data: null, error: null };
    },
  }),
});

console.error = originalError;

record('bootstrap: resolver failure → exit 1', bootstrapFailure.exitCode === 1);
record('bootstrap: resolver failure → NO upsert call', !upsertCalledOnFailure);
record(
  'bootstrap: stdout/stderr do not contain service-role key',
  !logs.join('\n').includes(fakeServiceRoleKey),
);

// ─── Default mode endpoint rotation ──────────────────────────────────────────

const discoveryEndpointA = 'https://overpass.discovery/a';
const discoveryEndpointB = 'https://overpass.kumi.systems/api/interpreter';
const discoveryPayload = {
  elements: [
    {
      type: 'node',
      id: 999,
      lat: 31.7683,
      lon: 35.2137,
      tags: { name: 'בית כנסת לדוגמה' },
    },
  ],
};

let discoveryUpsertPayload = null;
const discoveryBootstrap = await runBootstrap({
  cli: { osmKey: null },
  env: {
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: fakeServiceRoleKey,
    overpassUrl: discoveryEndpointA,
  },
  fetchFn: createMockFetch({
    [discoveryEndpointA]: async () => ({ ok: false, status: 504, text: async () => 'timeout' }),
    [discoveryEndpointB]: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(discoveryPayload),
    }),
  }),
  serviceFactory: () => ({
    rpc: async (name, payload) => {
      discoveryUpsertPayload = { name, payload };
      return { data: payload, error: null };
    },
  }),
});

record(
  'default mode: endpoint 1 failure → endpoint 2 success',
  discoveryBootstrap.exitCode === 0 &&
    discoveryUpsertPayload?.payload.p_synagogue_osm_key === 'node/999',
);

// ─── validateResolveResult ───────────────────────────────────────────────────

let validateThrew = false;
try {
  validateResolveResult({
    synagogueOsmKey: 'node/1',
    osmType: 'node',
    osmId: 1,
    canonicalLatitude: 31,
    canonicalLongitude: 35,
    source: 'overpass',
    sourceEndpoint: endpointA,
  });
} catch {
  validateThrew = true;
}
record('validateResolveResult accepts valid result', !validateThrew);

let validateInvalidThrew = false;
try {
  validateResolveResult({
    synagogueOsmKey: 'node/1',
    osmType: 'node',
    osmId: 1,
    canonicalLatitude: 100,
    canonicalLongitude: 35,
    source: 'overpass',
    sourceEndpoint: endpointA,
  });
} catch {
  validateInvalidThrew = true;
}
record('validateResolveResult rejects invalid latitude', validateInvalidThrew);

// ─── executeOverpassQuery direct test ────────────────────────────────────────

const directFailover = await executeOverpassQuery({
  query: '[out:json];node(1);out;',
  endpoints: [endpointA, endpointB],
  fetchFn: createMockFetch({
    [endpointA]: async () => ({ ok: false, status: 503, text: async () => 'down' }),
    [endpointB]: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ elements: [] }),
    }),
  }),
});
record(
  'executeOverpassQuery failover helper works',
  directFailover.endpoint === endpointB,
);

// ─── Package script ──────────────────────────────────────────────────────────

const packageJson = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
);
record(
  'package.json registers verify:phase11.2.1',
  packageJson.scripts['verify:phase11.2.1'] ===
    'node scripts/verify-synagogue-coordinate-resolver.mjs',
);

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nPhase 11.2.1 verification: ${passed}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
