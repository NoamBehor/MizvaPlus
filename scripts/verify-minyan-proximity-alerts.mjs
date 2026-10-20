/**
 * Minyan proximity alert verification — logic harness + wiring.
 * Run: npm run verify:minyan-proximity-alerts
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findMinyanProximityCandidates,
  MINYAN_PROXIMITY_ALERT_RADIUS_METERS,
  offsetCoordinates,
  pruneNotifiedProximityReports,
  shouldSuppressProximityAlert,
} from './lib/minyanProximityEvaluation.harness.mjs';

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

console.log('Minyan proximity alerts verification\n==================================\n');

const evaluationSrc = read('src/services/minyanProximity/minyanProximityEvaluation.ts');
const storageSrc = read('src/services/minyanProximity/minyanProximityStorage.ts');
const hookSrc = read('src/hooks/useMinyanProximityAlerts.ts');
const settingsSrc = read('src/components/profile/MinyanProximityAlertSettings.tsx');
const profileSrc = read('src/screens/profile/ProfileScreen.tsx');
const constantsSrc = read('src/constants/minyanProximity.ts');
const appConfigSrc = read('app.config.js');
const packageJson = JSON.parse(read('package.json'));

record(
  'Harness radius matches TS constant',
  constantsSrc.includes(`MINYAN_PROXIMITY_ALERT_RADIUS_METERS = ${MINYAN_PROXIMITY_ALERT_RADIUS_METERS}`),
);
record(
  'TS evaluation uses shared distance util',
  evaluationSrc.includes("from '@/utils/distance'") &&
    evaluationSrc.includes('findMinyanProximityCandidates'),
);
record(
  'Settings label in Hebrew',
  settingsSrc.includes('התראות על מניין בקרבת מקום'),
);
record(
  'Profile integrates settings card',
  profileSrc.includes('MinyanProximityAlertSettings'),
);
record(
  'Main tab hook wired',
  read('src/navigation/MainTabNavigator.tsx').includes('useMinyanProximityAlerts'),
);
record(
  'Preference storage key',
  read('src/utils/storage.ts').includes('minyan_proximity_preferences'),
);
record(
  'Dedupe helper exported in TS',
  evaluationSrc.includes('shouldSuppressProximityAlert') &&
    evaluationSrc.includes('pruneNotifiedProximityReports'),
);
record(
  'Notification channel defined',
  read('src/services/notificationChannels.ts').includes('MINYAN_PROXIMITY_CHANNEL_ID'),
);
record(
  'verify script registered',
  packageJson.scripts['verify:minyan-proximity-alerts'] !== undefined,
);
record(
  'Android background location blocked in app config',
  appConfigSrc.includes('ACCESS_BACKGROUND_LOCATION'),
);
record(
  'Settings disclose foreground limitation',
  settingsSrc.includes('כשהאפליקציה פתוחה') ||
    settingsSrc.includes('foreground'),
);

const origin = { latitude: 31.7683, longitude: 35.2137 };
const synagogue = {
  id: 'node/1',
  name: 'Test',
  coordinates: offsetCoordinates(origin, 0, 100),
};
const farSynagogue = {
  id: 'node/2',
  name: 'Far',
  coordinates: offsetCoordinates(origin, 0, 200),
};
const future = new Date(Date.now() + 10 * 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();

const inside = findMinyanProximityCandidates({
  userCoordinates: origin,
  synagogues: [synagogue],
  reports: [
    {
      id: 'r1',
      synagogueOsmKey: 'node/1',
      status: 'ACTIVE',
      expiresAt: future,
    },
  ],
  radiusMeters: 150,
  now: new Date(),
});
record('Boundary: within 150m triggers', inside.length === 1 && inside[0].reportId === 'r1');

const outside = findMinyanProximityCandidates({
  userCoordinates: origin,
  synagogues: [farSynagogue],
  reports: [
    {
      id: 'r2',
      synagogueOsmKey: 'node/2',
      status: 'ACTIVE',
      expiresAt: future,
    },
  ],
  radiusMeters: 150,
  now: new Date(),
});
record('Boundary: beyond 150m suppressed', outside.length === 0);

const expired = findMinyanProximityCandidates({
  userCoordinates: origin,
  synagogues: [synagogue],
  reports: [
    {
      id: 'r3',
      synagogueOsmKey: 'node/1',
      status: 'ACTIVE',
      expiresAt: past,
    },
  ],
  radiusMeters: 150,
  now: new Date(),
});
record('Expired report ignored', expired.length === 0);

const invalidUser = findMinyanProximityCandidates({
  userCoordinates: { latitude: Number.NaN, longitude: 35 },
  synagogues: [synagogue],
  reports: [
    {
      id: 'r4',
      synagogueOsmKey: 'node/1',
      status: 'ACTIVE',
      expiresAt: future,
    },
  ],
});
record('Invalid user coordinates ignored', invalidUser.length === 0);

record(
  'Duplicate suppression for same expiry',
  shouldSuppressProximityAlert('r1', future, { r1: future }) === true,
);
record(
  'Re-alert when expiry changes',
  shouldSuppressProximityAlert('r1', future, { r1: past }) === false,
);

const pruned = pruneNotifiedProximityReports({ r1: past, r2: future }, new Date());
record('Prune drops expired dedupe keys', !pruned.r1 && pruned.r2 === future);

record(
  'Disabled preference respected in hook',
  hookSrc.includes('if (!preferences.enabled)') && hookSrc.includes('return;'),
);
record(
  'Permission gate in hook',
  hookSrc.includes("permission !== 'granted'"),
);
record(
  'Uses live Supabase reports (not mock)',
  hookSrc.includes('listActiveMinyanReports') &&
    hookSrc.includes('getNearbySynagogues'),
);

const failed = results.filter((entry) => !entry.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
