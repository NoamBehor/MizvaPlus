/**
 * Development location override verification.
 * Run: npm run verify:dev-location
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

function main() {
  console.log('Dev Location Override Verification\n==================================\n');

  const packageJson = JSON.parse(read('package.json'));
  const devLocationOverride = read('src/services/devPreview/devLocationOverride.ts');
  const locationNative = read('src/services/location.ts');
  const locationWeb = read('src/services/location.web.ts');
  const minyanLiveService = read('src/services/minyanLive/minyanLiveService.ts');
  const useMinyanLive = read('src/hooks/useMinyanLive.ts');
  const diagnosticsScreen = read('src/screens/dev/DiagnosticsScreen.tsx');
  const devLocationSection = read('src/components/dev/DevLocationSection.tsx');
  const migration = read('supabase/migrations/20260906100000_phase11_1_minyan_live.sql');

  record(
    'script: verify:dev-location exists',
    packageJson.scripts['verify:dev-location'] === 'node scripts/verify-dev-location.mjs',
  );

  record(
    'module: devLocationOverride exists',
    devLocationOverride.includes('export function setDevLocationOverride'),
  );

  record(
    'override enabled only in development',
    devLocationOverride.includes('if (!__DEV__)') &&
      devLocationOverride.includes('return __DEV__ && activeOverride !== null'),
  );

  record(
    'production path has no override state mutation',
    devLocationOverride.includes('if (!__DEV__)') &&
      devLocationOverride.includes('return;') &&
      devLocationOverride.includes('export function setDevLocationOverride'),
  );

  record(
    'native location checks override before GPS',
    locationNative.includes('resolveDevOverrideLocation') &&
      locationNative.includes('if (__DEV__)') &&
      locationNative.indexOf('resolveDevOverrideLocation') <
        locationNative.indexOf('getLastKnownPositionAsync'),
  );
  record(
    'native location uses cached then fresh GPS',
    locationNative.includes('getLastKnownPositionAsync') &&
      locationNative.includes('getCurrentPositionAsync'),
  );

  record(
    'web location checks override before fallback',
    locationWeb.includes('resolveDevOverrideLocation') &&
      locationWeb.includes("source: 'FALLBACK'"),
  );

  record(
    'real GPS remains default when override inactive',
    locationNative.includes("source: 'GPS'") &&
      !locationNative.match(/skip.*geofence|bypass.*geofence/i),
  );

  record(
    'selected synagogue coordinates are used for override',
    devLocationOverride.includes('activeOverride.latitude') &&
      devLocationOverride.includes('DEV_LOCATION_OVERRIDE_ACCURACY_METERS') &&
      devLocationOverride.includes("source: 'DEV_OVERRIDE'"),
  );

  record(
    'RPC still receives normal location payload',
    minyanLiveService.includes('buildMinyanLocationPayload') &&
      minyanLiveService.includes('p_user_latitude') &&
      minyanLiveService.includes('p_user_accuracy_meters') &&
      minyanLiveService.includes('resolveDevOverrideLocationForMinyanMutation'),
  );

  record(
    'no geofence bypass in minyan service',
    !minyanLiveService.match(/skip.*geofence|bypass.*geofence/i) &&
      minyanLiveService.includes('resolveDevOverrideLocationForMinyanMutation') &&
      minyanLiveService.includes('getFreshLocationForMinyan') &&
      minyanLiveService.includes('create_minyan_report'),
  );

  record(
    'minyan hook still uses location service abstraction',
    useMinyanLive.includes('getFreshLocationForMinyan') &&
      useMinyanLive.includes('buildMinyanLocationPayload') &&
      !useMinyanLive.match(/skip.*geofence|bypass.*geofence/i),
  );

  record(
    'anchor authority remains server-side',
    migration.includes('synagogue_anchors') &&
      migration.includes('minyan_validate_geofence') &&
      !devLocationOverride.match(/create.*anchor|insert.*synagogue_anchors/i),
  );

  record(
    'no service-role credentials in override module',
    !devLocationOverride.match(/SERVICE_ROLE|service.role/i),
  );

  record(
    'disabling override restores GPS path',
    devLocationOverride.includes('clearDevLocationOverride') &&
      devLocationSection.includes('הפסק מיקום מדומה') &&
      locationNative.includes('getCurrentPositionAsync'),
  );

  record(
    'diagnostics UI labels development location',
    diagnosticsScreen.includes('DevLocationSection') &&
      devLocationSection.includes('מיקום פיתוח') &&
      devLocationSection.includes('מיקום אמיתי') &&
      devLocationSection.includes('מיקום מדומה'),
  );

  record(
    'diagnostics show override warning',
    devLocationSection.includes('WARNING: Development location override active') &&
      devLocationSection.includes('Location source'),
  );

  record(
    'synagogue list comes from loaded Overpass results',
    read('src/screens/map/MapScreen.tsx').includes('setLoadedSynagogues') &&
      read('src/store/diagnosticsStore.ts').includes('loadedSynagogues'),
  );
  record(
    'web map uses dev override location source in diagnostics',
    read('src/screens/map/MapScreen.web.tsx').includes('setMapDiagnostics') &&
      read('src/screens/map/MapScreen.web.tsx').includes('useUserLocation'),
  );

  const minyanErrors = read('src/services/minyanLive/minyanLiveErrors.ts');

  record(
    'minyan: getFreshLocationForMinyan resolves dev override before GPS',
    minyanLiveService.includes('resolveDevOverrideLocationForMinyanMutation') &&
      minyanLiveService.indexOf('resolveDevOverrideLocationForMinyanMutation') <
        minyanLiveService.indexOf('getCurrentLocation'),
  );

  record(
    'minyan: dev override limited to android/web dev mutations',
    read('src/services/devPreview/devLocationOverride.ts').includes(
      'resolveDevOverrideLocationForMinyanMutation',
    ) &&
      read('src/services/devPreview/devLocationOverride.ts').includes(
        "Platform.OS === 'android' || Platform.OS === 'web'",
      ),
  );

  record(
    'minyan: create uses getFreshLocationForMinyan',
    useMinyanLive.includes("runMutation('create'") &&
      useMinyanLive.match(/createReport[\s\S]*getFreshLocationForMinyan/),
  );

  record(
    'minyan: update uses getFreshLocationForMinyan',
    useMinyanLive.includes("runMutation('update'") &&
      useMinyanLive.match(/updateReport[\s\S]*getFreshLocationForMinyan/),
  );

  record(
    'minyan: fulfill uses getFreshLocationForMinyan',
    useMinyanLive.includes("runMutation('fulfill'") &&
      useMinyanLive.match(/fulfillReport[\s\S]*getFreshLocationForMinyan/),
  );

  record(
    'minyan: GEOFENCE_VIOLATION maps to distinct update Hebrew message',
    minyanErrors.includes('צריך להיות קרוב יותר לבית הכנסת כדי לעדכן את המניין.') &&
      minyanErrors.includes("mutationKind === 'update'"),
  );

  record(
    'minyan: REPORT_EXPIRED maps to distinct Hebrew message',
    minyanErrors.includes('הדיווח על המניין כבר פג או נסגר.') &&
      !minyanErrors.includes('המניין כבר נסגר או התמלא.'),
  );

  record(
    'minyan: fulfilled RPC row is not surfaced as REPORT_EXPIRED',
    minyanLiveService.includes("row.status === 'FULFILLED'") &&
      minyanLiveService.includes('MinyanLiveServiceError'),
  );

  const mutationErrorBlock = useMinyanLive.match(
    /buildMinyanErrorPresentation\(error, rpcName\)[\s\S]*?return false;/,
  )?.[0];
  record(
    'minyan: geofence failure does not auto-retry mutation',
    !useMinyanLive.match(/GEOFENCE[\s\S]*retry|retry[\s\S]*GEOFENCE/i) &&
      Boolean(mutationErrorBlock) &&
      !mutationErrorBlock.includes('await refresh(') &&
      !mutationErrorBlock.includes('runMutation('),
  );

  record(
    'minyan: update path has no Overpass dependency',
    !minyanLiveService.includes('overpass') &&
      !useMinyanLive.includes('overpass') &&
      !useMinyanLive.match(/updateReport[\s\S]*refreshSynagogues/),
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
