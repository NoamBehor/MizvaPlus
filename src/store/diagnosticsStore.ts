import { create } from 'zustand';

import type {
  CalendarDiagnosticsSnapshot,
  HolidayDiagnosticsSnapshot,
  HomeDiagnosticsSnapshot,
  ListActiveReportsDiagnostics,
  MapDiagnosticsSnapshot,
  MinyanErrorPresentation,
  MinyanFlowDiagnostics,
  MinyanFlowState,
  LoadedSynagogueDiagnosticsEntry,
  MinyanLocationDiagnostics,
  MinyanSelectedSynagogueDiagnostics,
  MyMitzvotDiagnosticsSnapshot,
  NavigationDiagnosticsSnapshot,
  OsmKeyComparison,
  OverpassDiagnosticsSnapshot,
} from '@/services/diagnostics/types';
import { getOverpassDiagnosticsSnapshot } from '@/services/overpass/overpassDiagnostics';
import { compareOsmKeys } from '@/services/diagnostics/osmKeyCompare';
import type { RpcTraceEntry } from '@/services/diagnostics/types';
import { getRpcTraceHistory } from '@/services/diagnostics/rpcTrace';

const EMPTY_SELECTED_SYNAGOGUE: MinyanSelectedSynagogueDiagnostics = {
  name: null,
  synagogueId: null,
  synagogueOsmKey: null,
  osmType: null,
  osmId: null,
  latitude: null,
  longitude: null,
};

const EMPTY_LOCATION: MinyanLocationDiagnostics = {
  userLatitude: null,
  userLongitude: null,
  accuracyMeters: null,
  capturedAt: null,
  ageSeconds: null,
  meetsAccuracyRequirement: null,
  clientDistanceToSynagogueMeters: null,
  locationSource: null,
  selectedTestSynagogueName: null,
  selectedTestSynagogueOsmKey: null,
  overrideWarningActive: false,
};

const EMPTY_LIST_REPORTS: ListActiveReportsDiagnostics = {
  success: false,
  returnedCount: 0,
  expiredDiscardedCount: 0,
  invalidOsmKeyCount: 0,
  mergedCount: 0,
  errorMessage: null,
};

const EMPTY_HOME: HomeDiagnosticsSnapshot = {
  nextEventId: null,
  nextEventType: null,
  nextEventTitle: null,
  nextEventSubLabel: null,
  nextEventHeroLabel: null,
  nextEventThemeKey: null,
  nextEventDatetime: null,
  nextEventRemainingSeconds: null,
  nextEventRemainingMs: null,
  zmanimLocationSource: null,
  zmanimLocationAccuracy: null,
  zmanimLocationAgeSeconds: null,
  weeklyParashaFinal: null,
  weeklyParashaFallback: false,
  selectedMitzvotCount: 0,
  selectedMitzvotIds: [],
  preferencesRevision: 0,
  capturedAt: 0,
};

const EMPTY_HOLIDAY: HolidayDiagnosticsSnapshot = {
  holidayKey: null,
  holidayName: null,
  hoursUntil: null,
  themeKey: 'default',
  prepCardEnabled: false,
  triviaCategories: [],
  zmanimLocationSource: null,
  zmanimLocationAccuracy: null,
  zmanimLocationAgeSeconds: null,
  upcomingEventCount: 0,
  capturedAt: 0,
};

const EMPTY_FLOW: MinyanFlowDiagnostics = {
  state: 'IDLE',
  mutationInFlight: false,
  selectedSynagogueOsmKey: null,
  currentMutationType: null,
  lastMutationSuccess: null,
  lastMutationAt: null,
};

const EMPTY_MAP: MapDiagnosticsSnapshot = {
  locationSource: null,
  permission: null,
  latitude: null,
  longitude: null,
  accuracyMeters: null,
  ageSeconds: null,
  fallbackReason: null,
  overpassCenterLatitude: null,
  overpassCenterLongitude: null,
  overpassCenterSource: null,
  mapRenderer: null,
  capturedAt: 0,
};

interface DiagnosticsState {
  selectedSynagogue: MinyanSelectedSynagogueDiagnostics;
  loadedSynagogues: LoadedSynagogueDiagnosticsEntry[];
  activeReportOsmKey: string | null;
  location: MinyanLocationDiagnostics;
  flow: MinyanFlowDiagnostics;
  listReports: ListActiveReportsDiagnostics;
  lastError: MinyanErrorPresentation | null;
  calendar: CalendarDiagnosticsSnapshot | null;
  home: HomeDiagnosticsSnapshot | null;
  holiday: HolidayDiagnosticsSnapshot | null;
  myMitzvot: MyMitzvotDiagnosticsSnapshot | null;
  navigation: NavigationDiagnosticsSnapshot | null;
  overpass: OverpassDiagnosticsSnapshot | null;
  map: MapDiagnosticsSnapshot;
  setSelectedSynagogue: (synagogue: MinyanSelectedSynagogueDiagnostics) => void;
  setLoadedSynagogues: (synagogues: LoadedSynagogueDiagnosticsEntry[]) => void;
  setActiveReportOsmKey: (osmKey: string | null) => void;
  setLocationDiagnostics: (location: MinyanLocationDiagnostics) => void;
  setFlowState: (state: MinyanFlowState, partial?: Partial<MinyanFlowDiagnostics>) => void;
  setListReportsDiagnostics: (stats: ListActiveReportsDiagnostics) => void;
  setLastError: (error: MinyanErrorPresentation | null) => void;
  setCalendarDiagnostics: (snapshot: CalendarDiagnosticsSnapshot) => void;
  setHomeSnapshot: (snapshot: Partial<HomeDiagnosticsSnapshot>) => void;
  setHolidayDiagnostics: (snapshot: Partial<HolidayDiagnosticsSnapshot>) => void;
  setMyMitzvotSnapshot: (snapshot: MyMitzvotDiagnosticsSnapshot) => void;
  setNavigationSnapshot: (snapshot: NavigationDiagnosticsSnapshot) => void;
  setMapDiagnostics: (snapshot: Partial<MapDiagnosticsSnapshot>) => void;
  refreshOverpassDiagnostics: () => void;
  getOsmKeyComparison: () => OsmKeyComparison;
  getLastRpcTrace: () => RpcTraceEntry | null;
}

export const useDiagnosticsStore = create<DiagnosticsState>((set, get) => ({
  selectedSynagogue: EMPTY_SELECTED_SYNAGOGUE,
  loadedSynagogues: [],
  activeReportOsmKey: null,
  location: EMPTY_LOCATION,
  flow: EMPTY_FLOW,
  listReports: EMPTY_LIST_REPORTS,
  lastError: null,
  calendar: null,
  home: null,
  holiday: null,
  myMitzvot: null,
  navigation: null,
  overpass: null,
  map: EMPTY_MAP,

  setSelectedSynagogue: (synagogue) => {
    if (!__DEV__) return;
    set({ selectedSynagogue: synagogue });
  },

  setLoadedSynagogues: (synagogues) => {
    if (!__DEV__) return;
    set({ loadedSynagogues: synagogues });
  },

  setActiveReportOsmKey: (osmKey) => {
    if (!__DEV__) return;
    set({ activeReportOsmKey: osmKey });
  },

  setLocationDiagnostics: (location) => {
    if (!__DEV__) return;
    set({ location });
  },

  setFlowState: (state, partial) => {
    if (!__DEV__) return;
    set((current) => ({
      flow: {
        ...current.flow,
        state,
        ...partial,
      },
    }));
  },

  setListReportsDiagnostics: (stats) => {
    if (!__DEV__) return;
    set({ listReports: stats });
  },

  setLastError: (error) => {
    if (!__DEV__) return;
    set({ lastError: error });
  },

  setCalendarDiagnostics: (snapshot) => {
    if (!__DEV__) return;
    set({ calendar: snapshot });
  },

  setHomeSnapshot: (snapshot) => {
    if (!__DEV__) return;
    set((current) => ({
      home: {
        ...(current.home ?? EMPTY_HOME),
        ...snapshot,
        capturedAt: snapshot.capturedAt ?? Date.now(),
      },
    }));
  },

  setHolidayDiagnostics: (snapshot) => {
    if (!__DEV__) return;
    set((current) => ({
      holiday: {
        ...(current.holiday ?? EMPTY_HOLIDAY),
        ...snapshot,
        capturedAt: snapshot.capturedAt ?? Date.now(),
      },
    }));
  },

  setMyMitzvotSnapshot: (snapshot) => {
    if (!__DEV__) return;
    set({ myMitzvot: snapshot });
  },

  setNavigationSnapshot: (snapshot) => {
    if (!__DEV__) return;
    set({ navigation: snapshot });
  },

  setMapDiagnostics: (snapshot) => {
    if (!__DEV__) return;
    set((current) => ({
      map: {
        ...current.map,
        ...snapshot,
        capturedAt: snapshot.capturedAt ?? Date.now(),
      },
    }));
  },

  refreshOverpassDiagnostics: () => {
    if (!__DEV__) return;
    set({ overpass: getOverpassDiagnosticsSnapshot() });
  },

  getOsmKeyComparison: () => {
    const { selectedSynagogue, activeReportOsmKey } = get();
    return compareOsmKeys(
      selectedSynagogue.synagogueOsmKey,
      activeReportOsmKey,
    );
  },

  getLastRpcTrace: () => getRpcTraceHistory()[0] ?? null,
}));
