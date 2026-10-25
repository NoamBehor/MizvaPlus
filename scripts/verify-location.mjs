/**
 * Location service verification.
 * Run: npm run verify:location
 */
import { existsSync, readFileSync } from 'node:fs';
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
  console.log('Location Verification\n=====================\n');

  const packageJson = JSON.parse(read('package.json'));
  const locationNative = read('src/services/location.ts');
  const locationWeb = read('src/services/location.web.ts');
  const locationTypes = read('src/types/location.ts');
  const useUserLocation = read('src/hooks/useUserLocation.ts');
  const mapScreen = read('src/screens/map/MapScreen.tsx');
  const diagnosticsScreen = read('src/screens/dev/DiagnosticsScreen.tsx');
  const diagnosticsStore = read('src/store/diagnosticsStore.ts');
  const diagnosticsTypes = read('src/services/diagnostics/types.ts');
  const useSynagogues = read('src/hooks/useSynagogues.ts');
  const devLocationOverride = read('src/services/devPreview/devLocationOverride.ts');

  record(
    'script: verify:location exists',
    packageJson.scripts['verify:location'] === 'node scripts/verify-location.mjs',
  );

  record(
    'types: explicit location sources',
    locationTypes.includes("'GPS'") &&
      locationTypes.includes("'CACHED'") &&
      locationTypes.includes("'FALLBACK'") &&
      locationTypes.includes("'UNAVAILABLE'") &&
      locationTypes.includes("'DEV_OVERRIDE'"),
  );

  record(
    'types: fallback reason tracked',
    locationTypes.includes('fallbackReason?: string'),
  );

  record(
    'native: checks foreground permission',
    locationNative.includes('getForegroundPermissionsAsync()') &&
      locationNative.includes('requestForegroundPermissionsAsync()'),
  );

  record(
    'native: uses last known location',
    locationNative.includes('getLastKnownPositionAsync'),
  );

  record(
    'native: requests fresh current location',
    locationNative.includes('getCurrentPositionAsync'),
  );

  record(
    'native: GPS results tagged explicitly',
    locationNative.includes("'GPS' | 'CACHED'") &&
      locationNative.includes("source: 'FALLBACK'") &&
      locationNative.includes('resolveDeviceLocation'),
  );

  record(
    'native: no silent Jerusalem substitution on permission denial',
    locationNative.includes('permission_denied') &&
      !locationNative.match(/permission_denied[\s\S]{0,200}DEV_PREVIEW_DEFAULT_COORDINATES/s),
  );

  record(
    'native: Jerusalem fallback is explicit when GPS unavailable',
    locationNative.includes('DEV_PREVIEW_DEFAULT_COORDINATES') &&
      locationNative.includes('fallbackReason'),
  );

  record(
    'hook: requests permission on map bootstrap',
    useUserLocation.includes("permission === 'unknown' || permission === 'denied'") &&
      useUserLocation.includes('requestLocationPermission()'),
  );

  record(
    'hook: publishes cached location before fresh GPS',
    useUserLocation.includes('getCachedLocationIfPermitted') &&
      useUserLocation.includes('getCurrentLocation()'),
  );

  record(
    'hook: permission denied message is explicit',
    useUserLocation.includes('כדי למצוא בתי כנסת בקרבתך, נדרש אישור מיקום.'),
  );

  record(
    'map: no hardcoded Jerusalem center',
    !mapScreen.includes('DEV_PREVIEW_DEFAULT_COORDINATES') &&
      mapScreen.includes('useUserLocation({ watch: true })'),
  );

  record(
    'map: watches GPS only while Map tab is mounted',
    useUserLocation.includes('watchLocation') &&
      useUserLocation.includes('watch?: boolean') &&
      !read('src/screens/home/HomeScreen.tsx').includes('watch: true'),
  );

  record(
    'map: fallback state is visible',
    mapScreen.includes("location?.source === 'FALLBACK'") &&
      mapScreen.includes('מיקום GPS לא זמין'),
  );

  record(
    'map: overpass center diagnostics wired',
    mapScreen.includes('overpassCenterLatitude') &&
      mapScreen.includes('overpassCenterSource') &&
      mapScreen.includes('setMapDiagnostics'),
  );

  record(
    'map: native renderer is recorded in diagnostics',
    mapScreen.includes("mapRenderer: 'NATIVE_REACT_NATIVE_MAPS'"),
  );

  record(
    'map: Android Google provider is platform-gated',
    mapScreen.includes("Platform.OS === 'android' ? PROVIDER_GOOGLE"),
  );

  record(
    'metro: @/ alias resolves AppIcon to an existing source file',
    read('metro.config.js').includes("startsWith('@/')") &&
      read('metro.config.js').includes("type: 'sourceFile'") &&
      existsSync(join(root, 'src/components/common/AppIcon.tsx')),
  );

  record(
    'map: Android MapView is not clipped by overflow hidden',
    !mapScreen.includes('overflow-hidden') &&
      mapScreen.includes('<MapView') &&
      !/MapView[\s\S]{0,500}overflow:\s*'hidden'/.test(mapScreen),
  );

  record(
    'map: native screen shows Overpass cache notice',
    mapScreen.includes('cacheNotice') &&
      mapScreen.includes('מוצגים בתי כנסת מהמטמון האחרון') === false &&
      mapScreen.includes('{cacheNotice}'),
  );

  const synagogueSheetSrc = read('src/components/map/MapSynagogueSheet.tsx');
  record(
    'map: synagogue fetch error is distinct from Google tile failure',
    synagogueSheetSrc.includes('OpenStreetMap (Overpass)') &&
      mapScreen.includes('אריחי Google Maps') &&
      mapScreen.includes('map_tiles_timed_out') &&
      mapScreen.includes('map_tiles_loaded'),
  );

  record(
    'synagogues: overpass uses passed coordinates',
    useSynagogues.includes('getNearbySynagogues(coords, radiusMeters)') &&
      useSynagogues.includes('latitude: coords.latitude'),
  );

  record(
    'diagnostics: map section exists',
    diagnosticsScreen.includes('Section title="Map"') &&
      diagnosticsScreen.includes('Location source') &&
      diagnosticsScreen.includes('Overpass center source'),
  );

  record(
    'diagnostics store: map snapshot exists',
    diagnosticsStore.includes('setMapDiagnostics') &&
      diagnosticsTypes.includes('MapDiagnosticsSnapshot'),
  );

  record(
    'dev override remains independent',
    devLocationOverride.includes("source: 'DEV_OVERRIDE'") &&
      locationNative.includes('resolveDevOverrideLocation'),
  );

  record(
    'web: fallback remains explicit',
    locationWeb.includes("source: 'FALLBACK'") &&
      locationWeb.includes('DEV_PREVIEW_DEFAULT_COORDINATES'),
  );

  record(
    'web: watchLocation uses the browser watch API',
    locationWeb.includes('navigator.geolocation.watchPosition') &&
      locationWeb.includes('clearWatch'),
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
