import type { MinyanLiveErrorCode } from '@/services/minyanLive/minyanLiveTypes';
import type { OsmElementType } from '@/types/synagogue';

export type DiagnosticCategory =
  | 'AUTH'
  | 'CALENDAR'
  | 'MINYAN'
  | 'MAP'
  | 'MITZVOT'
  | 'NAVIGATION'
  | 'APP';

export type DiagnosticSeverity = 'info' | 'warn' | 'error';

export interface DiagnosticLogEntry {
  timestamp: number;
  category: DiagnosticCategory;
  eventName: string;
  payload?: Record<string, unknown>;
  severity: DiagnosticSeverity;
}

export type MinyanErrorStage =
  | 'AUTH'
  | 'LOCATION'
  | 'ANCHOR_LOOKUP'
  | 'GEOFENCE'
  | 'ATTENDANCE_VALIDATION'
  | 'ACTIVE_REPORT_CONFLICT'
  | 'RATE_LIMIT'
  | 'RPC_RESULT'
  | 'UNKNOWN';

export type MinyanFlowState =
  | 'IDLE'
  | 'LOADING_REPORTS'
  | 'READY'
  | 'REQUESTING_LOCATION'
  | 'CREATING'
  | 'UPDATING'
  | 'FULFILLING'
  | 'SUCCESS'
  | 'ERROR';

export interface RpcTraceEntry {
  traceId: string;
  rpcName: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  success: boolean;
  postgresCode: string | null;
  message: string | null;
  details: string | null;
  hint: string | null;
  stage: MinyanErrorStage | null;
  minyanCode: MinyanLiveErrorCode | null;
}

export type DiagnosticLocationSource =
  | 'GPS'
  | 'CACHED'
  | 'FALLBACK'
  | 'UNAVAILABLE'
  | 'DEV_OVERRIDE';

export type MapRenderer = 'WEB_GOOGLE_MAPS' | 'NATIVE_REACT_NATIVE_MAPS';

export interface MapDiagnosticsSnapshot {
  locationSource: DiagnosticLocationSource | null;
  permission: 'GRANTED' | 'DENIED' | 'UNKNOWN' | null;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  ageSeconds: number | null;
  fallbackReason: string | null;
  overpassCenterLatitude: number | null;
  overpassCenterLongitude: number | null;
  overpassCenterSource: DiagnosticLocationSource | null;
  mapRenderer: MapRenderer | null;
  capturedAt: number;
}

export interface MinyanLocationDiagnostics {
  userLatitude: number | null;
  userLongitude: number | null;
  accuracyMeters: number | null;
  capturedAt: string | null;
  ageSeconds: number | null;
  meetsAccuracyRequirement: boolean | null;
  clientDistanceToSynagogueMeters: number | null;
  locationSource: DiagnosticLocationSource | null;
  selectedTestSynagogueName: string | null;
  selectedTestSynagogueOsmKey: string | null;
  overrideWarningActive: boolean;
}

export interface LoadedSynagogueDiagnosticsEntry {
  osmKey: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface MinyanSelectedSynagogueDiagnostics {
  name: string | null;
  synagogueId: string | null;
  synagogueOsmKey: string | null;
  osmType: OsmElementType | null;
  osmId: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ListActiveReportsDiagnostics {
  success: boolean;
  returnedCount: number;
  expiredDiscardedCount: number;
  invalidOsmKeyCount: number;
  mergedCount: number;
  errorMessage: string | null;
}

export interface MinyanFlowDiagnostics {
  state: MinyanFlowState;
  mutationInFlight: boolean;
  selectedSynagogueOsmKey: string | null;
  currentMutationType: string | null;
  lastMutationSuccess: boolean | null;
  lastMutationAt: number | null;
}

export interface MinyanErrorPresentation {
  userMessage: string | null;
  rpcName: string | null;
  postgresCode: string | null;
  details: string | null;
  stage: MinyanErrorStage | null;
  minyanCode: MinyanLiveErrorCode | null;
}

export interface CalendarDiagnosticsSnapshot {
  deviceLocalIso: string;
  localDateKey: string;
  timezone: string;
  targetShabbatDate: string | null;
  providerUsed: string;
  hebcalResult: string | null;
  normalizedParashaName: string | null;
  fromCache: boolean;
  cacheKey: string | null;
  cacheVersion: string;
  fallbackUsed: boolean;
  error: string | null;
  finalWeeklyParasha: string | null;
}

export interface HomeDiagnosticsSnapshot {
  nextEventId: string | null;
  nextEventType: string | null;
  nextEventTitle: string | null;
  nextEventSubLabel: string | null;
  nextEventHeroLabel: string | null;
  nextEventThemeKey: string | null;
  nextEventDatetime: string | null;
  nextEventRemainingSeconds: number | null;
  nextEventRemainingMs: number | null;
  zmanimLocationSource: string | null;
  zmanimLocationAccuracy: number | null;
  zmanimLocationAgeSeconds: number | null;
  weeklyParashaFinal: string | null;
  weeklyParashaFallback: boolean;
  selectedMitzvotCount: number;
  selectedMitzvotIds: string[];
  preferencesRevision: number;
  capturedAt: number;
}

export interface HolidayDiagnosticsSnapshot {
  holidayKey: string | null;
  holidayName: string | null;
  hoursUntil: number | null;
  themeKey: string;
  prepCardEnabled: boolean;
  triviaCategories: string[];
  zmanimLocationSource: string | null;
  zmanimLocationAccuracy: number | null;
  zmanimLocationAgeSeconds: number | null;
  upcomingEventCount: number;
  capturedAt: number;
}

export interface MyMitzvotDiagnosticsSnapshot {
  selectedMitzvahIds: string[];
  selectionCount: number;
  preferencesRevision: number;
  lastSavedRevision: number | null;
  lastSaveStatus: 'saved' | 'noop' | 'error' | null;
  lastSaveTimestamp: number | null;
  lastSaveWasNoop: boolean | null;
  notificationReconciliationStatus: string | null;
  homeRefreshTriggered: boolean | null;
}

export interface NavigationDiagnosticsSnapshot {
  latitude: number | null;
  longitude: number | null;
  androidUrlType: string | null;
  iosUrlType: string | null;
  canOpenUrlSucceeded: boolean | null;
  fallbackUsed: boolean | null;
  capturedAt: number;
}

export interface OsmKeyComparison {
  selectedOsmKey: string | null;
  reportOsmKey: string | null;
  matches: boolean | null;
}

export type {
  OverpassCancellationClass,
} from '@/services/overpass/classifyOverpassError';
export type {
  OverpassDiagnosticsSnapshot,
  OverpassEndpointAttemptDiagnostics,
  OverpassProbeResult,
} from '@/services/overpass/overpassDiagnostics';
