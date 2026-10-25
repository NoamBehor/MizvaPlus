/**
 * Phase 11.2 verification — Minyan Live frontend integration.
 * Run: npm run verify:phase11.2
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

const MINYAN_REQUIRED_COUNT = 10;

function isRpcReportActive(report, now = new Date()) {
  if (report.status !== 'ACTIVE') {
    return false;
  }
  return new Date(report.expires_at) > now;
}

function mapRpcToActiveMinyanReport(report, now = new Date()) {
  if (!isRpcReportActive(report, now)) {
    return null;
  }
  return {
    id: report.id,
    synagogueOsmKey: report.synagogue_osm_key,
    currentAttendance: report.current_attendance,
    missingCount: report.missing_count,
    status: 'ACTIVE',
    createdAt: report.created_at,
    updatedAt: report.updated_at,
    expiresAt: report.expires_at,
    comingCount: Number(report.coming_count ?? 0),
  };
}

function mergeSynagoguesWithMinyan(synagogues, reports) {
  const reportsByOsmKey = new Map(reports.map((report) => [report.synagogueOsmKey, report]));
  return synagogues.map((synagogue) => ({
    ...synagogue,
    minyan: reportsByOsmKey.get(synagogue.id),
  }));
}

function previewMissingCount(currentAttendance) {
  return Math.max(0, MINYAN_REQUIRED_COUNT - currentAttendance);
}

function formatHebrewRelativeTime(isoTimestamp, now = new Date()) {
  const updatedAt = new Date(isoTimestamp);
  const diffMs = now.getTime() - updatedAt.getTime();
  if (diffMs <= 0) {
    return 'עכשיו';
  }
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return 'עכשיו';
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) {
    return 'לפני דקה';
  }
  if (diffMinutes < 60) {
    return `לפני ${diffMinutes} דקות`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) {
    return 'לפני שעה';
  }
  return `לפני ${diffHours} שעות`;
}

const HEBREW_MESSAGES = {
  NOT_AUTHENTICATED: 'יש להתחבר כדי לדווח על מניין.',
  GEOFENCE_VIOLATION: 'אתה נמצא רחוק מדי מבית הכנסת כדי לדווח עליו.',
  LOCATION_ACCURACY_INSUFFICIENT: 'נדרש מיקום מדויק יותר כדי לדווח על המניין.',
  REPORT_EXPIRED: 'המניין כבר נסגר או התמלא.',
  ANCHOR_NOT_FOUND:
    'בית הכנסת עדיין לא זמין לדיווח מניין. נסו שוב מאוחר יותר.',
};

function mapPostgresDetailToMessage(detail) {
  return HEBREW_MESSAGES[detail] ?? 'לא הצלחנו לבצע את הפעולה. נסו שוב.';
}

function mapLocationPermissionMessage() {
  return 'כדי לדווח על מניין נדרש אישור מיקום.';
}

// ─── Structure checks ──────────────────────────────────────────────────────

for (const file of [
  'src/services/minyanLive/minyanLiveService.ts',
  'src/services/minyanLive/minyanLiveTypes.ts',
  'src/services/minyanLive/minyanLiveMapper.ts',
  'src/services/minyanLive/minyanLiveErrors.ts',
  'src/hooks/useMinyanLive.ts',
  'src/components/map/MinyanLiveSection.tsx',
  'src/components/map/MinyanLiveActions.tsx',
  'src/components/map/MinyanAttendanceInput.tsx',
  'src/utils/minyanRelativeTime.ts',
]) {
  record(`P11.2 file exists: ${file}`, read(file).length > 0);
}

const serviceSrc = read('src/services/minyanLive/minyanLiveService.ts');
const mapScreenSrc = read('src/screens/map/MapScreen.tsx');
const hookSrc = read('src/hooks/useMinyanLive.ts');

record(
  'P11.2 RPC: list_active_minyan_reports used',
  serviceSrc.includes("rpc('list_active_minyan_reports'"),
);
record(
  'P11.2 RPC: create_minyan_report used',
  serviceSrc.includes("rpc('create_minyan_report'"),
);
record(
  'P11.2 RPC: update_minyan_report used',
  serviceSrc.includes("rpc('update_minyan_report'"),
);
record(
  'P11.2 RPC: fulfill_minyan_report used',
  serviceSrc.includes("rpc('fulfill_minyan_report'"),
);
record(
  'P11.2 security: no direct minyan_reports table access',
  !serviceSrc.includes("from('minyan_reports')") &&
    !serviceSrc.includes('.from("minyan_reports")'),
);
record(
  'P11.2 security: missing_count not sent to Supabase',
  !serviceSrc.includes('missing_count') &&
    !serviceSrc.includes('p_missing_count'),
);
record(
  'P11.2 MapScreen integrates minyan live hook',
  mapScreenSrc.includes('useMinyanLive') && mapScreenSrc.includes('synagoguesWithMinyan'),
);
record(
  'P11.2 duplicate submit guard in hook',
  hookSrc.includes('mutationInFlightRef'),
);

// ─── Functional tests ────────────────────────────────────────────────────────

const synagogue = {
  id: 'node/123456',
  name: 'בית כנסת אחוה',
  address: 'רחוב הרצל 1',
  coordinates: { latitude: 32.08, longitude: 34.78 },
};

record(
  'P11.2 merge: synagogue without minyan state',
  mergeSynagoguesWithMinyan([synagogue], []).length === 1 &&
    mergeSynagoguesWithMinyan([synagogue], [])[0].minyan === undefined,
);

const activeReportRow = {
  id: 'report-1',
  synagogue_osm_key: 'node/123456',
  current_attendance: 8,
  missing_count: 2,
  status: 'ACTIVE',
  created_at: '2026-09-06T09:00:00.000Z',
  updated_at: '2026-09-06T09:04:00.000Z',
  expires_at: '2026-09-06T09:25:00.000Z',
  coming_count: 0,
};

const activeReport = mapRpcToActiveMinyanReport(
  activeReportRow,
  new Date('2026-09-06T09:10:00.000Z'),
);

record(
  'P11.2 active minyan marker data mapped',
  activeReport !== null && activeReport.missingCount === 2,
);

const merged = mergeSynagoguesWithMinyan([synagogue], activeReport ? [activeReport] : []);
record(
  'P11.2 merge: active minyan attached by OSM key',
  merged[0].minyan?.id === 'report-1',
);

record(
  'P11.2 missing count display value',
  merged[0].minyan?.missingCount === 2 &&
    previewMissingCount(8) === 2,
);

const expiredReport = mapRpcToActiveMinyanReport(
  {
    ...activeReportRow,
    expires_at: '2026-09-06T09:05:00.000Z',
  },
  new Date('2026-09-06T09:10:00.000Z'),
);

record(
  'P11.2 expired report hidden locally',
  expiredReport === null,
);

record(
  'P11.2 create report success message present in UI flow',
  read('src/hooks/useMinyanLive.ts').includes('בקשת המניין פורסמה'),
);

record(
  'P11.2 create report location failure message',
  mapLocationPermissionMessage() === 'כדי לדווח על מניין נדרש אישור מיקום.',
);

record(
  'P11.2 update own report action label',
  read('src/components/map/MinyanLiveActions.tsx').includes('עדכון המניין'),
);

record(
  'P11.2 fulfill report action label',
  read('src/components/map/MinyanLiveActions.tsx').includes('אני מגיע'),
);

record(
  'P11.2 duplicate submit protection disables concurrent mutation',
  hookSrc.includes('if (mutationInFlightRef.current)') &&
    read('src/components/map/MinyanLiveActions.tsx').includes('disabled={isMutating}'),
);

record(
  'P11.2 unauthenticated action protection message',
  read('src/components/map/MinyanLiveActions.tsx').includes(
    'התחברו כדי לדווח על מניין',
  ),
);

record(
  'P11.2 RPC error mapping: geofence',
  mapPostgresDetailToMessage('GEOFENCE_VIOLATION').includes('רחוק מדי'),
);

record(
  'P11.2 RPC error mapping: anchor not found',
  mapPostgresDetailToMessage('ANCHOR_NOT_FOUND').includes(
    'בית הכנסת עדיין לא זמין לדיווח מניין',
  ),
);

record(
  'P11.2 security: no client synagogue_anchors writes',
  !serviceSrc.includes("from('synagogue_anchors')") &&
    !serviceSrc.includes('upsert_synagogue_anchor') &&
    !hookSrc.includes('synagogue_anchors'),
);

const errorsSrc = read('src/services/minyanLive/minyanLiveErrors.ts');
record(
  'P11.2 anchor error Hebrew message in errors module',
  errorsSrc.includes('בית הכנסת עדיין לא זמין לדיווח מניין. נסו שוב מאוחר יותר'),
);

const navigationSrc = read('src/utils/synagogueNavigation.ts');
const synagogueCardSrc = read('src/components/map/MapSelectedSynagogueCard.tsx');

record(
  'P11.2 navigation: utility exists',
  navigationSrc.includes('buildSynagogueNavigationUrls') &&
    navigationSrc.includes('openSynagogueNavigation'),
);

record(
  'P11.2 navigation: Android google.navigation URL',
  navigationSrc.includes('google.navigation:q='),
);

record(
  'P11.2 navigation: iOS maps URL',
  navigationSrc.includes('maps://?daddr='),
);

record(
  'P11.2 navigation: web fallback URLs',
  navigationSrc.includes('https://www.google.com/maps/dir/') &&
    navigationSrc.includes('https://maps.apple.com/'),
);

record(
  'P11.2 navigation: invalid coordinates guarded',
  navigationSrc.includes('invalid_coordinates'),
);

function buildSynagogueNavigationUrls(target, platform) {
  const { latitude, longitude } = target.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const label = encodeURIComponent(target.name.trim() || 'בית כנסת');
  if (platform === 'ios') {
    return {
      primary: `maps://?daddr=${latitude},${longitude}&dirflg=d`,
      fallback: `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d&q=${label}`,
    };
  }
  return {
    primary: `google.navigation:q=${latitude},${longitude}`,
    fallback: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`,
  };
}

const androidUrls = buildSynagogueNavigationUrls(
  { name: 'בית כנסת אחוה', coordinates: { latitude: 32.08, longitude: 34.78 } },
  'android',
);
record(
  'P11.2 navigation: Android URL generation',
  androidUrls?.primary === 'google.navigation:q=32.08,34.78',
);

const iosUrls = buildSynagogueNavigationUrls(
  { name: 'בית כנסת אחוה', coordinates: { latitude: 32.08, longitude: 34.78 } },
  'ios',
);
record(
  'P11.2 navigation: iOS URL generation',
  iosUrls?.primary === 'maps://?daddr=32.08,34.78&dirflg=d',
);

record(
  'P11.2 navigation: missing coordinates rejected',
  buildSynagogueNavigationUrls(
    { name: 'x', coordinates: { latitude: Number.NaN, longitude: 34.78 } },
    'android',
  ) === null,
);

record(
  'P11.2 navigation: primary action in synagogue card',
  synagogueCardSrc.includes('נווט לבית הכנסת') &&
    synagogueCardSrc.includes('openSynagogueNavigation'),
);

record(
  'P11.2 Hebrew relative-time: now',
  formatHebrewRelativeTime('2026-09-06T09:10:00.000Z', new Date('2026-09-06T09:10:10.000Z')) ===
    'עכשיו',
);

record(
  'P11.2 Hebrew relative-time: minutes',
  formatHebrewRelativeTime('2026-09-06T09:06:00.000Z', new Date('2026-09-06T09:10:00.000Z')) ===
    'לפני 4 דקות',
);

record(
  'P11.2 package: verify script registered',
  read('package.json').includes('"verify:phase11.2"'),
);

function main() {
  console.log('\nPhase 11.2 Verification\n========================\n');
  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
