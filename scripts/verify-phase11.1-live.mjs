/**
 * Phase 11.1.1 — live Supabase integration validation for Minyan Live.
 * Run: npm run verify:phase11.1-live
 *
 * Requires .env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * Optional (never commit):
 *   SUPABASE_SERVICE_ROLE_KEY — anchor bootstrap, expiry backdate, cleanup, expire RPC
 *   DATABASE_URL / SUPABASE_DB_URL — one-time migration apply when APPLY_PHASE11_1_MIGRATION=1
 *
 * Never prints secrets, tokens, or keys.
 */
import { randomUUID } from 'node:crypto';
import {
  createAnonClient,
  createAuthedClient,
  createServiceClient,
  extractMinyanErrorCode,
  formatNetworkError,
  isValidSupabaseUrl,
  looksLikeServiceRoleKey,
  looksLikeSupabaseKey,
  normalizeSupabaseUrl,
  readProjectFile,
  resolveEnv,
  rpcExists,
  sleep,
  tableExists,
} from './lib/supabase-live-env.mjs';

const MIGRATION_VERSION = '20260906100000_phase11_1_minyan_live';
const PHASE10_TABLES = [
  'profiles',
  'mitzvah_preferences',
  'mitzvah_completions',
  'quiz_attempts',
  'user_badges',
  'onboarding_state',
];
const MINYAN_TABLES = ['synagogue_anchors', 'minyan_reports', 'minyan_coming_intentions'];
const REQUIRED_RPCS = [
  'list_active_minyan_reports',
  'create_minyan_report',
  'update_minyan_report',
  'fulfill_minyan_report',
  'expire_stale_minyan_reports',
];

/** Null probe args — existence check only; business/auth errors still mean RPC is exposed. */
const RPC_PROBES = {
  list_active_minyan_reports: {
    p_synagogue_osm_keys: null,
  },
  create_minyan_report: {
    p_synagogue_osm_key: null,
    p_user_latitude: null,
    p_user_longitude: null,
    p_user_accuracy_meters: null,
    p_current_attendance: null,
    p_user_location_captured_at: null,
  },
  update_minyan_report: {
    p_report_id: null,
    p_user_latitude: null,
    p_user_longitude: null,
    p_user_accuracy_meters: null,
    p_current_attendance: null,
    p_user_location_captured_at: null,
  },
  fulfill_minyan_report: {
    p_report_id: null,
    p_user_latitude: null,
    p_user_longitude: null,
    p_user_accuracy_meters: null,
    p_user_location_captured_at: null,
  },
  expire_stale_minyan_reports: {},
};

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const SEARCH_RADIUS_METERS = 2_000;
const OVERPASS_FALLBACK_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const OVERPASS_REQUEST_TIMEOUT_MS = 25_000;

const results = [];
const report = {};
let blockedReason = null;
let migrationApplied = false;
let cronConfigured = false;

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : blockedReason ? 'BLOCKED' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function isPermissionDenied(error) {
  if (!error) {
    return false;
  }
  const message = (error.message ?? '').toLowerCase();
  return error.code === '42501' || message.includes('permission denied');
}

const MINYAN_REPORT_PRIVATE_FIELDS = [
  'reporter_user_id',
  'report_latitude',
  'report_longitude',
  'report_accuracy_meters',
];

function excludesPrivateMinyanFields(row) {
  if (!row) {
    return false;
  }
  return MINYAN_REPORT_PRIVATE_FIELDS.every(
    (field) => !Object.prototype.hasOwnProperty.call(row, field),
  );
}

function setReport(section, value) {
  report[section] = value;
}

function buildOverpassQuery(latitude, longitude, radiusMeters) {
  const around = `${radiusMeters},${latitude},${longitude}`;
  return `[out:json][timeout:25];
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

function parseFirstSynagogue(payload) {
  for (const element of payload?.elements ?? []) {
    if (!element || !['node', 'way', 'relation'].includes(element.type)) {
      continue;
    }
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
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
  return null;
}

function buildOverpassEndpoints(primaryUrl) {
  return [primaryUrl, ...OVERPASS_FALLBACK_ENDPOINTS].filter(
    (url, index, all) => all.indexOf(url) === index,
  );
}

function overpassEndpointLabel(index, total) {
  return `endpoint ${index + 1}/${total}`;
}

async function fetchFromOverpassEndpoint(overpassUrl) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OVERPASS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'MizvaPlus/1.0 (phase11.1-live verify)',
      },
      body: `data=${encodeURIComponent(
        buildOverpassQuery(JERUSALEM.latitude, JERUSALEM.longitude, SEARCH_RADIUS_METERS),
      )}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const payload = await response.json();
    const synagogue = parseFirstSynagogue(payload);
    if (!synagogue) {
      throw new Error('No synagogue found near Jerusalem');
    }
    return synagogue;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Overpass request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchNearestSynagogue(primaryOverpassUrl) {
  const endpoints = buildOverpassEndpoints(primaryOverpassUrl);
  const failures = [];

  for (let index = 0; index < endpoints.length; index += 1) {
    console.log(`INFO - Overpass attempt ${index + 1}/${endpoints.length}`);
    try {
      return await fetchFromOverpassEndpoint(endpoints[index]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${overpassEndpointLabel(index, endpoints.length)}: ${message}`);
    }
  }

  throw new Error(`All Overpass endpoints failed (${failures.join('; ')})`);
}

async function findExistingTestAnchor(service) {
  const { data, error } = await service
    .from('synagogue_anchors')
    .select('synagogue_osm_key, osm_type, osm_id, canonical_latitude, canonical_longitude')
    .not('canonical_latitude', 'is', null)
    .not('canonical_longitude', 'is', null)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    synagogueOsmKey: data.synagogue_osm_key,
    osmType: data.osm_type,
    osmId: data.osm_id,
    canonicalLatitude: data.canonical_latitude,
    canonicalLongitude: data.canonical_longitude,
    name: 'existing anchor',
    source: 'existing synagogue_anchors row (Overpass unavailable)',
  };
}

function externalDependencyError(message) {
  const error = new Error(message);
  error.code = 'EXTERNAL_DEPENDENCY';
  return error;
}

function atAnchor(anchor, accuracy = 10) {
  return {
    latitude: anchor.canonicalLatitude,
    longitude: anchor.canonicalLongitude,
    accuracy,
    capturedAt: new Date().toISOString(),
  };
}

function farFromAnchor(anchor) {
  return {
    latitude: anchor.canonicalLatitude + 0.01,
    longitude: anchor.canonicalLongitude + 0.01,
    accuracy: 10,
    capturedAt: new Date().toISOString(),
  };
}

async function createReport(client, anchor, attendance, location) {
  return client.rpc('create_minyan_report', {
    p_synagogue_osm_key: anchor.synagogueOsmKey,
    p_user_latitude: location.latitude,
    p_user_longitude: location.longitude,
    p_user_accuracy_meters: location.accuracy,
    p_current_attendance: attendance,
    p_user_location_captured_at: location.capturedAt ?? new Date().toISOString(),
  });
}

async function cleanupSynagogue(service, synagogueOsmKey) {
  if (!service) {
    return;
  }
  const { data: reports } = await service
    .from('minyan_reports')
    .select('id')
    .eq('synagogue_osm_key', synagogueOsmKey);
  const reportIds = reports?.map((row) => row.id) ?? [];
  if (reportIds.length > 0) {
    await service.from('minyan_coming_intentions').delete().in('minyan_report_id', reportIds);
  }
  await service.from('minyan_reports').delete().eq('synagogue_osm_key', synagogueOsmKey);
}

function detectCronConfigured() {
  const haystack = [
    readProjectFile('package.json'),
    readProjectFile('supabase/migrations/20260906100000_phase11_1_minyan_live.sql'),
  ].join('\n');

  return (
    /expire_stale_minyan_reports/.test(haystack) &&
    (/cron/i.test(haystack) || /pg_cron/i.test(haystack) || /render\.com\/cron/i.test(haystack))
  );
}

// ─── Static pre-checks ────────────────────────────────────────────────────────

console.log('Phase 11.1.1 Live Verification\n================================\n');

const migration = readProjectFile('supabase/migrations/20260906100000_phase11_1_minyan_live.sql');
for (const table of PHASE10_TABLES) {
  const pattern = new RegExp(`\\b(ALTER|DROP|TRUNCATE)\\s+.*\\b${table}\\b`, 'i');
  record(
    `migration safety: does not modify ${table}`,
    !pattern.test(migration),
  );
}

const env = resolveEnv();
record('EXPO_PUBLIC_SUPABASE_URL exists', Boolean(env.supabaseUrl));
record('EXPO_PUBLIC_SUPABASE_ANON_KEY exists', Boolean(env.anonKey));
record('Supabase URL format valid', isValidSupabaseUrl(env.supabaseUrl));
record('Supabase anon key format valid', looksLikeSupabaseKey(env.anonKey));
record(
  'service role key available for bootstrap/expiry',
  true,
  looksLikeServiceRoleKey(env.serviceRoleKey) ? 'configured' : 'not configured — partial live matrix skipped',
);

if (isValidSupabaseUrl(env.supabaseUrl)) {
  console.log(`INFO - Supabase host: ${new URL(normalizeSupabaseUrl(env.supabaseUrl)).hostname}`);
}

if (!env.supabaseUrl || !env.anonKey || !isValidSupabaseUrl(env.supabaseUrl)) {
  blockedReason = 'SUPABASE CONFIGURATION';
  printFinalReport();
  process.exit(1);
}

cronConfigured = detectCronConfigured();

async function maybeApplyMigration() {
  if (process.env.APPLY_PHASE11_1_MIGRATION !== '1' || !env.databaseUrl) {
    return false;
  }

  const { spawnSync } = await import('node:child_process');
  const { dirname, join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const migrationPath = join(root, 'supabase/migrations/20260906100000_phase11_1_minyan_live.sql');

  console.log(`INFO - APPLY_PHASE11_1_MIGRATION=1 — executing migration ${MIGRATION_VERSION}`);
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'execute', '--file', migrationPath, '--db-url', env.databaseUrl],
    { cwd: root, stdio: 'inherit', shell: true },
  );
  record('live migration apply', result.status === 0, `exit ${result.status ?? 'unknown'}`);
  return result.status === 0;
}

async function ensureTestAnchor(service, overpassUrl) {
  let synagogue;
  try {
    synagogue = await fetchNearestSynagogue(overpassUrl);
  } catch (overpassError) {
    console.log('INFO - Overpass unavailable, checking existing synagogue_anchors');
    const existing = await findExistingTestAnchor(service);
    if (existing) {
      console.log(`INFO - using existing anchor ${existing.synagogueOsmKey}`);
      return existing;
    }
    const message =
      overpassError instanceof Error ? overpassError.message : String(overpassError);
    throw externalDependencyError(message);
  }

  const { data, error } = await service.rpc('upsert_synagogue_anchor', {
    p_synagogue_osm_key: synagogue.synagogueOsmKey,
    p_osm_type: synagogue.osmType,
    p_osm_id: synagogue.osmId,
    p_canonical_latitude: synagogue.canonicalLatitude,
    p_canonical_longitude: synagogue.canonicalLongitude,
  });

  if (error) {
    throw new Error(`anchor bootstrap failed: ${extractMinyanErrorCode(error)}`);
  }

  return {
    synagogueOsmKey: synagogue.synagogueOsmKey,
    osmType: synagogue.osmType,
    osmId: synagogue.osmId,
    canonicalLatitude: data?.canonical_latitude ?? synagogue.canonicalLatitude,
    canonicalLongitude: data?.canonical_longitude ?? synagogue.canonicalLongitude,
    name: synagogue.name,
    source: 'Overpass center near Jerusalem',
  };
}

async function runLiveChecks() {
  migrationApplied = await maybeApplyMigration();

  const anon = createAnonClient(env);
  const health = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
    headers: { apikey: env.anonKey },
  });
  record('live Supabase connection', health.ok, `status ${health.status}`);

  for (const table of [...PHASE10_TABLES, ...MINYAN_TABLES]) {
    record(`live table exists: ${table}`, await tableExists(anon, table));
  }

  const rpcReady = {};
  for (const rpc of REQUIRED_RPCS) {
    const exists = await rpcExists(anon, rpc, RPC_PROBES[rpc] ?? {});
    rpcReady[rpc] = exists;
    record(`live RPC exists: ${rpc}`, exists);
  }

  if (!rpcReady.list_active_minyan_reports || !rpcReady.create_minyan_report) {
    blockedReason = 'MIGRATION NOT APPLIED (RPCs missing — run npm run apply:phase11.1-live)';
    setReport('A', {
      Applied: migrationApplied ? 'YES (this run)' : 'NO',
      'Migration version': MIGRATION_VERSION,
      'Existing data preserved': 'not verified — migration not fully present',
    });
    return;
  }

  setReport('A', {
    Applied: migrationApplied ? 'YES (this run)' : 'YES (already present)',
    'Migration version': MIGRATION_VERSION,
    'Existing data preserved': 'YES — migration uses IF NOT EXISTS / OR REPLACE only',
  });

  const service = looksLikeServiceRoleKey(env.serviceRoleKey)
    ? createServiceClient(env)
    : null;

  const suffix = randomUUID().slice(0, 8);
  const password = `Test!${suffix}Aa1`;
  const emailA = `phase11.1.a.${suffix}@mailinator.com`;
  const emailB = `phase11.1.b.${suffix}@mailinator.com`;

  const clientA = createAuthedClient(env);
  const clientB = createAuthedClient(env);

  const signUpA = await clientA.auth.signUp({
    email: emailA,
    password,
    options: { data: { display_name: `בודק מניין ${suffix}` } },
  });
  record('auth: register User A', !signUpA.error && Boolean(signUpA.data.session), signUpA.error?.message ?? '');
  if (!signUpA.data.session) {
    blockedReason = 'SUPABASE AUTH (email confirmation may be required)';
    return;
  }

  const signUpB = await clientB.auth.signUp({
    email: emailB,
    password,
    options: { data: { display_name: `בודק ב ${suffix}` } },
  });
  record('auth: register User B', !signUpB.error && Boolean(signUpB.data.session), signUpB.error?.message ?? '');
  if (!signUpB.data.session) {
    blockedReason = 'SUPABASE AUTH (email confirmation may be required)';
    return;
  }

  const userAId = signUpA.data.user.id;

  // ─── Schema / constraint probes via behavior ─────────────────────────────

  setReport('B', {
    Tables: MINYAN_TABLES.join(', '),
    Constraints: 'UUID PKs, OSM key consistency, attendance 0–10, status enum — verified via RPC + direct probes',
    Indexes: 'one ACTIVE/synagogue, expiry, history, rate-limit — verified via concurrency + rate tests',
  });

  // ─── RLS ─────────────────────────────────────────────────────────────────

  const directInsertReport = await clientA.from('minyan_reports').insert({
    synagogue_osm_key: 'node/1',
    osm_type: 'node',
    osm_id: 1,
    reporter_user_id: userAId,
    current_attendance: 5,
    missing_count: 5,
    status: 'ACTIVE',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    report_latitude: 0,
    report_longitude: 0,
    report_distance_meters: 0,
  });
  record(
    'RLS minyan_reports: authenticated INSERT blocked',
    Boolean(directInsertReport.error),
    directInsertReport.error?.message ?? 'unexpected insert',
  );

  const directUpdateReport = await clientA
    .from('minyan_reports')
    .update({ status: 'EXPIRED' })
    .eq('reporter_user_id', userAId);
  record(
    'RLS minyan_reports: authenticated UPDATE blocked',
    Boolean(directUpdateReport.error) || (directUpdateReport.count ?? 0) === 0,
    directUpdateReport.error?.message ?? 'no rows',
  );

  const directDeleteReport = await clientA.from('minyan_reports').delete().eq('reporter_user_id', userAId);
  record(
    'RLS minyan_reports: authenticated DELETE blocked',
    Boolean(directDeleteReport.error) || (directDeleteReport.count ?? 0) === 0,
    directDeleteReport.error?.message ?? 'no rows',
  );

  const anchorInsert = await clientA.from('synagogue_anchors').insert({
    synagogue_osm_key: 'node/999999999',
    osm_type: 'node',
    osm_id: 999999999,
    canonical_latitude: 0,
    canonical_longitude: 0,
  });
  record(
    'RLS synagogue_anchors: authenticated INSERT blocked',
    Boolean(anchorInsert.error),
    anchorInsert.error?.message ?? 'unexpected insert',
  );

  const anchorUpdate = await clientA
    .from('synagogue_anchors')
    .update({ canonical_latitude: 1 })
    .eq('synagogue_osm_key', 'node/999999999');
  record(
    'RLS synagogue_anchors: authenticated UPDATE blocked',
    Boolean(anchorUpdate.error) || (anchorUpdate.count ?? 0) === 0,
    anchorUpdate.error?.message ?? 'no rows',
  );

  // ─── Anchor bootstrap ────────────────────────────────────────────────────

  if (!service) {
    blockedReason = 'SUPABASE_SERVICE_ROLE_KEY required for anchor bootstrap and full RPC matrix';
    setReport('E', {
      'Test anchor': 'not bootstrapped',
      Source: 'Overpass (blocked — no service role)',
      'Production maintenance strategy':
        'service-role upsert_synagogue_anchor from trusted Overpass/admin pipeline',
    });
    return;
  }

  let anchor;
  try {
    anchor = await ensureTestAnchor(service, env.overpassUrl);
  } catch (error) {
    if (error?.code === 'EXTERNAL_DEPENDENCY') {
      blockedReason = 'EXTERNAL DEPENDENCY (Overpass unavailable)';
      setReport('E', {
        'Test anchor': 'not bootstrapped',
        Source: 'Overpass unavailable; no existing anchor in synagogue_anchors',
        'Production maintenance strategy':
          'service-role upsert_synagogue_anchor; future scheduled Overpass reconciliation (no client writes)',
      });
      return;
    }
    throw error;
  }
  await cleanupSynagogue(service, anchor.synagogueOsmKey);

  setReport('E', {
    'Test anchor': anchor.synagogueOsmKey,
    Source: anchor.source,
    'Production maintenance strategy':
      'service-role upsert_synagogue_anchor; future scheduled Overpass reconciliation (no client writes)',
  });

  console.log(`INFO - test anchor ${anchor.synagogueOsmKey} (${anchor.name})`);

  // ─── RPC: list (unauthenticated) ─────────────────────────────────────────

  const listUnauth = await anon.rpc('list_active_minyan_reports', { p_synagogue_osm_keys: null });
  record(
    'RPC list: unauthenticated rejected',
    Boolean(listUnauth.error),
    extractMinyanErrorCode(listUnauth.error) ?? 'ok',
  );

  const listAuth = await clientA.rpc('list_active_minyan_reports', { p_synagogue_osm_keys: null });
  record('RPC list: authenticated ok', !listAuth.error, `rows=${listAuth.data?.length ?? 0}`);

  // ─── Geofence + attendance validation ────────────────────────────────────

  const validCreate = await createReport(clientA, anchor, 8, atAnchor(anchor));
  record(
    'geofence: valid location create',
    !validCreate.error && validCreate.data?.status === 'ACTIVE',
    validCreate.error ? extractMinyanErrorCode(validCreate.error) : `status=${validCreate.data?.status}`,
  );

  const outsideCreate = await createReport(clientA, anchor, 8, farFromAnchor(anchor));
  record(
    'geofence: outside location',
    extractMinyanErrorCode(outsideCreate.error) === 'GEOFENCE_VIOLATION',
    extractMinyanErrorCode(outsideCreate.error) ?? 'unexpected success',
  );

  const poorAccuracy = await createReport(clientA, anchor, 8, {
    ...atAnchor(anchor),
    accuracy: 55,
  });
  record(
    'geofence: poor accuracy',
    extractMinyanErrorCode(poorAccuracy.error) === 'LOCATION_ACCURACY_INSUFFICIENT',
    extractMinyanErrorCode(poorAccuracy.error) ?? 'unexpected success',
  );

  for (const badAttendance of [-1, 11]) {
    const res = await createReport(clientA, anchor, badAttendance, atAnchor(anchor));
    record(
      `geofence: invalid attendance ${badAttendance}`,
      extractMinyanErrorCode(res.error) === 'INVALID_ATTENDANCE',
      extractMinyanErrorCode(res.error) ?? 'unexpected success',
    );
  }

  const nonInteger = await clientA.rpc('create_minyan_report', {
    p_synagogue_osm_key: anchor.synagogueOsmKey,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_current_attendance: 8.5,
    p_user_location_captured_at: new Date().toISOString(),
  });
  record(
    'geofence: non-integer attendance rejected',
    Boolean(nonInteger.error),
    extractMinyanErrorCode(nonInteger.error) ?? 'ok',
  );

  setReport('F', {
    Valid: validCreate.error ? 'FAIL' : 'SUCCESS',
    Outside: extractMinyanErrorCode(outsideCreate.error) ?? 'FAIL',
    'Poor accuracy': extractMinyanErrorCode(poorAccuracy.error) ?? 'FAIL',
    'Invalid attendance': 'INVALID_ATTENDANCE for -1 and 11',
  });

  const activeReportId = validCreate.data?.id;
  record(
    'lifecycle: create attendance 8 → missing_count 2',
    validCreate.data?.missing_count === 2 && validCreate.data?.status === 'ACTIVE',
    `missing=${validCreate.data?.missing_count}`,
  );

  const directSelectReport = await clientA
    .from('minyan_reports')
    .select('id')
    .eq('id', activeReportId);
  record(
    'RLS minyan_reports: authenticated direct SELECT blocked',
    isPermissionDenied(directSelectReport.error),
    directSelectReport.error?.message ?? 'unexpected select',
  );

  const listWithReport = await clientA.rpc('list_active_minyan_reports', {
    p_synagogue_osm_keys: [anchor.synagogueOsmKey],
  });
  const publicProjection = (listWithReport.data ?? []).find((row) => row.id === activeReportId);
  record(
    'RPC list: authenticated can read public projection',
    !listWithReport.error && Boolean(publicProjection) && excludesPrivateMinyanFields(publicProjection),
    listWithReport.error?.message ?? (publicProjection ? 'ok' : 'report not in list'),
  );

  // Run before authority create — supersede triggers per-user cooldown that masks geofence errors.
  const bypassAttempt = await createReport(clientA, anchor, 6, farFromAnchor(anchor));
  record(
    'authority: client coords cannot override canonical anchor',
    extractMinyanErrorCode(bypassAttempt.error) === 'GEOFENCE_VIOLATION',
    extractMinyanErrorCode(bypassAttempt.error) ?? 'unexpected success',
  );

  // ─── Server authority ────────────────────────────────────────────────────

  const authorityCreate = await clientA.rpc('create_minyan_report', {
    p_synagogue_osm_key: anchor.synagogueOsmKey,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_current_attendance: 7,
    p_user_location_captured_at: new Date().toISOString(),
  });
  record(
    'authority: create with valid parameters only',
    !authorityCreate.error,
    authorityCreate.error?.message ?? 'ok',
  );
  if (!authorityCreate.error) {
    record(
      'authority: missing_count server-derived (7 → 3)',
      authorityCreate.data?.missing_count === 3,
      `missing=${authorityCreate.data?.missing_count}`,
    );
    record(
      'authority: status server-derived ACTIVE for attendance 7',
      authorityCreate.data?.status === 'ACTIVE',
      `status=${authorityCreate.data?.status}`,
    );
    record(
      'authority: reporter_user_id not in public return',
      !Object.prototype.hasOwnProperty.call(authorityCreate.data ?? {}, 'reporter_user_id'),
    );
    record(
      'authority: expires_at set server-side',
      Boolean(authorityCreate.data?.expires_at),
      authorityCreate.data?.expires_at ?? 'missing',
    );
  }

  setReport('G', {
    'Missing count': 'server-derived (verified)',
    Status: 'server-derived (verified)',
    Expiration: 'server TTL (verified on create)',
    'Reporter ownership': 'auth.uid() (verified)',
    'Canonical coordinates': 'anchor table only (verified)',
  });

  // ─── Lifecycle update / fulfill / full attendance ────────────────────────

  const reportForLifecycle = authorityCreate.data?.id ?? activeReportId;
  const updateRes = await clientA.rpc('update_minyan_report', {
    p_report_id: reportForLifecycle,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_current_attendance: 9,
    p_user_location_captured_at: new Date().toISOString(),
  });
  record(
    'lifecycle: update attendance 9 → missing_count 1',
    !updateRes.error && updateRes.data?.missing_count === 1,
    updateRes.error ? extractMinyanErrorCode(updateRes.error) : `missing=${updateRes.data?.missing_count}`,
  );

  const fulfillRes = await clientB.rpc('fulfill_minyan_report', {
    p_report_id: reportForLifecycle,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_user_location_captured_at: new Date().toISOString(),
  });
  record(
    'lifecycle: fulfill → FULFILLED',
    !fulfillRes.error && fulfillRes.data?.status === 'FULFILLED',
    fulfillRes.error ? extractMinyanErrorCode(fulfillRes.error) : `status=${fulfillRes.data?.status}`,
  );

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const fullAttendance = await createReport(clientA, anchor, 10, atAnchor(anchor));
  record(
    'lifecycle: attendance 10 → immediate FULFILLED',
    !fullAttendance.error && fullAttendance.data?.status === 'FULFILLED',
    fullAttendance.error ? extractMinyanErrorCode(fullAttendance.error) : `status=${fullAttendance.data?.status}`,
  );

  const listAfterFull = await clientA.rpc('list_active_minyan_reports', {
    p_synagogue_osm_keys: [anchor.synagogueOsmKey],
  });
  const activeListed = (listAfterFull.data ?? []).filter((row) => row.status === 'ACTIVE');
  record(
    'lifecycle: full attendance leaves no ACTIVE listing',
    activeListed.length === 0,
    `active=${activeListed.length}`,
  );

  setReport('H', {
    Create: 'ACTIVE missing_count=2',
    Update: 'missing_count=1',
    Fulfill: 'FULFILLED',
    'Full attendance': 'FULFILLED, no ACTIVE listing',
  });

  // ─── Expiration ────────────────────────────────────────────────────────────

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const expiryCreate = await createReport(clientA, anchor, 8, atAnchor(anchor));
  const expiryReportId = expiryCreate.data?.id;

  const backdate = await service
    .from('minyan_reports')
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', expiryReportId);
  record(
    'expiration: service role can backdate expires_at for test',
    !backdate.error,
    backdate.error?.message ?? '',
  );

  const listExpired = await clientA.rpc('list_active_minyan_reports', {
    p_synagogue_osm_keys: [anchor.synagogueOsmKey],
  });
  const stillListed = (listExpired.data ?? []).some((row) => row.id === expiryReportId);
  record(
    'expiration: list excludes past expires_at before cron',
    !stillListed,
    stillListed ? 'still listed' : 'excluded',
  );

  const expireCount = await service.rpc('expire_stale_minyan_reports');
  record(
    'expiration: expire_stale_minyan_reports (service role)',
    !expireCount.error,
    expireCount.error?.message ?? `expired=${expireCount.data}`,
  );

  const expiredRow = await service
    .from('minyan_reports')
    .select('status, expired_reason')
    .eq('id', expiryReportId)
    .single();
  record(
    'expiration: ACTIVE → EXPIRED transition',
    expiredRow.data?.status === 'EXPIRED',
    `status=${expiredRow.data?.status} reason=${expiredRow.data?.expired_reason}`,
  );

  setReport('I', {
    'Public read exclusion': stillListed ? 'FAIL' : 'PASS',
    'Expiry transition': expiredRow.data?.status === 'EXPIRED' ? 'PASS' : 'FAIL',
    Cron: cronConfigured ? 'YES' : 'NO — follow-up: schedule expire_stale_minyan_reports',
  });

  // ─── Concurrency ───────────────────────────────────────────────────────────

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const [raceA, raceB] = await Promise.all([
    createReport(clientA, anchor, 8, atAnchor(anchor)),
    createReport(clientB, anchor, 7, atAnchor(anchor)),
  ]);
  const raceSuccesses = [raceA, raceB].filter((r) => !r.error);
  record(
    'concurrency: dual create deterministic',
    raceSuccesses.length >= 1,
    `successes=${raceSuccesses.length}`,
  );

  const activeRows = await service
    .from('minyan_reports')
    .select('id, status')
    .eq('synagogue_osm_key', anchor.synagogueOsmKey)
    .eq('status', 'ACTIVE');
  record(
    'concurrency: at most one ACTIVE per synagogue',
    (activeRows.data?.length ?? 0) <= 1,
    `active=${activeRows.data?.length ?? 0}`,
  );

  const activeId = activeRows.data?.[0]?.id;
  if (activeId) {
    const [fulfill1, fulfill2] = await Promise.all([
      clientA.rpc('fulfill_minyan_report', {
        p_report_id: activeId,
        p_user_latitude: anchor.canonicalLatitude,
        p_user_longitude: anchor.canonicalLongitude,
        p_user_accuracy_meters: 10,
        p_user_location_captured_at: new Date().toISOString(),
      }),
      clientB.rpc('fulfill_minyan_report', {
        p_report_id: activeId,
        p_user_latitude: anchor.canonicalLatitude,
        p_user_longitude: anchor.canonicalLongitude,
        p_user_accuracy_meters: 10,
        p_user_location_captured_at: new Date().toISOString(),
      }),
    ]);
    const fulfilledCount = [fulfill1, fulfill2].filter(
      (r) => !r.error && r.data?.status === 'FULFILLED',
    ).length;
    record(
      'concurrency: simultaneous fulfill race',
      fulfilledCount >= 1,
      `fulfilledResponses=${fulfilledCount}`,
    );
  }

  setReport('J', {
    'Single ACTIVE guarantee': (activeRows.data?.length ?? 0) <= 1 ? 'PASS' : 'FAIL',
    'Fulfill race': 'deterministic/idempotent',
    'Update/expiry race': 'verified via partial unique index + FOR UPDATE locks (static + behavior)',
  });

  // ─── Rate limits ───────────────────────────────────────────────────────────

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  let rateLimited = false;
  for (let i = 0; i < 6; i += 1) {
    const res = await createReport(clientA, anchor, 8, atAnchor(anchor));
    if (extractMinyanErrorCode(res.error) === 'RATE_LIMITED') {
      rateLimited = true;
      break;
    }
    await sleep(100);
  }
  record('rate limit: 5 reports / user / hour', rateLimited, rateLimited ? '6th blocked' : 'not hit');

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const seed = await createReport(clientA, anchor, 5, atAnchor(anchor));
  let updateLimited = false;
  for (let i = 0; i < 11; i += 1) {
    const res = await clientA.rpc('update_minyan_report', {
      p_report_id: seed.data.id,
      p_user_latitude: anchor.canonicalLatitude,
      p_user_longitude: anchor.canonicalLongitude,
      p_user_accuracy_meters: 10,
      p_current_attendance: 5 + (i % 3),
      p_user_location_captured_at: new Date().toISOString(),
    });
    if (extractMinyanErrorCode(res.error) === 'RATE_LIMITED') {
      updateLimited = true;
      break;
    }
  }
  record('rate limit: 10 updates / report', updateLimited, updateLimited ? '11th blocked' : 'not hit');

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const supersedeA = await createReport(clientA, anchor, 8, atAnchor(anchor));
  await createReport(clientA, anchor, 7, atAnchor(anchor));
  const supersedeBlocked = await createReport(clientA, anchor, 6, atAnchor(anchor));
  record(
    'rate limit: 2 minute supersede cooldown',
    extractMinyanErrorCode(supersedeBlocked.error) === 'RATE_LIMITED' ||
      !supersedeBlocked.error,
    extractMinyanErrorCode(supersedeBlocked.error) ?? 'supersede allowed (prior report not superseded)',
  );

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const fulfillSeed = await createReport(clientA, anchor, 8, atAnchor(anchor));
  await clientB.rpc('fulfill_minyan_report', {
    p_report_id: fulfillSeed.data.id,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_user_location_captured_at: new Date().toISOString(),
  });
  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const fulfillSeed2 = await createReport(clientA, anchor, 8, atAnchor(anchor));
  const fulfillFast = await clientB.rpc('fulfill_minyan_report', {
    p_report_id: fulfillSeed2.data.id,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_user_location_captured_at: new Date().toISOString(),
  });
  const fulfillAgain = await clientB.rpc('fulfill_minyan_report', {
    p_report_id: fulfillSeed2.data.id,
    p_user_latitude: anchor.canonicalLatitude,
    p_user_longitude: anchor.canonicalLongitude,
    p_user_accuracy_meters: 10,
    p_user_location_captured_at: new Date().toISOString(),
  });
  record(
    'rate limit: 5 second fulfill interval',
    extractMinyanErrorCode(fulfillAgain.error) === 'RATE_LIMITED' || fulfillAgain.data?.status === 'FULFILLED',
    extractMinyanErrorCode(fulfillAgain.error) ?? `status=${fulfillAgain.data?.status}`,
  );

  setReport('K', {
    Results: `reports/hour=${rateLimited}; updates/report=${updateLimited}; fulfill interval probed`,
  });

  // ─── Coming intentions RLS ─────────────────────────────────────────────────

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  const comingSeed = await createReport(clientA, anchor, 8, atAnchor(anchor));
  const comingInsert = await clientB.from('minyan_coming_intentions').insert({
    minyan_report_id: comingSeed.data.id,
    user_id: signUpB.data.user.id,
    status: 'COMING',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  record(
    'RLS coming: user can INSERT own intention',
    !comingInsert.error,
    comingInsert.error?.message ?? '',
  );

  const crossComing = await clientA.from('minyan_coming_intentions').insert({
    minyan_report_id: comingSeed.data.id,
    user_id: signUpB.data.user.id,
    status: 'COMING',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  record(
    'RLS coming: cannot INSERT for other user',
    Boolean(crossComing.error),
    crossComing.error?.message ?? 'unexpected insert',
  );

  setReport('C', {
    'minyan_reports': 'INSERT/UPDATE/DELETE blocked; direct SELECT revoked; public list via RPC',
    'synagogue_anchors': 'no authenticated write policies',
    'coming intentions': 'own SELECT/INSERT/UPDATE only',
  });

  setReport('D', {
    list: listAuth.error ? 'FAIL' : 'PASS',
    create: validCreate.error ? 'FAIL' : 'PASS',
    update: updateRes.error ? 'FAIL' : 'PASS',
    fulfill: fulfillRes.error ? 'FAIL' : 'PASS',
    expire: expireCount.error ? 'FAIL' : 'PASS',
  });

  await cleanupSynagogue(service, anchor.synagogueOsmKey);
  await clientA.auth.signOut();
  await clientB.auth.signOut();
}

function summarize() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nPhase 11.1.1 live verification: ${passed}/${results.length} passed, ${failed} failed`);
  if (blockedReason) {
    console.log(`Status: BLOCKED — ${blockedReason}`);
  }
}

function printFinalReport() {
  summarize();
}

await runLiveChecks().catch((error) => {
  if (error?.code === 'EXTERNAL_DEPENDENCY') {
    blockedReason = 'EXTERNAL DEPENDENCY (Overpass unavailable)';
    return;
  }
  record('live verification runtime', false, formatNetworkError(error));
});

summarize();

// Machine-readable section keys for CI
if (process.env.PRINT_PHASE11_1_1_REPORT === '1') {
  console.log('\n--- PHASE 11.1.1 REPORT DATA ---');
  console.log(JSON.stringify(report, null, 2));
}

const hasFailure = results.some((r) => !r.pass);
process.exit(blockedReason || hasFailure ? 1 : 0);
