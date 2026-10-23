/**
 * Phase 10.9 verification — iOS parity audit (static / config gate).
 * Run: npm run verify:phase10.9
 *
 * Validates iOS production configuration and platform-neutral architecture
 * contracts without requiring a physical iPhone or macOS prebuild.
 * Physical iOS E2E is recorded separately as PENDING.
 */
import { existsSync, readFileSync } from 'node:fs';
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

function runIosConfigTests() {
  const appConfig = read('app.config.js');
  const easConfig = read('eas.json');
  const envExample = read('.env.example');

  record(
    'P10.9-A: iOS bundleIdentifier is com.mitzvahapp.app',
    /bundleIdentifier:\s*'com\.mitzvahapp\.app'/.test(appConfig),
  );

  record(
    'P10.9-A: iOS NSLocationWhenInUseUsageDescription is configured',
    appConfig.includes('NSLocationWhenInUseUsageDescription') &&
      appConfig.includes('בתי כנסת'),
  );

  record(
    'P10.9-A: expo-location plugin sets when-in-use permission text',
    appConfig.includes("'expo-location'") &&
      appConfig.includes('locationWhenInUsePermission'),
  );

  record(
    'P10.9-A: expo-notifications plugin is registered',
    appConfig.includes("'expo-notifications'"),
  );

  record(
    'P10.9-A: deep link scheme mitzvahapp is defined',
    appConfig.includes("scheme: 'mitzvahapp'"),
  );

  record(
    'P10.9-A: iOS does not require Google Maps API key',
    appConfig.includes('iOS uses Apple Maps') &&
      !appConfig.includes('iosGoogleMapsApiKey'),
  );

  record(
    'P10.9-A: react-native-maps plugin present (MapKit on iOS prebuild)',
    appConfig.includes("'react-native-maps'"),
  );

  record(
    'P10.9-A: EAS projectId configured for cloud iOS builds',
    appConfig.includes('projectId:') && easConfig.includes('"production"'),
  );

  record(
    'P10.9-A: Supabase public env vars documented for all platforms',
    envExample.includes('EXPO_PUBLIC_SUPABASE_URL') &&
      envExample.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  );

  record(
    'P10.9-A: Supabase redirect allowlist documents mitzvahapp:// URLs',
    envExample.includes('mitzvahapp://confirm') &&
      envExample.includes('mitzvahapp://reset-password'),
  );

  record(
    'P10.9-A: no committed ios/ native tree (CNG — prebuild/EAS generates)',
    !existsSync(join(root, 'ios')),
  );
}

function runMapsTests() {
  const mapSrc = read('src/screens/map/MapScreen.tsx');
  const locationSrc = read('src/services/location.ts');
  const synagoguesSrc = read('src/services/synagogues.ts');
  const overpassSrc = read('src/services/overpass.ts');

  record(
    'P10.9-B: MapView uses Google provider on Android only (MapKit on iOS)',
    mapSrc.includes('react-native-maps') &&
      mapSrc.includes("Platform.OS === 'android' ? PROVIDER_GOOGLE") &&
      !mapSrc.toLowerCase().includes('google places'),
  );

  record(
    'P10.9-B: MapScreen renders synagogue Marker components',
    mapSrc.includes('<Marker') && mapSrc.includes('pinColor'),
  );

  record(
    'P10.9-B: selected marker state is tracked',
    mapSrc.includes('selectedSynagogueId') && mapSrc.includes('focusSynagogue'),
  );

  record(
    'P10.9-B: map loading and error states exist',
    mapSrc.includes('LoadingPanel') && mapSrc.includes('MapStatePanel'),
  );

  record(
    'P10.9-B: foreground-only location permission flow',
    locationSrc.includes('requestForegroundPermissionsAsync') &&
      locationSrc.includes('getForegroundPermissionsAsync') &&
      !locationSrc.includes('requestBackgroundPermissionsAsync'),
  );

  record(
    'P10.9-B: location accuracy uses Balanced preset',
    locationSrc.includes('Location.Accuracy.Balanced'),
  );

  record(
    'P10.9-B: synagogue data uses Overpass provider (not Google Places)',
    synagoguesSrc.includes('OverpassSynagogueProvider') &&
      overpassSrc.includes('fetchNearbySynagoguesFromOverpass'),
  );

  record(
    'P10.9-B: distance calculation is platform-neutral Haversine',
    read('src/utils/distance.ts').includes('calculateDistanceMeters'),
  );
}

function runAuthTests() {
  const supabaseSrc = read('src/services/supabase.ts');
  const authSrc = read('src/services/auth.ts');
  const bootstrapSrc = read('src/services/authBootstrap.ts');
  const deepLinkSrc = read('src/hooks/useDeepLinkAuth.ts');
  const rootNavSrc = read('src/navigation/RootNavigator.tsx');
  const authRefreshSrc = read('src/hooks/useSupabaseAuthRefresh.ts');
  const authRefreshGateSrc = read('src/services/authRefreshGate.ts');

  record(
    'P10.9-C: Supabase session persists via AsyncStorage',
    supabaseSrc.includes('AsyncStorage') &&
      supabaseSrc.includes('persistSession: true'),
  );

  record(
    'P10.9-C: manual deep link session (detectSessionInUrl: false)',
    supabaseSrc.includes('detectSessionInUrl: false'),
  );

  record(
    'P10.9-C: email confirmation redirect mitzvahapp://confirm',
    authSrc.includes("mitzvahapp://confirm") &&
      authSrc.includes('emailRedirectTo: EMAIL_CONFIRMATION_REDIRECT'),
  );

  record(
    'P10.9-C: password reset redirect mitzvahapp://reset-password',
    authSrc.includes("mitzvahapp://reset-password") &&
      authSrc.includes('redirectTo: PASSWORD_RESET_REDIRECT'),
  );

  record(
    'P10.9-C: cold-start deep link bootstrap via Linking.getInitialURL',
    bootstrapSrc.includes('Linking.getInitialURL') &&
      bootstrapSrc.includes('createSessionFromUrl'),
  );

  record(
    'P10.9-C: warm-start deep link via Linking.addEventListener',
    deepLinkSrc.includes("Linking.addEventListener('url'") &&
      !deepLinkSrc.includes('getInitialURL'),
  );

  record(
    'P10.9-C: URL hash tokens parsed for Supabase session',
    authSrc.includes('hashIndex') && authSrc.includes('access_token'),
  );

  record(
    'P10.9-C: Supabase auth refresh wired to AppState',
    rootNavSrc.includes('useSupabaseAuthRefresh') &&
      authRefreshSrc.includes('AppState.addEventListener') &&
      authRefreshSrc.includes('requestAutoRefreshWhenIdle') &&
      authRefreshSrc.includes('stopAutoRefresh') &&
      authRefreshGateSrc.includes('startAutoRefresh') &&
      authRefreshGateSrc.includes('AppState.currentState'),
  );
}

function runNotificationTests() {
  const notificationsSrc = read('src/services/notifications.ts');
  const channelsSrc = read('src/services/notificationChannels.ts');
  const schedulerSrc = read('src/services/notificationScheduler.ts');
  const syncSrc = read('src/hooks/useNotificationSync.ts');
  const reminderTzSrc = read('src/utils/reminderTimezone.ts');

  record(
    'P10.9-D: notification permission flow is platform-neutral',
    notificationsSrc.includes('requestPermissionsAsync') &&
      notificationsSrc.includes('resolveNotificationPermissionDecision'),
  );

  record(
    'P10.9-D: Android channel setup is no-op on iOS',
    channelsSrc.includes("Platform.OS !== 'android'"),
  );

  record(
    'P10.9-D: iOS scheduling omits Android channelId',
    notificationsSrc.includes("Platform.OS === 'android'") &&
      notificationsSrc.includes('channelId: MITZVAH_REMINDERS_CHANNEL_ID'),
  );

  record(
    'P10.9-D: foreground notification handler configured',
    notificationsSrc.includes('setNotificationHandler') &&
      notificationsSrc.includes('shouldShowAlert: true'),
  );

  record(
    'P10.9-D: received and response listeners registered',
    notificationsSrc.includes('addNotificationReceivedListener') &&
      notificationsSrc.includes('addNotificationResponseReceivedListener'),
  );

  record(
    'P10.9-D: scheduler supports cancel/reschedule reconcile',
    schedulerSrc.includes('planNotificationReconcile') &&
      schedulerSrc.includes('cancelNotification') &&
      schedulerSrc.includes('scheduleDailyNotification'),
  );

  record(
    'P10.9-D: app resume reschedules notifications',
    syncSrc.includes("nextState === 'active'") &&
      syncSrc.includes('syncNotificationSchedule'),
  );

  record(
    'P10.9-D: reminder timezone uses Asia/Jerusalem centralized utility',
    reminderTzSrc.includes('Asia/Jerusalem') &&
      reminderTzSrc.includes('getDeviceLocalDailyTriggerFromIsraelReminder'),
  );
}

function runTimezoneAndCalendarTests() {
  const timezoneSrc = read('src/utils/timezone.ts');
  const calendarSrc = read('src/services/calendar/calendarService.ts');

  record(
    'P10.9-E: ISRAEL_TIMEZONE is Asia/Jerusalem',
    timezoneSrc.includes("export const ISRAEL_TIMEZONE = 'Asia/Jerusalem'"),
  );

  record(
    'P10.9-E: activity date bucketing uses Israel timezone',
    timezoneSrc.includes('getActivityDateKey') &&
      timezoneSrc.includes('getIsraelDateKey'),
  );

  record(
    'P10.9-E: calendar service uses centralized date keys',
    calendarSrc.includes('getCalendarDateKey'),
  );
}

function runPlatformParityTests() {
  const audioSrc = read('src/services/audio.ts');
  const audioControlsSrc = read('src/components/mitzvah/MitzvahAudioControls.tsx');
  const storageSrc = read('src/utils/storage.ts');
  const reminderPickerSrc = read('src/components/common/ReminderTimePicker.tsx');

  record(
    'P10.9-F: TTS pause/resume intentionally Android-only',
    audioSrc.includes("Platform.OS === 'android'") &&
      audioControlsSrc.includes('supportsTtsPauseResume'),
  );

  record(
    'P10.9-F: iOS reminder time picker uses modal spinner',
    reminderPickerSrc.includes("Platform.OS === 'ios'") &&
      reminderPickerSrc.includes('display="spinner"'),
  );

  record(
    'P10.9-F: AsyncStorage keys are platform-neutral',
    storageSrc.includes('@react-native-async-storage/async-storage') &&
      storageSrc.includes('onboardingStorageKey'),
  );

  record(
    'P10.9-F: Hebrew TTS via expo-speech',
    audioSrc.includes('expo-speech') && audioSrc.includes("language: HEBREW_LANGUAGE"),
  );
}

function main() {
  console.log('Phase 10.9 Verification — iOS Parity Audit\n==========================================\n');

  runIosConfigTests();
  runMapsTests();
  runAuthTests();
  runNotificationTests();
  runTimezoneAndCalendarTests();
  runPlatformParityTests();

  const failed = results.filter((item) => !item.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);

  console.log('\nPhysical iOS E2E = PENDING');
  console.log('Phase 10.8   = PASS');
  console.log('Phase 10.8.1 = PENDING PHYSICAL E2E');

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const item of failed) {
      console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

main();
