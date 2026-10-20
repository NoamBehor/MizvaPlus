/**
 * Development preview / desktop web verification.
 * Run: npm run verify:dev-preview
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
  console.log('Dev Preview Verification\n========================\n');

  const packageJson = JSON.parse(read('package.json'));
  const appInit = read('src/hooks/useAppInitialization.ts');
  const devPreviewMode = read('src/services/devPreview/isDevPreviewMode.ts');
  const devPreviewData = read('src/services/devPreview/devPreviewData.ts');
  const devPreviewProvider = read('src/services/devPreview/devPreviewProvider.ts');
  const devAuthBypass = read('src/services/auth/devAuthBypass.ts');
  const syncService = read('src/services/cloud/syncService.ts');
  const profileScreen = read('src/screens/profile/ProfileScreen.tsx');
  const diagnosticsScreen = read('src/screens/dev/DiagnosticsScreen.tsx');
  const reportFormatter = read('src/services/diagnostics/reportFormatter.ts');
  const mapScreenNative = read('src/screens/map/MapScreen.tsx');
  const mapScreenWeb = read('src/screens/map/MapScreen.web.tsx');

  record(
    'web: react-dom installed',
    Boolean(packageJson.dependencies['react-dom']),
    packageJson.dependencies['react-dom'] ?? 'missing',
  );
  record(
    'web: react-native-web installed',
    Boolean(packageJson.dependencies['react-native-web']),
    packageJson.dependencies['react-native-web'] ?? 'missing',
  );
  record(
    'script: dev:desktop exists',
    packageJson.scripts['dev:desktop'] === 'expo start --web',
  );
  record(
    'preview: isDevPreviewMode is development-only',
    devPreviewMode.includes('__DEV__') && devPreviewMode.includes("Platform.OS === 'web'"),
  );
  record(
    'preview: no fake JWT/session in provider',
    !devPreviewProvider.match(/access_token|refresh_token|setSession|fake.*jwt/i),
  );
  record(
    'preview: local user key is not a UUID',
    devPreviewData.includes("DEV_PREVIEW_LOCAL_USER_KEY = 'dev-preview-local'"),
  );
  record(
    'preview: does not set authenticated session',
    !devPreviewProvider.includes('setAuthenticated(true)'),
  );
  record(
    'preview: web uses shared ensureDevAnonymousSession bootstrap',
    appInit.includes('ensureDevAnonymousSession()') &&
      appInit.includes('shouldBootstrapDevPreview()'),
  );
  record(
    'preview: web map uses location service and dev override',
    mapScreenWeb.includes('useUserLocation') &&
      mapScreenWeb.includes('resolveSynagogueSearchRadiusMeters') &&
      !mapScreenWeb.includes('מניין Live דורש התחברות'),
  );
  record(
    'preview: profile shows anonymous banner when authenticated on web',
    profileScreen.includes('isDevPreviewMode() && !isAuthenticated'),
  );
  record(
    'preview: bootstrap wired in app initialization',
    appInit.includes('bootstrapDevPreview') && appInit.includes('shouldBootstrapDevPreview'),
  );
  record(
    'preview: home data seeds preferences',
    devPreviewData.includes('DEV_PREVIEW_ENABLED_MITZVAH_IDS'),
  );
  record(
    'preview: my mitzvot demo completions exist',
    devPreviewData.includes('createDevPreviewCompletions'),
  );
  record(
    'preview: calendar uses real location defaults (Jerusalem)',
    devPreviewData.includes('DEV_PREVIEW_DEFAULT_COORDINATES'),
  );
  record(
    'preview: parasha uses existing calendar pipeline',
    !devPreviewData.match(/remote.*parasha|fake.*parasha/i),
  );
  record(
    'preview: mitzvah catalog not duplicated',
    devPreviewData.includes("from '@/constants/mitzvot'") ||
      devPreviewData.includes('MITZVOT_SEED'),
  );
  record(
    'web: native map screen kept for native',
    mapScreenNative.includes("from 'react-native-maps'"),
  );
  record(
    'web: google maps web integration exists',
    mapScreenWeb.includes('GoogleMapsWebView') &&
      mapScreenWeb.includes('loadGoogleMapsWebApi') === false &&
      !mapScreenWeb.includes('react-native-maps') &&
      !mapScreenWeb.includes('תצוגת מפה לפיתוח'),
  );
  record(
    'web: google maps loader is web-only',
    read('src/services/googleMaps/loadGoogleMapsWebApi.ts').includes('importLibrary') &&
      read('src/constants/googleMapsWeb.ts').includes('EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY'),
  );
  record(
    'web: location stub exists',
    read('src/services/location.web.ts').includes('getCurrentLocation'),
  );
  record(
    'web: notifications stub exists',
    read('src/services/notifications.web.ts').includes('scheduleDailyNotification'),
  );
  record(
    'web: audio stub exists',
    read('src/services/audio.web.ts').includes('speakHebrew'),
  );
  record(
    'security: no service-role in preview module',
    !devPreviewProvider.includes('SERVICE_ROLE'),
  );
  record(
    'security: cloud sync skip without session preserved',
    syncService.includes('shouldSkipDevBypassCloudSync'),
  );
  record(
    'profile: preview banner text',
    profileScreen.includes('DEV_PREVIEW_BANNER') &&
      profileScreen.includes('DEV_PREVIEW_AUTH_LABEL'),
  );
  record(
    'diagnostics: web preview runtime labels',
    diagnosticsScreen.includes('DEV_PREVIEW_RUNTIME_LABEL') &&
      reportFormatter.includes('Runtime:'),
  );
  record(
    'production auth: bypass unchanged for native dev',
    devAuthBypass.includes('return __DEV__'),
  );
  record(
    'production auth: preview diagnostics do not weaken RLS',
    !devPreviewProvider.match(/service.role|anon.*write|bypass.*rls/i),
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
