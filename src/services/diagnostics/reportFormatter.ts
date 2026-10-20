import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getDevAuthDiagnostics } from '@/services/auth/devAuthBypass';
import { DIAGNOSTIC_BUILD_ID, CALENDAR_CACHE_STORAGE_KEY } from './constants';
import { formatOsmKeyComparison } from './osmKeyCompare';
import type {
  CalendarDiagnosticsSnapshot,
  HolidayDiagnosticsSnapshot,
  HomeDiagnosticsSnapshot,
  ListActiveReportsDiagnostics,
  MinyanErrorPresentation,
  MinyanFlowDiagnostics,
  MinyanLocationDiagnostics,
  MinyanSelectedSynagogueDiagnostics,
  MyMitzvotDiagnosticsSnapshot,
  NavigationDiagnosticsSnapshot,
  OsmKeyComparison,
  OverpassDiagnosticsSnapshot,
  RpcTraceEntry,
} from './types';

const SECRET_PATTERNS = [
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  /EXPO_PUBLIC_SUPABASE_ANON_KEY/gi,
  /SUPABASE_SERVICE_ROLE_KEY/gi,
  /service[_-]?role/gi,
  /refresh[_-]?token/gi,
  /access[_-]?token/gi,
];

export function sanitizeDiagnosticText(text: string): string {
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

export interface DiagnosticReportInput {
  appVersion: string;
  isAuthenticated: boolean;
  isAnonymousSession?: boolean;
  supabaseUrlConfigured: boolean;
  supabaseAnonKeyConfigured: boolean;
  selectedSynagogue: MinyanSelectedSynagogueDiagnostics;
  location: MinyanLocationDiagnostics;
  flow: MinyanFlowDiagnostics;
  listReports: ListActiveReportsDiagnostics;
  osmComparison: OsmKeyComparison;
  lastRpc: RpcTraceEntry | null;
  lastError: MinyanErrorPresentation | null;
  calendar: CalendarDiagnosticsSnapshot | null;
  home: HomeDiagnosticsSnapshot | null;
  holiday: HolidayDiagnosticsSnapshot | null;
  myMitzvot: MyMitzvotDiagnosticsSnapshot | null;
  navigation: NavigationDiagnosticsSnapshot | null;
  overpass: OverpassDiagnosticsSnapshot | null;
}

function formatNullable(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

export function buildDiagnosticReport(input: DiagnosticReportInput): string {
  const authDiagnostics = getDevAuthDiagnostics(input.isAuthenticated, {
    isAnonymous: input.isAnonymousSession,
  });

  const lines: string[] = [
    'MitzvaPlus Runtime Diagnostics',
    `Build: ${DIAGNOSTIC_BUILD_ID}`,
    `Platform: ${Platform.OS}`,
    `Runtime: ${authDiagnostics.runtimeLabel ?? (Platform.OS === 'web' ? 'WEB' : Platform.OS.toUpperCase())}`,
    '',
    'MINYAN',
    `Synagogue: ${formatNullable(input.selectedSynagogue.name)}`,
    `OSM Key: ${formatNullable(input.selectedSynagogue.synagogueOsmKey)}`,
    `Latitude: ${formatNullable(input.selectedSynagogue.latitude)}`,
    `Longitude: ${formatNullable(input.selectedSynagogue.longitude)}`,
    '',
    'OSM Key Comparison',
    formatOsmKeyComparison(input.osmComparison),
    '',
    'Flow State',
    `State: ${input.flow.state}`,
    `Mutation in flight: ${input.flow.mutationInFlight}`,
    `Mutation type: ${formatNullable(input.flow.currentMutationType)}`,
    '',
    'Device Location (diagnostic only)',
    `Location source: ${formatNullable(input.location.locationSource ?? 'GPS')}`,
    `Lat: ${formatNullable(input.location.userLatitude)}`,
    `Lng: ${formatNullable(input.location.userLongitude)}`,
    `Accuracy: ${formatNullable(input.location.accuracyMeters)}`,
    `Selected test synagogue: ${formatNullable(input.location.selectedTestSynagogueName)}`,
    `Client distance (diagnostic only): ${formatNullable(input.location.clientDistanceToSynagogueMeters)}`,
    input.location.overrideWarningActive
      ? 'WARNING: Development location override active'
      : 'Dev override: inactive',
    '',
    'List Active Reports',
    `Success: ${input.listReports.success}`,
    `Returned: ${input.listReports.returnedCount}`,
    `Expired discarded: ${input.listReports.expiredDiscardedCount}`,
    `Invalid OSM key: ${input.listReports.invalidOsmKeyCount}`,
    `Merged: ${input.listReports.mergedCount}`,
    '',
    'Last RPC',
    `Name: ${formatNullable(input.lastRpc?.rpcName)}`,
    `Status: ${input.lastRpc ? (input.lastRpc.success ? 'SUCCESS' : 'FAILED') : '—'}`,
    `Code: ${formatNullable(input.lastRpc?.postgresCode)}`,
    `Stage: ${formatNullable(input.lastRpc?.stage)}`,
    `Duration: ${input.lastRpc ? `${input.lastRpc.durationMs}ms` : '—'}`,
    '',
    'Last Error',
    `User message: ${formatNullable(input.lastError?.userMessage)}`,
    `RPC: ${formatNullable(input.lastError?.rpcName)}`,
    `Postgres: ${formatNullable(input.lastError?.postgresCode)}`,
    `Details: ${formatNullable(input.lastError?.details)}`,
    `Stage: ${formatNullable(input.lastError?.stage)}`,
    '',
    'CALENDAR',
    `Date: ${formatNullable(input.calendar?.localDateKey)}`,
    `Timezone: ${formatNullable(input.calendar?.timezone)}`,
    `Target Shabbat: ${formatNullable(input.calendar?.targetShabbatDate)}`,
    `Cache: ${input.calendar?.cacheVersion ?? CALENDAR_CACHE_STORAGE_KEY}`,
    `Parasha result: ${formatNullable(input.calendar?.finalWeeklyParasha)}`,
    `From cache: ${formatNullable(input.calendar?.fromCache)}`,
    `Fallback used: ${formatNullable(input.calendar?.fallbackUsed)}`,
    '',
    'HOME',
    `Next event: ${formatNullable(input.home?.nextEventHeroLabel ?? input.home?.nextEventTitle)}`,
    `Event type: ${formatNullable(input.home?.nextEventType)}`,
    `Theme: ${formatNullable(input.home?.nextEventThemeKey)}`,
    `Remaining ms: ${formatNullable(input.home?.nextEventRemainingMs)}`,
    `Weekly parasha: ${formatNullable(input.home?.weeklyParashaFinal)}`,
    `Selected mitzvot: ${input.home?.selectedMitzvotCount ?? '—'}`,
    `Preferences revision: ${formatNullable(input.home?.preferencesRevision)}`,
    '',
    'ZMANIM LOCATION',
    `Source: ${formatNullable(input.home?.zmanimLocationSource ?? input.holiday?.zmanimLocationSource)}`,
    `Accuracy: ${formatNullable(input.home?.zmanimLocationAccuracy ?? input.holiday?.zmanimLocationAccuracy)}`,
    `Age (s): ${formatNullable(input.home?.zmanimLocationAgeSeconds ?? input.holiday?.zmanimLocationAgeSeconds)}`,
    '',
    'HOLIDAY',
    `Key: ${formatNullable(input.holiday?.holidayKey)}`,
    `Name: ${formatNullable(input.holiday?.holidayName)}`,
    `Hours until: ${formatNullable(input.holiday?.hoursUntil)}`,
    `Theme: ${formatNullable(input.holiday?.themeKey)}`,
    `Prep card: ${formatNullable(input.holiday?.prepCardEnabled)}`,
    `Trivia: ${input.holiday?.triviaCategories?.join(', ') ?? '—'}`,
    '',
    'MY MITZVOT',
    `Count: ${input.myMitzvot?.selectionCount ?? '—'}`,
    `Revision: ${formatNullable(input.myMitzvot?.preferencesRevision)}`,
    `Last save: ${formatNullable(input.myMitzvot?.lastSaveStatus)}`,
    `Noop: ${formatNullable(input.myMitzvot?.lastSaveWasNoop)}`,
    '',
    'NAVIGATION',
    `Lat: ${formatNullable(input.navigation?.latitude)}`,
    `Lng: ${formatNullable(input.navigation?.longitude)}`,
    `canOpenURL: ${formatNullable(input.navigation?.canOpenUrlSucceeded)}`,
    `Fallback used: ${formatNullable(input.navigation?.fallbackUsed)}`,
    '',
    'OVERPASS',
    `Platform: ${formatNullable(input.overpass?.platform)}`,
    `Endpoint: ${formatNullable(input.overpass?.successfulEndpoint ?? input.overpass?.endpointAttempts[0]?.endpoint)}`,
    `Status: ${formatNullable(input.overpass?.finalStatus)}`,
    `Duration: ${
      input.overpass?.endpointAttempts.length
        ? `${input.overpass.endpointAttempts.map((attempt) => `${attempt.durationMs}ms`).join(', ')}`
        : '—'
    }`,
    `Timeout: ${formatNullable(input.overpass?.timeoutMs ? `${input.overpass.timeoutMs}ms` : null)}`,
    `Abort reason: ${formatNullable(input.overpass?.endpointAttempts.at(-1)?.abortReason)}`,
    `Fallback endpoint: ${formatNullable(input.overpass?.fallbackEndpoint)}`,
    `Final result: ${formatNullable(input.overpass?.finalResult)}`,
    `Query radius (m): ${formatNullable(input.overpass?.radiusMeters)}`,
    `Element count: ${formatNullable(input.overpass?.elementCount)}`,
    `Cache hit: ${formatNullable(input.overpass?.cacheHit)}`,
    `Cache stale: ${formatNullable(input.overpass?.cacheStale)}`,
    `Final source: ${formatNullable(input.overpass?.finalSource)}`,
    ...(input.overpass?.finalStatus === 'CACHE_FALLBACK'
      ? ['OVERPASS CACHE FALLBACK']
      : []),
    `Probe status: ${formatNullable(input.overpass?.probeResult?.status)}`,
    `Probe classification: ${formatNullable(input.overpass?.probeResult?.classification)}`,
    '',
    'AUTH',
    `Authentication mode: ${authDiagnostics.authenticationMode}`,
    `Authenticated session: ${authDiagnostics.authenticatedSession ? 'YES' : 'NO'}`,
    `Anonymous: ${authDiagnostics.anonymous ? 'YES' : 'NO'}`,
    `Auth failure: ${formatNullable(authDiagnostics.authFailureClassification)}`,
    `Production auth: ${authDiagnostics.productionAuth}`,
    '',
    'APP',
    `Version: ${input.appVersion}`,
    `Environment: ${__DEV__ ? 'development' : 'production'}`,
    `Authenticated: ${input.isAuthenticated}`,
    `Supabase URL configured: ${input.supabaseUrlConfigured}`,
    `Anon key configured: ${input.supabaseAnonKeyConfigured}`,
    '',
    'No secrets included.',
  ];

  return sanitizeDiagnosticText(lines.join('\n'));
}

export function getAppVersionLabel(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}
