/**
 * Nearest synagogue screen redesign — presentation and eligibility checks.
 * Run: npm run verify:map-redesign
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

const MINYAN_MAX_REPORT_RADIUS_METERS = 120;
const MINYAN_MAX_GPS_ACCURACY_METERS = 50;
const MINYAN_ACCURACY_CAP_METERS = 30;
const MINYAN_EFFECTIVE_RADIUS_MAX_METERS =
  MINYAN_MAX_REPORT_RADIUS_METERS + MINYAN_ACCURACY_CAP_METERS;

function getMinyanReportEligibility({ location, distanceMeters }) {
  if (!location || location.source === 'UNAVAILABLE') {
    return { canAttempt: false, reason: 'unavailable' };
  }
  if (location.source === 'FALLBACK') {
    return { canAttempt: false, reason: 'fallback' };
  }
  if (
    typeof distanceMeters === 'number' &&
    Number.isFinite(distanceMeters) &&
    distanceMeters > MINYAN_EFFECTIVE_RADIUS_MAX_METERS
  ) {
    return { canAttempt: false, reason: 'too_far' };
  }
  return { canAttempt: true, reason: 'eligible' };
}

function validateMinyanSubmitLocation(location, now = new Date()) {
  if (
    typeof location.accuracy !== 'number' ||
    location.accuracy > MINYAN_MAX_GPS_ACCURACY_METERS
  ) {
    throw new Error('accuracy');
  }
  const ageMs = now.getTime() - location.timestamp;
  if (ageMs > 30_000) {
    throw new Error('stale');
  }
}

function assertFreshLocationForMinyan(location) {
  if (location.source === 'FALLBACK' || location.source === 'UNAVAILABLE') {
    throw new Error('fallback');
  }
  validateMinyanSubmitLocation(location);
}

const constantsSrc = read('src/constants/minyanLive.ts');
const eligibilitySrc = read('src/utils/minyanReportEligibility.ts');
const serviceSrc = read('src/services/minyanLive/minyanLiveService.ts');
const mapScreenSrc = read('src/screens/map/MapScreen.tsx');
const mapScreenWebSrc = read('src/screens/map/MapScreen.web.tsx');
const headerSrc = read('src/components/map/MapScreenHeader.tsx');
const selectedCardSrc = read('src/components/map/MapSelectedSynagogueCard.tsx');
const packageJson = JSON.parse(read('package.json'));

record(
  'constants: report radius is 120',
  constantsSrc.includes('MINYAN_MAX_REPORT_RADIUS_METERS = 120'),
);
record(
  'constants: GPS accuracy ceiling is 50',
  constantsSrc.includes('MINYAN_MAX_GPS_ACCURACY_METERS = 50'),
);
record(
  'constants: accuracy cap is 30',
  constantsSrc.includes('MINYAN_ACCURACY_CAP_METERS = 30'),
);
record(
  'eligibility helper uses effective 150m max',
  eligibilitySrc.includes('MINYAN_EFFECTIVE_RADIUS_MAX_METERS'),
);
record(
  'eligibility helper disables FALLBACK',
  eligibilitySrc.includes("location.source === 'FALLBACK'"),
);
record(
  'submit still fetches fresh GPS',
  serviceSrc.includes('getFreshLocationForMinyan') &&
    serviceSrc.includes('validateMinyanSubmitLocation') &&
    mapScreenSrc.includes('useMinyanLive'),
);
record(
  'submit still rejects FALLBACK',
  serviceSrc.includes("location.source === 'FALLBACK'") &&
    serviceSrc.includes("location.source === 'UNAVAILABLE'"),
);
record(
  'submit still rejects accuracy worse than 50',
  serviceSrc.includes('MINYAN_MAX_GPS_ACCURACY_METERS'),
);

const gpsLocation = {
  source: 'GPS',
  accuracy: 12,
  timestamp: Date.now(),
  coordinates: { latitude: 32.17, longitude: 35.0 },
};

record(
  'eligibility: fallback disabled',
  getMinyanReportEligibility({
    location: { ...gpsLocation, source: 'FALLBACK' },
    distanceMeters: 20,
  }).canAttempt === false,
);

record(
  'eligibility: 151m disabled',
  getMinyanReportEligibility({ location: gpsLocation, distanceMeters: 151 })
    .canAttempt === false,
);

record(
  'eligibility: 100m GPS allowed',
  getMinyanReportEligibility({ location: gpsLocation, distanceMeters: 100 })
    .canAttempt === true,
);

let accuracyRejected = false;
try {
  validateMinyanSubmitLocation({ ...gpsLocation, accuracy: 51 });
} catch {
  accuracyRejected = true;
}
record('validateMinyanSubmitLocation rejects accuracy 51', accuracyRejected);

let fallbackRejected = false;
try {
  assertFreshLocationForMinyan({ ...gpsLocation, source: 'FALLBACK' });
} catch {
  fallbackRejected = true;
}
record('fresh location still rejects FALLBACK', fallbackRejected);

record(
  'layout: auto-select nearest helper used',
  mapScreenSrc.includes('resolveSelectedSynagogueId'),
);
record(
  'layout: collapsing map stays visible',
  mapScreenSrc.includes('useCollapsingMapHeight') &&
    mapScreenSrc.includes('Animated.ScrollView') &&
    read('src/hooks/useCollapsingMapHeight.ts').includes('MAP_COLLAPSED_HEIGHT') &&
    read('src/hooks/useCollapsingMapHeight.ts').includes('overflow: \'hidden\''),
);
record(
  'layout: synagogue list below map',
  mapScreenSrc.includes('MapSynagogueSheet') &&
    !mapScreenSrc.includes('MapFloatingControls'),
);
record(
  'layout: header has a small manual refresh control',
  headerSrc.includes('onRefreshLocation') &&
    headerSrc.includes('רענון מיקום ובתי כנסת') &&
    headerSrc.includes("name=\"refresh\"") &&
    mapScreenSrc.includes('handleManualRefresh') &&
    mapScreenSrc.includes('onRefreshLocation'),
);
record(
  'layout: five nearest plus minyan shortages',
  read('src/utils/mapSynagogues.ts').includes('MAP_NEAREST_LIMIT = 5') &&
    read('src/utils/mapSynagogues.ts').includes('takeMapDisplaySynagogues') &&
    mapScreenSrc.includes('takeMapDisplaySynagogues') &&
    mapScreenSrc.includes('resolveDisplayedSynagogues') &&
    mapScreenSrc.includes('displayedSynagogues'),
);
record(
  'layout: synagogue search is locked to the session',
  read('src/services/map/synagogueSearchSession.ts').includes(
    'getOrLockSearchCoordinates',
  ) &&
    read('src/services/map/synagogueSearchSession.ts').includes(
      'relockSearchCoordinates',
    ) &&
    read('src/hooks/useSynagogues.ts').includes('getOrLockSearchCoordinates') &&
    read('src/hooks/useSynagogues.ts').includes('relockSearchCoordinates'),
);
record(
  'layout: selecting a synagogue scrolls back to the map',
  mapScreenSrc.includes('scrollTo({ y: 0, animated: true })') &&
    mapScreenWebSrc.includes('scrollTo({ y: 0, animated: true })') &&
    read('src/hooks/useCollapsingMapHeight.ts').includes('expandMap'),
);
record(
  'layout: web map does not follow GPS ticks',
  mapScreenWebSrc.includes('followUser={false}') &&
    mapScreenWebSrc.includes('recenterNonce') &&
    read('src/components/map/GoogleMapsWebView.web.tsx').includes(
      'centerRef.current.latitude',
    ),
);
record(
  'layout: map tab watches GPS',
  mapScreenSrc.includes('useUserLocation({ watch: true })') &&
    read('src/hooks/useUserLocation.ts').includes('watchLocation'),
);
record(
  'layout: gold missing-minyan pin',
  read('src/utils/mapSynagogues.ts').includes('colors.goldDeep') &&
    read('src/utils/mapSynagogues.ts').includes('missingCount > 0') &&
    read('src/components/map/SynagogueListCard.tsx').includes('colors.goldDeep') &&
    selectedCardSrc.includes('colors.goldDeep'),
);
record(
  'layout: client minyan filter chips',
  headerSrc.includes('MapFilterChips') && mapScreenSrc.includes('synagogueFilter'),
);
record(
  'navigation action remains on selected card',
  selectedCardSrc.includes('נווט לבית הכנסת') &&
    selectedCardSrc.includes('openSynagogueNavigation'),
);
record(
  'script registered',
  packageJson.scripts['verify:map-redesign'] ===
    'node scripts/verify-map-redesign.mjs',
);

function synagogueNeedsMinyan(minyan) {
  return Boolean(minyan && minyan.missingCount > 0);
}

function takeNearestSynagogues(synagogues, limit = 5) {
  return [...synagogues]
    .sort(
      (left, right) =>
        (left.distanceMeters ?? Number.POSITIVE_INFINITY) -
        (right.distanceMeters ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, limit);
}

function takeMapDisplaySynagogues(synagogues, limit = 5) {
  const nearest = takeNearestSynagogues(synagogues, limit);
  const needsMinyan = synagogues.filter((synagogue) =>
    synagogueNeedsMinyan(synagogue.minyan),
  );
  const byId = new Map();
  for (const synagogue of [...nearest, ...needsMinyan]) {
    byId.set(synagogue.id, synagogue);
  }
  return [...byId.values()].sort(
    (left, right) =>
      (left.distanceMeters ?? Number.POSITIVE_INFINITY) -
      (right.distanceMeters ?? Number.POSITIVE_INFINITY),
  );
}

const sampleSynagogues = [
  { id: 'a', distanceMeters: 10 },
  { id: 'b', distanceMeters: 20 },
  { id: 'c', distanceMeters: 30 },
  { id: 'd', distanceMeters: 40 },
  { id: 'e', distanceMeters: 50 },
  { id: 'f', distanceMeters: 60 },
  {
    id: 'far-minyan',
    distanceMeters: 900,
    minyan: { missingCount: 3 },
  },
];
const displayed = takeMapDisplaySynagogues(sampleSynagogues);

record(
  'display union keeps five nearest plus far minyan shortage',
  displayed.length === 6 &&
    displayed.some((synagogue) => synagogue.id === 'far-minyan') &&
    !displayed.some((synagogue) => synagogue.id === 'f'),
);

record(
  'display union ignores a full minyan farther than the nearest five',
  takeMapDisplaySynagogues([
    ...sampleSynagogues,
    { id: 'far-full', distanceMeters: 1200, minyan: { missingCount: 0 } },
  ]).every((synagogue) => synagogue.id !== 'far-full'),
);

function main() {
  console.log('\nMap redesign verification\n=========================\n');
  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
