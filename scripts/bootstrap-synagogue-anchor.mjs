/**
 * Phase 11.2.1 — controlled synagogue anchor bootstrap (admin/dev only).
 *
 * Run:
 *   npm run bootstrap:minyan-anchor
 *   npm run bootstrap:minyan-anchor -- --osm-key node/123456
 *
 * Seeds a canonical synagogue anchor for physical Minyan Live E2E:
 *   OSM synagogue → synagogue_anchors row → create_minyan_report → yellow map marker
 *
 * Requires (never commit service role key):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EXPO_PUBLIC_OVERPASS_API_URL (optional)
 *
 * Default mode picks the first Overpass synagogue near Jerusalem center.
 * With --osm-key, resolves the exact synagogue via the coordinate resolver and
 * upserts via service-role `upsert_synagogue_anchor`. Normal authenticated users
 * cannot write anchors.
 *
 * Production maintenance:
 *   See docs/minyan-anchor-provisioning.md
 */
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  buildOverpassEndpoints,
  createSynagogueCoordinateResolver,
  executeOverpassQuery,
  OVERPASS_QUERY_TIMEOUT_SECONDS,
  OVERPASS_USER_AGENT,
} from './lib/synagogue-coordinate-resolver.mjs';
import {
  createServiceClient,
  extractMinyanErrorCode,
  isValidSupabaseUrl,
  looksLikeServiceRoleKey,
  resolveEnv,
} from './lib/supabase-live-env.mjs';

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const SEARCH_RADIUS_METERS = 2_000;
const TEST_KEY_PREFIX = 'phase11.1.test.';
const VALID_OSM_TYPES = new Set(['node', 'way', 'relation']);

function parseCliArgs(argv) {
  const args = { osmKey: null };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--osm-key' && argv[index + 1]) {
      args.osmKey = argv[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith('--osm-key=')) {
      args.osmKey = token.slice('--osm-key='.length);
    }
  }

  return args;
}

function buildDiscoveryOverpassQuery(latitude, longitude, radiusMeters) {
  const around = `${radiusMeters},${latitude},${longitude}`;
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
(
  node["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  way["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  relation["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  node["building"="synagogue"](around:${around});
  way["building"="synagogue"](around:${around});
  relation["building"="synagogue"](around:${around});
);
out center tags;`;
}

function parseSynagogueElement(element) {
  if (!element || !VALID_OSM_TYPES.has(element.type)) {
    return null;
  }

  let latitude;
  let longitude;
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    latitude = element.lat;
    longitude = element.lon;
  } else if (element.center) {
    latitude = element.center.lat;
    longitude = element.center.lon;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    synagogueOsmKey: `${element.type}/${element.id}`,
    osmType: element.type,
    osmId: element.id,
    canonicalLatitude: latitude,
    canonicalLongitude: longitude,
    name:
      element.tags?.name ||
      element.tags?.['name:he'] ||
      element.tags?.['name:en'] ||
      'בית כנסת',
  };
}

function parseFirstSynagogue(payload) {
  const elements = payload?.elements;
  if (!Array.isArray(elements)) {
    return null;
  }

  for (const element of elements) {
    const synagogue = parseSynagogueElement(element);
    if (synagogue) {
      return synagogue;
    }
  }

  return null;
}

async function fetchNearestSynagogue(overpassEndpoints, fetchFn, onEvent) {
  const query = buildDiscoveryOverpassQuery(
    JERUSALEM.latitude,
    JERUSALEM.longitude,
    SEARCH_RADIUS_METERS,
  );

  const { payload, endpoint } = await executeOverpassQuery({
    query,
    endpoints: overpassEndpoints,
    fetchFn,
    userAgent: OVERPASS_USER_AGENT,
    onEvent: (event, payload) => {
      if (event === 'coordinate_resolve_endpoint_failed') {
        onEvent?.(event, payload);
      }
    },
  });

  const synagogue = parseFirstSynagogue(payload);
  if (!synagogue) {
    throw new Error('No synagogue found near Jerusalem in Overpass response');
  }

  return {
    synagogue,
    source: `Overpass discovery near Jerusalem (${endpoint})`,
  };
}

export async function runBootstrap({
  cli = parseCliArgs(process.argv),
  env = resolveEnv(),
  fetchFn = fetch,
  onEvent,
  serviceFactory = createServiceClient,
} = {}) {
  if (!isValidSupabaseUrl(env.supabaseUrl)) {
    console.error('BLOCKED - invalid EXPO_PUBLIC_SUPABASE_URL');
    return { exitCode: 1 };
  }

  if (!looksLikeServiceRoleKey(env.serviceRoleKey)) {
    console.error(
      'BLOCKED - SUPABASE_SERVICE_ROLE_KEY required for anchor bootstrap (never commit).',
    );
    return { exitCode: 1 };
  }

  const overpassEndpoints = buildOverpassEndpoints(env.overpassUrl);
  const resolver = createSynagogueCoordinateResolver({
    fetchFn,
    overpassEndpoints,
    onEvent,
  });

  let synagogue;
  let source;

  try {
    if (cli.osmKey) {
      const resolved = await resolver.resolve(cli.osmKey);
      synagogue = {
        synagogueOsmKey: resolved.synagogueOsmKey,
        osmType: resolved.osmType,
        osmId: resolved.osmId,
        canonicalLatitude: resolved.canonicalLatitude,
        canonicalLongitude: resolved.canonicalLongitude,
        name: cli.osmKey,
      };
      source = `${resolved.source} (${resolved.sourceEndpoint})`;
    } else {
      const discovery = await fetchNearestSynagogue(overpassEndpoints, fetchFn, onEvent);
      synagogue = discovery.synagogue;
      source = discovery.source;
    }
  } catch (error) {
    console.error(`FAIL - ${error instanceof Error ? error.message : String(error)}`);
    return { exitCode: 1, upsertCalled: false };
  }

  const service = serviceFactory(env);

  const { data, error } = await service.rpc('upsert_synagogue_anchor', {
    p_synagogue_osm_key: synagogue.synagogueOsmKey,
    p_osm_type: synagogue.osmType,
    p_osm_id: synagogue.osmId,
    p_canonical_latitude: synagogue.canonicalLatitude,
    p_canonical_longitude: synagogue.canonicalLongitude,
  });

  if (error) {
    console.error('FAIL - anchor bootstrap');
    console.error(`INFO - synagogue_osm_key=${synagogue.synagogueOsmKey}`);
    console.error(`INFO - name=${synagogue.name}`);
    console.error(
      `INFO - canonical=(${synagogue.canonicalLatitude}, ${synagogue.canonicalLongitude})`,
    );
    console.error(
      `FAIL - upsert_synagogue_anchor: ${extractMinyanErrorCode(error)} (${error.message})`,
    );
    return { exitCode: 1, synagogue, upsertCalled: true };
  }

  const marker = `${TEST_KEY_PREFIX}${randomUUID().slice(0, 8)}`;
  console.log('PASS - synagogue anchor bootstrapped');
  console.log(`INFO - marker=${marker}`);
  console.log(`INFO - synagogue_osm_key=${synagogue.synagogueOsmKey}`);
  console.log(`INFO - name=${synagogue.name}`);
  console.log(
    `INFO - canonical=(${data?.canonical_latitude ?? synagogue.canonicalLatitude}, ${
      data?.canonical_longitude ?? synagogue.canonicalLongitude
    })`,
  );
  console.log(`INFO - source=${source}`);

  return { exitCode: 0, synagogue, upsertCalled: true, marker };
}

async function main() {
  const result = await runBootstrap({
    onEvent: (event, payload) => {
      console.log(`EVENT - ${event} ${JSON.stringify(payload)}`);
    },
  });
  process.exit(result.exitCode ?? 1);
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  main().catch((error) => {
    console.error(`FAIL - ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
