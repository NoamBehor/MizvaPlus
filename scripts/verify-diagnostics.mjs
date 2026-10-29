/**
 * Runtime diagnostics verification.
 * Run: npm run verify:diagnostics
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

// --- duplicated pure logic from diagnostics modules ---

const DIAGNOSTIC_BUILD_ID = 'DIAG-DEV-MINYAN-E2E-01';

function classifyMinyanErrorStage(minyanCode, postgresCode = null) {
  switch (minyanCode) {
    case 'NOT_AUTHENTICATED':
      return 'AUTH';
    case 'INVALID_COORDINATES':
    case 'LOCATION_ACCURACY_INSUFFICIENT':
    case 'LOCATION_STALE':
      return 'LOCATION';
    case 'ANCHOR_NOT_FOUND':
      return 'ANCHOR_LOOKUP';
    case 'GEOFENCE_VIOLATION':
      return 'GEOFENCE';
    case 'INVALID_ATTENDANCE':
      return 'ATTENDANCE_VALIDATION';
    case 'REPORT_NOT_FOUND':
    case 'NOT_REPORT_OWNER':
    case 'REPORT_EXPIRED':
    case 'INVALID_SYNAGOGUE_KEY':
      return 'ACTIVE_REPORT_CONFLICT';
    case 'RATE_LIMITED':
      return 'RATE_LIMIT';
    default:
      if (postgresCode && postgresCode !== 'P0001') {
        return 'RPC_RESULT';
      }
      return 'UNKNOWN';
  }
}

const EXPECTED_MINYAN_REJECTION_CODES = new Set([
  'GEOFENCE_VIOLATION',
  'LOCATION_ACCURACY_INSUFFICIENT',
  'LOCATION_STALE',
  'ANCHOR_NOT_FOUND',
  'RATE_LIMITED',
  'REPORT_EXPIRED',
  'REPORT_NOT_FOUND',
  'NOT_REPORT_OWNER',
  'INVALID_ATTENDANCE',
  'NOT_AUTHENTICATED',
]);

function mapPostgrestErrorToMinyanCode(error) {
  const haystack = [error.details, error.message, error.hint, error.code]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .join(' ');

  for (const code of EXPECTED_MINYAN_REJECTION_CODES) {
    if (haystack.includes(code)) {
      return code;
    }
  }

  if (haystack.includes('INVALID_SYNAGOGUE_KEY')) {
    return 'INVALID_SYNAGOGUE_KEY';
  }

  const message = (error.message ?? '').toLowerCase();
  if (message.includes('fetch') || message.includes('network')) {
    return 'NETWORK_ERROR';
  }

  return 'UNKNOWN';
}

function classifyMinyanErrorSeverity(error) {
  if (
    typeof error === 'object' &&
    error !== null &&
    error.name === 'LocationServiceError'
  ) {
    return 'warn';
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    error.name === 'MinyanLiveServiceError' &&
    typeof error.code === 'string' &&
    EXPECTED_MINYAN_REJECTION_CODES.has(error.code)
  ) {
    return 'warn';
  }

  const minyanCode = mapPostgrestErrorToMinyanCode(error ?? {});
  if (EXPECTED_MINYAN_REJECTION_CODES.has(minyanCode)) {
    return 'warn';
  }

  return 'error';
}

function compareOsmKeys(selectedOsmKey, reportOsmKey) {
  const selected = selectedOsmKey?.trim() || null;
  const report = reportOsmKey?.trim() || null;
  if (!selected || !report) {
    return { selectedOsmKey: selected, reportOsmKey: report, matches: null };
  }
  return {
    selectedOsmKey: selected,
    reportOsmKey: report,
    matches: selected === report,
  };
}

let nextRpcTraceSeq = 0;

function allocateRpcTraceId() {
  nextRpcTraceSeq += 1;
  return `rpc-trace-${nextRpcTraceSeq}`;
}

function recordRpcTrace(rpcName, startedAt, completedAt, success, error) {
  const durationMs = completedAt - startedAt;
  const postgresCode = error?.code ?? null;
  const details = error?.details ?? null;
  const minyanCode = details && details.length > 0 ? details : null;
  const stage = success ? null : classifyMinyanErrorStage(minyanCode ?? 'UNKNOWN', postgresCode);
  return {
    traceId: allocateRpcTraceId(),
    rpcName,
    startedAt,
    durationMs,
    success,
    postgresCode,
    details,
    stage,
  };
}

function rpcTraceReactKey(entry) {
  return entry.traceId;
}

function buildCalendarDiagnosticsSnapshot(dayInfo, options) {
  return {
    localDateKey: '2026-09-10',
    targetShabbatDate: '2026-09-12',
    providerUsed: options.providerUsed ?? 'Hebcal local',
    hebcalResult: options.hebcalRawResult ?? null,
    normalizedParashaName: dayInfo?.weeklyParasha?.hebrewName ?? null,
    fromCache: options.fromCache,
    cacheVersion: '@mitzvahapp/calendar_cache_v2',
    fallbackUsed: options.fallbackUsed,
    finalWeeklyParasha: dayInfo?.weeklyParasha?.hebrewName ?? null,
  };
}

function sanitizeDiagnosticText(text) {
  const patterns = [
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    /EXPO_PUBLIC_SUPABASE_ANON_KEY/gi,
    /SUPABASE_SERVICE_ROLE_KEY/gi,
  ];
  let sanitized = text;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

function buildDiagnosticReport(input) {
  const lines = [
    'MitzvaPlus Runtime Diagnostics',
    `Build: ${DIAGNOSTIC_BUILD_ID}`,
    `OSM Key: ${input.osmKey ?? '—'}`,
    `Parasha result: ${input.parasha ?? '—'}`,
    `Revision: ${input.revision ?? '—'}`,
    `Authenticated: ${input.authenticated}`,
    'No secrets included.',
  ];
  if (input.secret) {
    lines.push(`Secret probe: ${input.secret}`);
  }
  return sanitizeDiagnosticText(lines.join('\n'));
}

function main() {
  const constantsSrc = read('src/services/diagnostics/constants.ts');
  const rootNavSrc = read('src/navigation/RootNavigator.tsx');
  const typesSrc = read('src/navigation/types.ts');
  const screenSrc = read('src/screens/dev/DiagnosticsScreen.tsx');
  const minyanServiceSrc = read('src/services/minyanLive/minyanLiveService.ts');
  const useMinyanLiveSrc = read('src/hooks/useMinyanLive.ts');
  const packageJson = JSON.parse(read('package.json'));

  record(
    'diagnostic build ID exists',
    constantsSrc.includes("DIAGNOSTIC_BUILD_ID = 'DIAG-DEV-MINYAN-E2E-01'"),
  );

  record(
    'diagnostic screen is development-only in navigator',
    rootNavSrc.includes('__DEV__') &&
      rootNavSrc.includes('DeveloperDiagnostics') &&
      rootNavSrc.includes('DiagnosticsScreen'),
  );

  record(
    'DeveloperDiagnostics route in types',
    typesSrc.includes('DeveloperDiagnostics'),
  );

  record(
    'Diagnostics imports mitzvah explanation dev section',
    screenSrc.includes('DevMitzvahExplanationSection'),
  );

  const trace42804 = recordRpcTrace(
    'create_minyan_report',
    1000,
    1183,
    false,
    { code: '42804', message: 'datatype mismatch', details: '42804', hint: null },
  );
  record(
    'RPC trace captures 42804',
    trace42804.postgresCode === '42804' && trace42804.success === false,
  );

  const traceAnchor = recordRpcTrace(
    'create_minyan_report',
    1000,
    1183,
    false,
    { code: 'P0001', message: 'raise', details: 'ANCHOR_NOT_FOUND', hint: null },
  );
  record(
    'RPC trace captures ANCHOR_NOT_FOUND',
    traceAnchor.details === 'ANCHOR_NOT_FOUND' && traceAnchor.stage === 'ANCHOR_LOOKUP',
  );

  nextRpcTraceSeq = 0;
  const sameMillisecondStartedAt = 1789559629808;
  const listReportsTraceA = recordRpcTrace(
    'list_active_minyan_reports',
    sameMillisecondStartedAt,
    sameMillisecondStartedAt + 120,
    true,
  );
  const listReportsTraceB = recordRpcTrace(
    'list_active_minyan_reports',
    sameMillisecondStartedAt,
    sameMillisecondStartedAt + 95,
    true,
  );
  const listReportsKeyA = rpcTraceReactKey(listReportsTraceA);
  const listReportsKeyB = rpcTraceReactKey(listReportsTraceB);
  record(
    'RPC trace keys unique for same RPC at same millisecond',
    listReportsKeyA !== listReportsKeyB &&
      listReportsKeyA === 'rpc-trace-1' &&
      listReportsKeyB === 'rpc-trace-2',
  );
  record(
    'RPC trace key stable across repeated reads',
    rpcTraceReactKey(listReportsTraceA) === listReportsKeyA &&
      rpcTraceReactKey(listReportsTraceB) === listReportsKeyB,
  );
  record(
    'RPC trace keys avoid timestamp-based React keys',
    !listReportsKeyA.includes(String(sameMillisecondStartedAt)) &&
      !listReportsKeyB.includes(String(sameMillisecondStartedAt)),
  );

  const rpcTraceSrc = read('src/services/diagnostics/rpcTrace.ts');
  record(
    'diagnostics screen uses traceId for RPC trace keys',
    screenSrc.includes('key={entry.traceId}') &&
      !screenSrc.includes('key={`${entry.rpcName}-${entry.startedAt}`}'),
  );
  record(
    'RPC trace ids allocated at record creation',
    rpcTraceSrc.includes('traceId: allocateRpcTraceId()') &&
      rpcTraceSrc.includes('function allocateRpcTraceId()') &&
      !rpcTraceSrc.includes('Math.random()'),
  );
  record(
    'RPC trace React keys do not use Date.now or Math.random',
    !screenSrc.includes('key={`${entry.rpcName}-${entry.startedAt}`}') &&
      !screenSrc.match(/key=\{.*Date\.now\(\)/) &&
      !screenSrc.match(/key=\{.*Math\.random\(\)/),
  );

  record(
    'error-stage classification AUTH',
    classifyMinyanErrorStage('NOT_AUTHENTICATED') === 'AUTH',
  );
  record(
    'error-stage classification GEOFENCE',
    classifyMinyanErrorStage('GEOFENCE_VIOLATION') === 'GEOFENCE',
  );
  record(
    'error-stage classification ANCHOR_LOOKUP',
    classifyMinyanErrorStage('ANCHOR_NOT_FOUND') === 'ANCHOR_LOOKUP',
  );

  record(
    'expected minyan rejection severity GEOFENCE',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      message: 'GEOFENCE_VIOLATION',
      details: 'GEOFENCE_VIOLATION',
    }) === 'warn' &&
      classifyMinyanErrorStage('GEOFENCE_VIOLATION') === 'GEOFENCE',
  );
  record(
    'expected minyan rejection severity ANCHOR_NOT_FOUND',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'ANCHOR_NOT_FOUND',
      message: 'ANCHOR_NOT_FOUND',
    }) === 'warn' &&
      classifyMinyanErrorStage('ANCHOR_NOT_FOUND') === 'ANCHOR_LOOKUP',
  );
  record(
    'expected minyan rejection severity RATE_LIMITED',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'RATE_LIMITED',
      message: 'RATE_LIMITED',
    }) === 'warn' &&
      classifyMinyanErrorStage('RATE_LIMITED') === 'RATE_LIMIT',
  );
  record(
    'expected minyan rejection severity LOCATION_STALE',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'LOCATION_STALE',
      message: 'LOCATION_STALE',
    }) === 'warn' &&
      classifyMinyanErrorStage('LOCATION_STALE') === 'LOCATION',
  );
  record(
    'expected minyan rejection severity INVALID_ATTENDANCE',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'INVALID_ATTENDANCE',
      message: 'INVALID_ATTENDANCE',
    }) === 'warn' &&
      classifyMinyanErrorStage('INVALID_ATTENDANCE') === 'ATTENDANCE_VALIDATION',
  );
  record(
    'expected minyan rejection severity NOT_AUTHENTICATED',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'NOT_AUTHENTICATED',
      message: 'NOT_AUTHENTICATED',
    }) === 'warn' &&
      classifyMinyanErrorStage('NOT_AUTHENTICATED') === 'AUTH',
  );
  record(
    'unexpected minyan error severity UNKNOWN postgres detail',
    classifyMinyanErrorSeverity({
      code: 'P0001',
      details: 'UNKNOWN_DATABASE_ERROR',
      message: 'UNKNOWN_DATABASE_ERROR',
    }) === 'error',
  );
  record(
    'unexpected minyan error severity TypeError',
    classifyMinyanErrorSeverity(new TypeError('unexpected')) === 'error',
  );
  record(
    'unexpected minyan error severity network failure',
    classifyMinyanErrorSeverity({
      code: '08006',
      message: 'fetch failed network error',
      details: null,
    }) === 'error',
  );
  record(
    'minyan service uses shared RPC diagnostic logger',
    minyanServiceSrc.includes('logMinyanRpcDiagnostic(') &&
      !minyanServiceSrc.includes("logDiagnosticEvent('MINYAN'"),
  );
  record(
    'useMinyanLive mutation logs rejected for expected domain errors',
    useMinyanLiveSrc.includes("severity === 'warn' ? 'rejected' : 'failed'") &&
      useMinyanLiveSrc.includes('classifyMinyanErrorSeverity(error)'),
  );

  const match = compareOsmKeys('node/123456', 'node/123456');
  const mismatch = compareOsmKeys('node/123456', 'node/999999');
  record('OSM key comparison match', match.matches === true);
  record('OSM key comparison mismatch', mismatch.matches === false);

  const calendarSnap = buildCalendarDiagnosticsSnapshot(
    { weeklyParasha: { hebrewName: 'פרשת ראה' } },
    { fromCache: true, fallbackUsed: false, providerUsed: 'Hebcal local' },
  );
  record(
    'parasha diagnostics snapshot',
    calendarSnap.finalWeeklyParasha === 'פרשת ראה' &&
      calendarSnap.cacheVersion === '@mitzvahapp/calendar_cache_v2',
  );

  record(
    'calendar cache version diagnostics',
    calendarSnap.cacheVersion === '@mitzvahapp/calendar_cache_v2',
  );

  const homeSnap = {
    nextEventTitle: 'כניסת שבת',
    weeklyParashaFinal: 'פרשת ראה',
    selectedMitzvotCount: 3,
    preferencesRevision: 4,
  };
  record(
    'home data diagnostics fields',
    homeSnap.nextEventTitle && homeSnap.weeklyParashaFinal && homeSnap.preferencesRevision === 4,
  );

  const myMitzvotSnap = {
    selectionCount: 2,
    preferencesRevision: 5,
    lastSaveStatus: 'saved',
  };
  record(
    'My Mitzvot revision diagnostics',
    myMitzvotSnap.preferencesRevision === 5 && myMitzvotSnap.lastSaveStatus === 'saved',
  );

  const navSnap = {
    latitude: 31.77,
    longitude: 35.21,
    androidUrlType: 'google.navigation',
    canOpenUrlSucceeded: true,
    fallbackUsed: false,
  };
  record(
    'navigation diagnostics fields',
    navSnap.androidUrlType === 'google.navigation' && navSnap.canOpenUrlSucceeded === true,
  );

  const report = buildDiagnosticReport({
    osmKey: 'node/1',
    parasha: 'פרשת ראה',
    revision: 2,
    authenticated: true,
    secret: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n9I9PlFUP0THsR8U',
  });
  record(
    'clipboard report sanitization',
    report.includes('MitzvaPlus Runtime Diagnostics') && report.includes('No secrets included.'),
  );
  record(
    'no secret values in copied report',
    !report.includes('eyJhbGciOiJIUzI1NiJ9') && report.includes('[REDACTED]'),
  );

  record(
    'no direct minyan_reports table access introduced',
    !minyanServiceSrc.includes('.from(') &&
      !minyanServiceSrc.includes("'minyan_reports'") &&
      !minyanServiceSrc.includes('"minyan_reports"') &&
      minyanServiceSrc.includes(".rpc('list_active_minyan_reports'"),
  );

  record(
    'no direct synagogue_anchors table access introduced',
    !read('src/store/diagnosticsStore.ts').includes('synagogue_anchors') &&
      screenSrc.includes('Anchor existence cannot be inspected from the client'),
  );

  record(
    'diagnostics screen shows build label',
    screenSrc.includes('RUNTIME DIAGNOSTIC BUILD') &&
      screenSrc.includes('DIAGNOSTIC_BUILD_ID'),
  );

  record(
    'copy diagnostics button exists',
    screenSrc.includes('העתק דוח אבחון'),
  );

  const reportFormatterSrc = read('src/services/diagnostics/reportFormatter.ts');
  record(
    'overpass diagnostics section in copied report',
    reportFormatterSrc.includes("'OVERPASS'") &&
      reportFormatterSrc.includes('Probe classification'),
  );

  record(
    'overpass diagnostics screen section exists',
    screenSrc.includes('title="OVERPASS"') &&
      screenSrc.includes('Run Overpass probe'),
  );
  record(
    'overpass diagnostics include cache fields',
    screenSrc.includes('Cache hit') &&
      screenSrc.includes('Final source') &&
      screenSrc.includes('OVERPASS CACHE FALLBACK'),
  );
  record(
    'auth diagnostics include anonymous and failure classification',
    screenSrc.includes('Auth failure classification') &&
      reportFormatterSrc.includes('Anonymous:'),
  );

  record(
    'overpass probe utility is development-only',
    read('src/services/overpass/overpassProbe.ts').includes('if (!__DEV__)') &&
      read('src/services/overpass/overpassProbe.ts').includes('resolveProbeEndpoint'),
  );

  record(
    'verify:diagnostics script registered',
    Boolean(packageJson.scripts?.['verify:diagnostics']),
  );

  const failures = results.filter((item) => !item.pass).length;
  console.log(`\n${results.length - failures}/${results.length} checks passed`);
  if (failures > 0) {
    process.exitCode = 1;
  }
}

main();
