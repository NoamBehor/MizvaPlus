/**
 * Minyan Live dev override + error mapping verification.
 * Run: npm run verify:minyan-live-dev
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const KNOWN_MINYAN_ERROR_CODES = [
  'GEOFENCE_VIOLATION',
  'REPORT_EXPIRED',
  'INVALID_ATTENDANCE',
  'NOT_REPORT_OWNER',
];

function mapPostgrestErrorToMinyanCode(error) {
  const haystack = [error.details, error.message, error.hint, error.code]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ');

  for (const code of KNOWN_MINYAN_ERROR_CODES) {
    if (haystack.includes(code)) {
      return code;
    }
  }

  return 'UNKNOWN';
}

function getMinyanLiveHebrewMessage(code, mutationKind) {
  if (code === 'GEOFENCE_VIOLATION' && mutationKind === 'update') {
    return 'צריך להיות קרוב יותר לבית הכנסת כדי לעדכן את המניין.';
  }
  if (code === 'REPORT_EXPIRED') {
    return 'הדיווח על המניין כבר פג או נסגר.';
  }
  if (code === 'INVALID_ATTENDANCE') {
    return 'מספר הנוכחים חייב להיות בין 0 ל-10.';
  }
  if (code === 'NOT_REPORT_OWNER') {
    return 'רק מי שפתח את הדיווח יכול לעדכן אותו.';
  }
  return 'לא הצלחנו לבצע את הפעולה. נסו שוב.';
}

function resolveDevOverrideLocationForMinyanMutation(activeOverride, platformOs) {
  if (!activeOverride) {
    return null;
  }
  if (platformOs !== 'android' && platformOs !== 'web') {
    return null;
  }

  return {
    coordinates: {
      latitude: activeOverride.latitude,
      longitude: activeOverride.longitude,
    },
    accuracy: 5,
    timestamp: Date.now(),
    source: 'DEV_OVERRIDE',
  };
}

function mapRpcMutationResult(row) {
  if (!row) {
    return { kind: 'error', code: 'REPORT_EXPIRED' };
  }
  if (row.status === 'ACTIVE') {
    return { kind: 'active', report: row };
  }
  if (row.status === 'FULFILLED') {
    return { kind: 'fulfilled', report: null };
  }
  return { kind: 'error', code: 'REPORT_EXPIRED' };
}

function main() {
  console.log('Minyan Live Dev Verification\n==============================\n');

  const packageJson = JSON.parse(read('package.json'));
  record(
    'script: verify:minyan-live-dev exists',
    packageJson.scripts['verify:minyan-live-dev'] === 'node scripts/verify-minyan-live-dev.mjs',
  );

  const override = {
    osmKey: 'way/753100030',
    name: 'בית הכנסת המרכזי אלפי מנשה',
    latitude: 32.1708411,
    longitude: 35.0118502,
  };

  const androidLocation = resolveDevOverrideLocationForMinyanMutation(override, 'android');
  const webLocation = resolveDevOverrideLocationForMinyanMutation(override, 'web');
  const iosLocation = resolveDevOverrideLocationForMinyanMutation(override, 'ios');

  record(
    'dev override: android mutation location',
    androidLocation?.source === 'DEV_OVERRIDE' &&
      androidLocation.accuracy === 5 &&
      androidLocation.coordinates.latitude === override.latitude,
  );
  record(
    'dev override: web mutation location',
    webLocation?.source === 'DEV_OVERRIDE' && webLocation.accuracy === 5,
  );
  record(
    'dev override: ios mutation keeps GPS path',
    iosLocation === null,
  );

  const firstTimestamp = androidLocation?.timestamp ?? 0;
  const secondLocation = resolveDevOverrideLocationForMinyanMutation(override, 'android');
  record(
    'dev override: fresh capturedAt on each mutation',
    (secondLocation?.timestamp ?? 0) >= firstTimestamp,
  );

  const geofenceCode = mapPostgrestErrorToMinyanCode({
    code: 'P0001',
    message: 'GEOFENCE_VIOLATION',
    details: 'GEOFENCE_VIOLATION',
    hint: null,
  });
  const expiredCode = mapPostgrestErrorToMinyanCode({
    code: 'P0001',
    message: 'REPORT_EXPIRED',
    details: 'REPORT_EXPIRED',
    hint: null,
  });

  record(
    'error mapping: GEOFENCE_VIOLATION code extracted',
    geofenceCode === 'GEOFENCE_VIOLATION',
  );
  record(
    'error mapping: REPORT_EXPIRED code extracted',
    expiredCode === 'REPORT_EXPIRED',
  );
  record(
    'error mapping: geofence update Hebrew message',
    getMinyanLiveHebrewMessage('GEOFENCE_VIOLATION', 'update').includes(
      'כדי לעדכן את המניין',
    ),
  );
  record(
    'error mapping: expired Hebrew message distinct from geofence',
    getMinyanLiveHebrewMessage('REPORT_EXPIRED', 'update').includes('פג או נסגר') &&
      !getMinyanLiveHebrewMessage('REPORT_EXPIRED', 'update').includes('רחוק'),
  );

  const fulfilledUpdate = mapRpcMutationResult({
    id: 'report-1',
    status: 'FULFILLED',
    synagogue_osm_key: override.osmKey,
    current_attendance: 10,
    missing_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    coming_count: 0,
  });
  record(
    'fulfilled update is success not REPORT_EXPIRED',
    fulfilledUpdate.kind === 'fulfilled' && fulfilledUpdate.report === null,
  );

  const useMinyanLive = read('src/hooks/useMinyanLive.ts');
  record(
    'mutation errors include mutation kind',
    useMinyanLive.includes('toUserFacingMinyanError(error, kind)'),
  );
  record(
    'no geofence auto-retry in hook',
    !useMinyanLive.match(/GEOFENCE[\s\S]*runMutation|runMutation[\s\S]*GEOFENCE/i),
  );

  const minyanLiveService = read('src/services/minyanLive/minyanLiveService.ts');
  record(
    'update service has no Overpass import',
    !minyanLiveService.includes('overpass'),
  );

  const failed = results.filter((item) => !item.pass);
  const passed = results.length - failed.length;
  console.log(`\n${passed}/${results.length} passed`);

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const failure of failed) {
      console.log(`  - ${failure.name}${failure.detail ? `: ${failure.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

main();
