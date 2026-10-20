import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { mergeSynagoguesWithMinyan } from '@/services/minyanLive/minyanLiveMapper';
import {
  buildMinyanLocationPayload,
  createMinyanReport,
  fulfillMinyanReport,
  getFreshLocationForMinyan,
  listActiveMinyanReports,
  updateMinyanReport,
} from '@/services/minyanLive/minyanLiveService';
import {
  buildMinyanErrorPresentation,
  classifyMinyanErrorSeverity,
  logMinyanRpcDiagnostic,
} from '@/services/diagnostics/errorStages';
import { toUserFacingMinyanError } from '@/services/minyanLive/minyanLiveErrors';
import { MINYAN_MAX_GPS_ACCURACY_METERS } from '@/constants/minyanLive';
import {
  getDevLocationOverrideSelection,
  isDevLocationOverrideActive,
  resolveActiveLocationSource,
} from '@/services/devPreview/devLocationOverride';
import { calculateDistanceMeters } from '@/utils/distance';
import type {
  ActiveMinyanReport,
  MinyanMutationKind,
  SynagogueWithMinyan,
} from '@/services/minyanLive/minyanLiveTypes';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import {
  persistOwnedMinyanReports,
  useMinyanLiveStore,
} from '@/store/minyanLiveStore';
import { useUserStore } from '@/store/userStore';
import type { Synagogue } from '@/types/synagogue';

export interface UseMinyanLiveResult {
  synagoguesWithMinyan: SynagogueWithMinyan[];
  activeReports: ActiveMinyanReport[];
  isLoading: boolean;
  loadError: string | null;
  mutationKind: MinyanMutationKind | null;
  mutationSynagogueOsmKey: string | null;
  isMutating: boolean;
  mutationError: string | null;
  successMessage: string | null;
  refresh: () => Promise<void>;
  isOwnedReport: (synagogueOsmKey: string, reportId: string) => boolean;
  createReport: (synagogueOsmKey: string, currentAttendance: number) => Promise<boolean>;
  updateReport: (
    synagogueOsmKey: string,
    reportId: string,
    currentAttendance: number,
  ) => Promise<boolean>;
  fulfillReport: (synagogueOsmKey: string, reportId: string) => Promise<boolean>;
  clearSuccessMessage: () => void;
  clearMutationError: () => void;
}

export function useMinyanLive(
  synagogues: Synagogue[],
  enabled: boolean,
): UseMinyanLiveResult {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const userId = useUserStore((state) => state.user?.id ?? null);
  const setOwnedReport = useMinyanLiveStore((state) => state.setOwnedReport);
  const clearOwnedReport = useMinyanLiveStore((state) => state.clearOwnedReport);
  const isOwnedReportInStore = useMinyanLiveStore((state) => state.isOwnedReport);
  const hydrateOwnedReports = useMinyanLiveStore((state) => state.hydrateOwnedReports);
  const resetOwnedReports = useMinyanLiveStore((state) => state.resetOwnedReports);

  const [activeReports, setActiveReports] = useState<ActiveMinyanReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationKind, setMutationKind] = useState<MinyanMutationKind | null>(null);
  const [mutationSynagogueOsmKey, setMutationSynagogueOsmKey] = useState<string | null>(
    null,
  );
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const mutationInFlightRef = useRef(false);

  const synagogueOsmKeys = useMemo(
    () => synagogues.map((synagogue) => synagogue.id),
    [synagogues],
  );

  const synagogueOsmKeysKey = useMemo(
    () => synagogueOsmKeys.join('|'),
    [synagogueOsmKeys],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId || !isAuthenticated) {
      resetOwnedReports();
      return;
    }

    void hydrateOwnedReports(userId);
  }, [userId, isAuthenticated, hydrateOwnedReports, resetOwnedReports]);

  const refresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || !isSupabaseConfigured()) {
      if (isMountedRef.current) {
        setActiveReports([]);
        setLoadError(null);
        setIsLoading(false);
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    if (__DEV__) {
      useDiagnosticsStore.getState().setFlowState('LOADING_REPORTS');
    }

    try {
      const reports = await listActiveMinyanReports(
        synagogueOsmKeys.length > 0 ? synagogueOsmKeys : undefined,
      );

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setActiveReports(reports);
      if (__DEV__) {
        useDiagnosticsStore.getState().setFlowState('READY');
        const selectedKey =
          useDiagnosticsStore.getState().selectedSynagogue.synagogueOsmKey;
        const reportForSelected = selectedKey
          ? reports.find((report) => report.synagogueOsmKey === selectedKey)
          : reports[0];
        useDiagnosticsStore
          .getState()
          .setActiveReportOsmKey(reportForSelected?.synagogueOsmKey ?? null);
      }

      if (userId) {
        const ownedReportsByOsmKey =
          useMinyanLiveStore.getState().ownedReportsByOsmKey;
        const nextOwned = { ...ownedReportsByOsmKey };
        let changed = false;

        for (const [osmKey, reportId] of Object.entries(nextOwned)) {
          const stillActive = reports.some(
            (report) => report.synagogueOsmKey === osmKey && report.id === reportId,
          );
          if (!stillActive) {
            delete nextOwned[osmKey];
            changed = true;
          }
        }

        if (changed) {
          useMinyanLiveStore.setState({ ownedReportsByOsmKey: nextOwned });
          await persistOwnedMinyanReports(userId, nextOwned);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[useMinyanLive] list_active_minyan_reports failed:', error);
        const presentation = buildMinyanErrorPresentation(
          error,
          'list_active_minyan_reports',
        );
        useDiagnosticsStore.getState().setLastError(presentation);
        useDiagnosticsStore.getState().setFlowState('ERROR');
        logMinyanRpcDiagnostic('list_active_minyan_reports', error);
      }
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      const mapped = toUserFacingMinyanError(error);
      setLoadError(mapped.message);
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, isAuthenticated, synagogueOsmKeys, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh, synagogueOsmKeysKey, isAuthenticated, enabled]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refresh();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refresh]);

  const persistOwnership = useCallback(
    async (synagogueOsmKey: string, reportId: string) => {
      setOwnedReport(synagogueOsmKey, reportId);
      if (userId) {
        const nextOwned = {
          ...useMinyanLiveStore.getState().ownedReportsByOsmKey,
          [synagogueOsmKey]: reportId,
        };
        await persistOwnedMinyanReports(userId, nextOwned);
      }
    },
    [setOwnedReport, userId],
  );

  const clearPersistedOwnership = useCallback(
    async (synagogueOsmKey: string) => {
      clearOwnedReport(synagogueOsmKey);
      if (userId) {
        const nextOwned = { ...useMinyanLiveStore.getState().ownedReportsByOsmKey };
        delete nextOwned[synagogueOsmKey];
        await persistOwnedMinyanReports(userId, nextOwned);
      }
    },
    [clearOwnedReport, userId],
  );

  const runMutation = useCallback(
    async (
      kind: MinyanMutationKind,
      synagogueOsmKey: string,
      action: () => Promise<void>,
      successText: string,
    ): Promise<boolean> => {
      if (!isAuthenticated) {
        setMutationError('יש להתחבר כדי לדווח על מניין.');
        return false;
      }

      if (!isSupabaseConfigured()) {
        setMutationError('השירות אינו זמין כרגע.');
        return false;
      }

      if (mutationInFlightRef.current) {
        return false;
      }

      mutationInFlightRef.current = true;
      setMutationKind(kind);
      setMutationSynagogueOsmKey(synagogueOsmKey);
      setIsMutating(true);
      setMutationError(null);
      setSuccessMessage(null);

      const flowState =
        kind === 'create' ? 'CREATING' : kind === 'update' ? 'UPDATING' : 'FULFILLING';
      const rpcName =
        kind === 'create'
          ? 'create_minyan_report'
          : kind === 'update'
            ? 'update_minyan_report'
            : 'fulfill_minyan_report';

      if (__DEV__) {
        useDiagnosticsStore.getState().setFlowState(flowState, {
          mutationInFlight: true,
          selectedSynagogueOsmKey: synagogueOsmKey,
          currentMutationType: kind,
        });
      }

      try {
        await action();
        if (isMountedRef.current) {
          setSuccessMessage(successText);
        }
        if (__DEV__) {
          useDiagnosticsStore.getState().setFlowState('SUCCESS', {
            mutationInFlight: false,
            lastMutationSuccess: true,
            lastMutationAt: Date.now(),
          });
          useDiagnosticsStore.getState().setLastError(null);
        }
        await refresh();
        return true;
      } catch (error) {
        if (__DEV__) {
          const presentation = buildMinyanErrorPresentation(error, rpcName);
          const severity = classifyMinyanErrorSeverity(error);
          const outcome = severity === 'warn' ? 'rejected' : 'failed';
          const logFn = severity === 'warn' ? console.warn : console.error;
          logFn(`[useMinyanLive] ${kind} ${outcome}:`, {
            code: presentation.minyanCode,
          });
          useDiagnosticsStore.getState().setLastError(presentation);
          useDiagnosticsStore.getState().setFlowState('ERROR', {
            mutationInFlight: false,
            lastMutationSuccess: false,
            lastMutationAt: Date.now(),
          });
          logMinyanRpcDiagnostic(rpcName, error);
        }
        if (isMountedRef.current) {
          setMutationError(toUserFacingMinyanError(error, kind).message);
        }
        return false;
      } finally {
        mutationInFlightRef.current = false;
        if (isMountedRef.current) {
          setIsMutating(false);
          setMutationKind(null);
          setMutationSynagogueOsmKey(null);
        }
      }
    },
    [isAuthenticated, refresh],
  );

  const recordLocationDiagnostics = useCallback((location: Awaited<ReturnType<typeof getFreshLocationForMinyan>>) => {
    if (!__DEV__) return;

    const selected = useDiagnosticsStore.getState().selectedSynagogue;
    const now = Date.now();
    const ageSeconds = Math.round((now - location.timestamp) / 1000);
    const meetsAccuracy =
      typeof location.accuracy === 'number' &&
      location.accuracy <= MINYAN_MAX_GPS_ACCURACY_METERS;

    let clientDistance: number | null = null;
    if (
      selected.latitude !== null &&
      selected.longitude !== null
    ) {
      clientDistance = calculateDistanceMeters(
        location.coordinates,
        { latitude: selected.latitude, longitude: selected.longitude },
      );
    }

    const overrideSelection = getDevLocationOverrideSelection();

    useDiagnosticsStore.getState().setLocationDiagnostics({
      userLatitude: location.coordinates.latitude,
      userLongitude: location.coordinates.longitude,
      accuracyMeters: location.accuracy ?? null,
      capturedAt: new Date(location.timestamp).toISOString(),
      ageSeconds,
      meetsAccuracyRequirement: meetsAccuracy,
      clientDistanceToSynagogueMeters: clientDistance,
      locationSource: resolveActiveLocationSource(location),
      selectedTestSynagogueName: overrideSelection?.name ?? null,
      selectedTestSynagogueOsmKey: overrideSelection?.osmKey ?? null,
      overrideWarningActive: isDevLocationOverrideActive(),
    });
  }, []);

  const createReport = useCallback(
    async (synagogueOsmKey: string, currentAttendance: number): Promise<boolean> => {
      return runMutation('create', synagogueOsmKey, async () => {
        if (__DEV__) {
          useDiagnosticsStore.getState().setFlowState('REQUESTING_LOCATION');
        }
        const location = await getFreshLocationForMinyan();
        recordLocationDiagnostics(location);
        const payload = buildMinyanLocationPayload(location);
        const report = await createMinyanReport({
          synagogueOsmKey,
          currentAttendance,
          ...payload,
        });
        await persistOwnership(synagogueOsmKey, report.id);
      }, 'בקשת המניין פורסמה');
    },
    [persistOwnership, recordLocationDiagnostics, runMutation],
  );

  const updateReport = useCallback(
    async (
      synagogueOsmKey: string,
      reportId: string,
      currentAttendance: number,
    ): Promise<boolean> => {
      return runMutation('update', synagogueOsmKey, async () => {
        if (__DEV__) {
          useDiagnosticsStore.getState().setFlowState('REQUESTING_LOCATION');
        }
        const location = await getFreshLocationForMinyan();
        recordLocationDiagnostics(location);
        const payload = buildMinyanLocationPayload(location);
        const report = await updateMinyanReport({
          reportId,
          currentAttendance,
          ...payload,
        });
        if (report) {
          await persistOwnership(synagogueOsmKey, report.id);
        } else {
          await clearPersistedOwnership(synagogueOsmKey);
        }
      }, 'המניין עודכן בהצלחה');
    },
    [clearPersistedOwnership, persistOwnership, recordLocationDiagnostics, runMutation],
  );

  const fulfillReport = useCallback(
    async (synagogueOsmKey: string, reportId: string): Promise<boolean> => {
      return runMutation('fulfill', synagogueOsmKey, async () => {
        if (__DEV__) {
          useDiagnosticsStore.getState().setFlowState('REQUESTING_LOCATION');
        }
        const location = await getFreshLocationForMinyan();
        recordLocationDiagnostics(location);
        const payload = buildMinyanLocationPayload(location);
        await fulfillMinyanReport({
          reportId,
          ...payload,
        });
        await clearPersistedOwnership(synagogueOsmKey);
      }, 'המניין עודכן בהצלחה');
    },
    [clearPersistedOwnership, recordLocationDiagnostics, runMutation],
  );

  const synagoguesWithMinyan = useMemo(
    () => mergeSynagoguesWithMinyan(synagogues, activeReports),
    [synagogues, activeReports],
  );

  return {
    synagoguesWithMinyan,
    activeReports,
    isLoading,
    loadError,
    mutationKind,
    mutationSynagogueOsmKey,
    isMutating,
    mutationError,
    successMessage,
    refresh,
    isOwnedReport: isOwnedReportInStore,
    createReport,
    updateReport,
    fulfillReport,
    clearSuccessMessage: () => setSuccessMessage(null),
    clearMutationError: () => setMutationError(null),
  };
}
