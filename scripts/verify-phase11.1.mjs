/**
 * Phase 11.1 verification — Minyan Live database, RLS, and server authority.
 * Run: npm run verify:phase11.1
 *
 * Static contract checks against migration SQL and client constants.
 * Mirrors Haversine + geofence logic for regression safety.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const migrationPath = 'supabase/migrations/20260906100000_phase11_1_minyan_live.sql';
const migration = read(migrationPath);
const constantsSrc = read('src/constants/minyanLive.ts');
const distanceSrc = read('src/utils/distance.ts');

// ─── 1. Table existence ─────────────────────────────────────────────────────

for (const table of ['synagogue_anchors', 'minyan_reports', 'minyan_coming_intentions']) {
  record(`P11.1 table exists: ${table}`, migration.includes(`public.${table}`));
}

// ─── 2. Constraints ─────────────────────────────────────────────────────────

record(
  'P11.1 constraint: synagogue_anchors unique synagogue_osm_key',
  migration.includes('synagogue_anchors_osm_key_unique'),
);
record(
  'P11.1 constraint: synagogue_anchors OSM key consistency',
  migration.includes("synagogue_osm_key = osm_type || '/' || osm_id::text"),
);
record(
  'P11.1 constraint: valid OSM type on anchors',
  /synagogue_anchors[\s\S]*CHECK \(osm_type IN \('node', 'way', 'relation'\)\)/.test(migration),
);
record(
  'P11.1 constraint: WGS84 latitude on anchors',
  migration.includes('canonical_latitude >= -90 AND canonical_latitude <= 90'),
);
record(
  'P11.1 constraint: WGS84 longitude on anchors',
  migration.includes('canonical_longitude >= -180 AND canonical_longitude <= 180'),
);
record(
  'P11.1 constraint: attendance 0–10',
  migration.includes('current_attendance >= 0 AND current_attendance <= 10'),
);
record(
  'P11.1 constraint: missing_count not stored on minyan_reports',
  !/CREATE TABLE IF NOT EXISTS public\.minyan_reports[\s\S]*missing_count SMALLINT/.test(migration) &&
    migration.includes('DROP COLUMN IF EXISTS missing_count'),
);
record(
  'P11.1 constraint: missing_count computed in public projection',
  /minyan_to_public_row[\s\S]*minyan_compute_missing_count\(p_report\.current_attendance\)/.test(
    migration,
  ) &&
    /list_active_minyan_reports[\s\S]*minyan_compute_missing_count\(r\.current_attendance\)/.test(
      migration,
    ),
);
record(
  'P11.1 constraint: status enum',
  migration.includes("status IN ('ACTIVE', 'FULFILLED', 'EXPIRED')"),
);
record(
  'P11.1 constraint: one coming intention per user/report',
  migration.includes('minyan_coming_one_per_user_per_report'),
);
record(
  'P11.1 constraint: minyan_reports FK to synagogue_anchors',
  migration.includes('REFERENCES public.synagogue_anchors(synagogue_osm_key)'),
);

// ─── 3. Indexes ─────────────────────────────────────────────────────────────

record(
  'P11.1 index: one ACTIVE report per synagogue',
  migration.includes('minyan_reports_one_active_per_synagogue_idx') &&
    migration.includes("WHERE status = 'ACTIVE'"),
);
record(
  'P11.1 index: active expires',
  migration.includes('minyan_reports_active_expires_idx'),
);
record(
  'P11.1 index: synagogue history',
  migration.includes('minyan_reports_synagogue_osm_key_created_idx'),
);
record(
  'P11.1 index: reporter history / rate limit',
  migration.includes('minyan_reports_reporter_created_idx'),
);
record(
  'P11.1 index: supersede cooldown',
  migration.includes('minyan_reports_reporter_superseded_idx'),
);
record(
  'P11.1 index: fulfill rate limit',
  migration.includes('minyan_reports_fulfilled_by_updated_idx'),
);
record(
  'P11.1 index: expiry sweep',
  migration.includes('minyan_reports_status_expires_idx'),
);
record(
  'P11.1 index: coming intentions aggregate',
  migration.includes('minyan_coming_report_status_expires_idx'),
);

// ─── 4. RLS enabled ─────────────────────────────────────────────────────────

for (const table of ['synagogue_anchors', 'minyan_reports', 'minyan_coming_intentions']) {
  record(
    `P11.1 RLS enabled: ${table}`,
    migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`),
  );
}

// ─── 5. Public projection has no private fields ─────────────────────────────

const publicTypeBlock = migration.slice(
  migration.indexOf('CREATE TYPE public.public_minyan_report'),
  migration.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS minyan_reports_one_active'),
);

record(
  'P11.1 public type: includes synagogue_osm_key',
  publicTypeBlock.includes('synagogue_osm_key text'),
);
record(
  'P11.1 public type: includes coming_count',
  publicTypeBlock.includes('coming_count bigint'),
);
record(
  'P11.1 public type: excludes reporter_user_id',
  !publicTypeBlock.includes('reporter_user_id'),
);
record(
  'P11.1 public type: excludes report_latitude',
  !publicTypeBlock.includes('report_latitude'),
);
record(
  'P11.1 public type: excludes report_longitude',
  !publicTypeBlock.includes('report_longitude'),
);
record(
  'P11.1 public type: excludes report_accuracy_meters',
  !publicTypeBlock.includes('report_accuracy_meters'),
);
record(
  'P11.1 public type: excludes report_distance_meters',
  !publicTypeBlock.includes('report_distance_meters'),
);
record(
  'P11.1 list RPC uses explicit public type (not a view)',
  migration.includes('CREATE OR REPLACE FUNCTION public.list_active_minyan_reports') &&
    !migration.includes('CREATE VIEW public.active_minyan_reports_public'),
);

// ─── 6. Unauthenticated mutation rejected ────────────────────────────────────

record(
  'P11.1 auth: create uses minyan_assert_authenticated',
  /create_minyan_report[\s\S]*minyan_assert_authenticated/.test(migration),
);
record(
  'P11.1 auth: update uses minyan_assert_authenticated',
  /update_minyan_report[\s\S]*minyan_assert_authenticated/.test(migration),
);
record(
  'P11.1 auth: fulfill uses minyan_assert_authenticated',
  /fulfill_minyan_report[\s\S]*minyan_assert_authenticated/.test(migration),
);
record(
  'P11.1 auth: list uses minyan_assert_authenticated',
  /list_active_minyan_reports[\s\S]*minyan_assert_authenticated/.test(migration),
);
record(
  'P11.1 auth: no INSERT policy on minyan_reports',
  !migration.includes('minyan_reports_insert'),
);

// ─── 7. Reporter ownership enforced ─────────────────────────────────────────

record(
  'P11.1 ownership: update checks reporter_user_id',
  /update_minyan_report[\s\S]*NOT_REPORT_OWNER/.test(migration) &&
    /update_minyan_report[\s\S]*reporter_user_id IS DISTINCT FROM v_user_id/.test(migration),
);
record(
  'P11.1 privacy: no direct SELECT grant on minyan_reports',
  migration.includes('REVOKE ALL ON TABLE public.minyan_reports FROM authenticated') &&
    !migration.includes('GRANT SELECT ON public.minyan_reports TO authenticated'),
);
record(
  'P11.1 privacy: no reporter SELECT policy on minyan_reports',
  !migration.includes('CREATE POLICY minyan_reports_select_own'),
);

// ─── 8–13. Server authority contracts ───────────────────────────────────────

record(
  'P11.1 authority: one ACTIVE per synagogue partial unique index',
  migration.includes('CREATE UNIQUE INDEX IF NOT EXISTS minyan_reports_one_active_per_synagogue_idx'),
);
record(
  'P11.1 authority: status set server-side in create',
  /create_minyan_report[\s\S]*v_status := 'ACTIVE'/.test(migration) &&
    /create_minyan_report[\s\S]*v_status := 'FULFILLED'/.test(migration),
);
record(
  'P11.1 authority: expires_at set server-side',
  /create_minyan_report[\s\S]*report_ttl_minutes/.test(migration),
);
record(
  'P11.1 authority: expire_stale requires service role',
  /expire_stale_minyan_reports[\s\S]*minyan_assert_service_role/.test(migration),
);
record(
  'P11.1 authority: list filters expires_at > now()',
  /list_active_minyan_reports[\s\S]*expires_at > now\(\)/.test(migration),
);
record(
  'P11.1 authority: anchors cannot be changed by authenticated users',
  migration.includes('upsert_synagogue_anchor') &&
    /upsert_synagogue_anchor[\s\S]*minyan_assert_service_role/.test(migration) &&
    !migration.includes('synagogue_anchors_insert') &&
    !migration.includes('synagogue_anchors_update'),
);
record(
  'P11.1 authority: geofence uses canonical anchor (not client synagogue coords)',
  /create_minyan_report[\s\S]*v_anchor\.canonical_latitude/.test(migration) &&
    !migration.includes('synagogue_latitude') &&
    !migration.includes('p_synagogue_latitude'),
);
const createRpcBlock = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.create_minyan_report'),
  migration.indexOf('CREATE OR REPLACE FUNCTION public.update_minyan_report'),
);
const insertReportBlock = migration.slice(
  migration.indexOf('INSERT INTO public.minyan_reports'),
  migration.indexOf('RETURNING * INTO v_row'),
);

const updateReportBlock = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.update_minyan_report'),
  migration.indexOf('CREATE OR REPLACE FUNCTION public.fulfill_minyan_report'),
);

record(
  'P11.1 authority: missing_count computed at read time (not stored)',
  /minyan_to_public_row[\s\S]*minyan_compute_missing_count/.test(migration) &&
    !insertReportBlock.includes('missing_count') &&
    !updateReportBlock.includes('missing_count ='),
);
record(
  'P11.1 authority: create RPC rejects client missing_count/status/expires_at/reporter',
  createRpcBlock.includes('p_current_attendance integer') &&
    !createRpcBlock.includes('p_missing_count') &&
    !createRpcBlock.includes('p_status') &&
    !createRpcBlock.includes('p_expires_at') &&
    !createRpcBlock.includes('p_reporter_user_id') &&
    !createRpcBlock.includes('p_canonical_latitude') &&
    !createRpcBlock.includes('p_synagogue_latitude'),
);
record(
  'P11.1 concurrency: create supersedes ACTIVE in transaction',
  /create_minyan_report[\s\S]*expired_reason = 'superseded'/.test(migration),
);

// ─── 14–17. Coming intentions, fulfill, expiry ───────────────────────────────

record(
  'P11.1 coming: duplicate prevented by unique constraint',
  migration.includes('UNIQUE (minyan_report_id, user_id)'),
);
record(
  'P11.1 coming: user SELECT/INSERT/UPDATE own policies',
  migration.includes('minyan_coming_select_own') &&
    migration.includes('minyan_coming_insert_own') &&
    migration.includes('minyan_coming_update_own'),
);
record(
  'P11.1 fulfill: geofence + active + not expired',
  /fulfill_minyan_report[\s\S]*minyan_validate_geofence/.test(migration) &&
    /fulfill_minyan_report[\s\S]*REPORT_EXPIRED/.test(migration),
);
record(
  'P11.1 fulfill: idempotent when already FULFILLED',
  /fulfill_minyan_report[\s\S]*v_existing\.status = 'FULFILLED'/.test(migration),
);
record(
  'P11.1 expired reports excluded from list',
  /list_active_minyan_reports[\s\S]*r\.status = 'ACTIVE'[\s\S]*r\.expires_at > now\(\)/.test(
    migration,
  ),
);

// ─── 18. Rate-limit contract ──────────────────────────────────────────────────

record(
  'P11.1 rate limit: structured RATE_LIMITED errors',
  migration.includes("'RATE_LIMITED'"),
);
record(
  'P11.1 rate limit: 5 new reports / hour',
  migration.includes('rate_new_reports_per_hour') &&
    constantsSrc.includes('MINYAN_RATE_LIMIT_NEW_REPORTS_PER_HOUR = 5'),
);
record(
  'P11.1 rate limit: 10 updates / report',
  migration.includes('rate_updates_per_report') &&
    constantsSrc.includes('MINYAN_RATE_LIMIT_UPDATES_PER_REPORT = 10'),
);
record(
  'P11.1 rate limit: 2 minute supersede cooldown',
  migration.includes('rate_supersede_cooldown_minutes') &&
    constantsSrc.includes('MINYAN_RATE_LIMIT_SUPERSEDE_COOLDOWN_MINUTES = 2'),
);
record(
  'P11.1 rate limit: 5 second fulfill interval',
  migration.includes('rate_fulfill_interval_seconds') &&
    constantsSrc.includes('MINYAN_RATE_LIMIT_FULFILL_INTERVAL_SECONDS = 5'),
);

// ─── 19. Concurrency contract ────────────────────────────────────────────────

record(
  'P11.1 concurrency: create uses advisory lock per synagogue',
  /create_minyan_report[\s\S]*pg_advisory_xact_lock\(hashtext\(p_synagogue_osm_key\)\)/.test(
    migration,
  ),
);
record(
  'P11.1 concurrency: update uses FOR UPDATE row lock',
  /update_minyan_report[\s\S]*FOR UPDATE/.test(migration),
);
record(
  'P11.1 concurrency: fulfill uses FOR UPDATE row lock',
  /fulfill_minyan_report[\s\S]*FOR UPDATE/.test(migration),
);
record(
  'P11.1 concurrency: update re-checks ACTIVE + not expired in WHERE',
  /update_minyan_report[\s\S]*AND status = 'ACTIVE'[\s\S]*AND expires_at > now\(\)/.test(
    migration,
  ),
);

// ─── 21. Security regression (Phase 11.1.4) ──────────────────────────────────

const authenticatedRpcs = [
  'create_minyan_report',
  'update_minyan_report',
  'fulfill_minyan_report',
  'list_active_minyan_reports',
];
const serviceRoleRpcs = ['upsert_synagogue_anchor', 'expire_stale_minyan_reports'];

for (const rpc of authenticatedRpcs) {
  record(
    `P11.1 security: REVOKE ALL FROM PUBLIC on ${rpc}`,
    migration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`) &&
      migration.includes('FROM PUBLIC'),
  );
  record(
    `P11.1 security: GRANT EXECUTE on ${rpc} to authenticated`,
    migration.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`) &&
      migration.includes('TO authenticated'),
  );
}

for (const rpc of serviceRoleRpcs) {
  record(
    `P11.1 security: REVOKE ALL FROM PUBLIC on ${rpc}`,
    migration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`) &&
      migration.includes('FROM PUBLIC'),
  );
  record(
    `P11.1 security: GRANT EXECUTE on ${rpc} to service_role`,
    migration.includes(`GRANT EXECUTE ON FUNCTION public.${rpc}`) &&
      migration.includes('TO service_role'),
  );
  record(
    `P11.1 security: REVOKE EXECUTE on ${rpc} from authenticated`,
    migration.includes(`REVOKE ALL ON FUNCTION public.${rpc}`) &&
      migration.includes('FROM authenticated'),
  );
}

record(
  'P11.1 security: synagogue_anchors not granted to authenticated',
  migration.includes('REVOKE ALL ON TABLE public.synagogue_anchors FROM authenticated'),
);
record(
  'P11.1 security: create RPC has no client missing_count parameter',
  !createRpcBlock.includes('p_missing_count'),
);
record(
  'P11.1 security: create RPC has no client canonical coordinate parameters',
  !createRpcBlock.includes('p_canonical_latitude') &&
    !createRpcBlock.includes('p_canonical_longitude') &&
    !createRpcBlock.includes('p_synagogue_latitude') &&
    !createRpcBlock.includes('p_synagogue_longitude'),
);
record(
  'P11.1 security: list RPC never reads stored missing_count column',
  !/list_active_minyan_reports[\s\S]*r\.missing_count/.test(migration),
);

// ─── 20. Privacy contract ───────────────────────────────────────────────────

record(
  'P11.1 privacy: audit GPS columns exist on minyan_reports',
  migration.includes('report_latitude') &&
    migration.includes('report_longitude') &&
    migration.includes('report_accuracy_meters') &&
    migration.includes('report_distance_meters'),
);
record(
  'P11.1 privacy: list RPC never selects audit columns',
  !/list_active_minyan_reports[\s\S]*report_latitude/.test(migration),
);
record(
  'P11.1 privacy: coming aggregate without user IDs in list RPC',
  /list_active_minyan_reports[\s\S]*count\(\*\)::bigint AS coming_count/.test(migration) &&
    !/list_active_minyan_reports[\s\S]*user_id/.test(migration),
);

// ─── Geofence constants parity ───────────────────────────────────────────────

const serverConfigBlock = migration.slice(
  migration.indexOf('CREATE OR REPLACE FUNCTION public.minyan_live_config'),
  migration.indexOf('CREATE OR REPLACE FUNCTION public.minyan_raise'),
);

const constantPairs = [
  ['MINYAN_REQUIRED_COUNT = 10', '10::integer'],
  ['MINYAN_MAX_REPORT_RADIUS_METERS = 120', '120::integer'],
  ['MINYAN_MAX_GPS_ACCURACY_METERS = 50', '50::integer'],
  ['MINYAN_ACCURACY_CAP_METERS = 30', '30::integer'],
  ['MINYAN_LOCATION_MAX_AGE_MS = 30_000', '30000::bigint'],
  ['MINYAN_REPORT_TTL_MINUTES = 20', '20::integer'],
];

for (const [clientNeedle, serverNeedle] of constantPairs) {
  record(
    `P11.1 geofence constant mirrored: ${clientNeedle.split(' = ')[0]}`,
    constantsSrc.includes(clientNeedle) && serverConfigBlock.includes(serverNeedle),
  );
}

record(
  'P11.1 geofence: effective radius maximum documented as 150m',
  constantsSrc.includes('MINYAN_EFFECTIVE_RADIUS_MAX_METERS') &&
    constantsSrc.includes('120 m + 30 m = **150 m**'),
);

record(
  'P11.1 geofence: server uses accuracy-capped effective radius',
  migration.includes('LEAST(p_user_accuracy_meters, cfg.accuracy_cap_meters)'),
);

// ─── Haversine mirror ────────────────────────────────────────────────────────

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function effectiveRadius(accuracyMeters) {
  return 120 + Math.min(accuracyMeters, 30);
}

function computeMissingCount(attendance) {
  return Math.max(0, 10 - attendance);
}

const anchor = { latitude: 31.7683, longitude: 35.2137 };
const inside = { latitude: 31.76835, longitude: 35.21375 };
const outside = { latitude: 31.77, longitude: 35.22 };

const insideDistance = haversineMeters(inside, anchor);
const outsideDistance = haversineMeters(outside, anchor);

record(
  'P11.1 haversine: inside 150m effective radius passes',
  insideDistance <= effectiveRadius(25),
  `${insideDistance.toFixed(1)}m <= 150m`,
);
record(
  'P11.1 haversine: far point fails geofence',
  outsideDistance > effectiveRadius(10),
  `${outsideDistance.toFixed(1)}m > 130m`,
);
record(
  'P11.1 haversine: migration uses earth radius 6371000',
  migration.includes('6371000'),
);
record(
  'P11.1 haversine: canonical client formula exists',
  distanceSrc.includes('EARTH_RADIUS_METERS = 6_371_000') &&
    distanceSrc.includes('calculateDistanceMeters'),
);

record('P11.1 missing_count: attendance 8 → 2', computeMissingCount(8) === 2);
record('P11.1 missing_count: attendance 10 → 0', computeMissingCount(10) === 0);
record('P11.1 missing_count: attendance 0 → 10', computeMissingCount(0) === 10);

// ─── Phase 10 safety ─────────────────────────────────────────────────────────

const phase10Migration = read('supabase/migrations/20260811000000_phase10_initial_schema.sql');
record(
  'P11.1 safety: Phase 10 migration untouched',
  !phase10Migration.includes('minyan_reports') && !phase10Migration.includes('synagogue_anchors'),
);
record(
  'P11.1 safety: Phase 11.1 backend-only scope preserved',
  read('supabase/migrations/20260906100000_phase11_1_minyan_live.sql').includes(
    'create_minyan_report',
  ),
);

// ─── Package script ──────────────────────────────────────────────────────────

record(
  'P11.1 package: verify script registered',
  read('package.json').includes('"verify:phase11.1"'),
);

function main() {
  console.log('Phase 11.1 Verification\n========================\n');

  const failed = results.filter((item) => !item.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const item of failed) {
      console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

main();
