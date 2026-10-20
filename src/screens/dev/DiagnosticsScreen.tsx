import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useNavigation } from '@react-navigation/native';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { DevLocationSection } from '@/components/dev/DevLocationSection';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import {
  DIAGNOSTIC_BUILD_ID,
  buildDiagnosticReport,
  formatOsmKeyComparison,
  getAppVersionLabel,
  getDiagnosticEventLog,
  getRpcTraceHistory,
} from '@/services/diagnostics';
import { getCurrentSession } from '@/services/auth';
import { isAnonymousAuthUser } from '@/services/auth/devAnonymousAuth';
import {
  getDevAuthBannerLabel,
  getDevAuthDiagnostics,
  isDevAuthBypassActive,
} from '@/services/auth/devAuthBypass';
import { isDevPreviewMode } from '@/services/devPreview';
import { DEV_PREVIEW_RUNTIME_LABEL } from '@/services/devPreview/devPreviewDiagnostics';
import { probeOverpassConnectivity } from '@/services/overpass/overpassProbe';
import { copyTextToClipboard } from '@/utils/clipboard';
import { useAppStore } from '@/store/appStore';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View
      className="mb-4 rounded-2xl border p-4"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Text style={[typography.subtitle, { marginBottom: 8 }]}>{title}</Text>
      {children}
    </View>
  );
}

function MonoLine({
  label,
  value,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
}) {
  return (
    <Text style={[typography.caption, { marginBottom: 4, writingDirection: 'ltr' }]}>
      {label}: {value === null || value === undefined ? '—' : String(value)}
    </Text>
  );
}

export function DiagnosticsScreen() {
  const navigation = useNavigation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isSupabaseConfigured = useAppStore((state) => state.isSupabaseConfigured);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const selectedSynagogue = useDiagnosticsStore((state) => state.selectedSynagogue);
  const location = useDiagnosticsStore((state) => state.location);
  const flow = useDiagnosticsStore((state) => state.flow);
  const listReports = useDiagnosticsStore((state) => state.listReports);
  const lastError = useDiagnosticsStore((state) => state.lastError);
  const calendar = useDiagnosticsStore((state) => state.calendar);
  const home = useDiagnosticsStore((state) => state.home);
  const holiday = useDiagnosticsStore((state) => state.holiday);
  const myMitzvot = useDiagnosticsStore((state) => state.myMitzvot);
  const navigationDiag = useDiagnosticsStore((state) => state.navigation);
  const overpass = useDiagnosticsStore((state) => state.overpass);
  const mapDiagnostics = useDiagnosticsStore((state) => state.map);
  const refreshOverpassDiagnostics = useDiagnosticsStore(
    (state) => state.refreshOverpassDiagnostics,
  );
  const [isAnonymousSession, setIsAnonymousSession] = useState(false);
  const getOsmKeyComparison = useDiagnosticsStore((state) => state.getOsmKeyComparison);
  const [probeStatus, setProbeStatus] = useState<string | null>(null);
  const [isProbeRunning, setIsProbeRunning] = useState(false);

  const osmComparison = useMemo(() => getOsmKeyComparison(), [getOsmKeyComparison]);
  const rpcHistory = useMemo(() => getRpcTraceHistory(), []);
  const eventLog = useMemo(() => getDiagnosticEventLog().slice(0, 20), []);

  const supabaseUrlConfigured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseAnonKeyConfigured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const authDiagnostics = useMemo(
    () =>
      getDevAuthDiagnostics(isAuthenticated, {
        isAnonymous: isAnonymousSession,
      }),
    [isAuthenticated, isAnonymousSession],
  );

  const devAuthBanner = useMemo(
    () =>
      getDevAuthBannerLabel({
        isAuthenticated,
        isAnonymous: isAnonymousSession,
      }),
    [isAuthenticated, isAnonymousSession],
  );

  useEffect(() => {
    refreshOverpassDiagnostics();
  }, [refreshOverpassDiagnostics]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    void getCurrentSession().then((session) => {
      setIsAnonymousSession(isAnonymousAuthUser(session));
    });
  }, [isAuthenticated]);

  const handleOverpassProbe = useCallback(async () => {
    setIsProbeRunning(true);
    setProbeStatus(null);
    try {
      const result = await probeOverpassConnectivity();
      refreshOverpassDiagnostics();
      setProbeStatus(
        `${result.status} (${result.durationMs}ms, ${result.classification})`,
      );
    } catch (error) {
      setProbeStatus(error instanceof Error ? error.message : 'Probe failed');
    } finally {
      setIsProbeRunning(false);
    }
  }, [refreshOverpassDiagnostics]);

  const handleCopy = useCallback(async () => {
    const report = buildDiagnosticReport({
      appVersion: getAppVersionLabel(),
      isAuthenticated,
      isAnonymousSession,
      supabaseUrlConfigured,
      supabaseAnonKeyConfigured,
      selectedSynagogue,
      location,
      flow,
      listReports,
      osmComparison,
      lastRpc: rpcHistory[0] ?? null,
      lastError,
      calendar,
      home,
      holiday,
      myMitzvot,
      navigation: navigationDiag,
      overpass,
    });
    await copyTextToClipboard(report);
    setCopyStatus('הדוח הועתק ללוח');
    setTimeout(() => setCopyStatus(null), 2500);
  }, [
    isAuthenticated,
    supabaseUrlConfigured,
    supabaseAnonKeyConfigured,
    selectedSynagogue,
    location,
    flow,
    listReports,
    osmComparison,
    rpcHistory,
    lastError,
    calendar,
    home,
    holiday,
    myMitzvot,
    navigationDiag,
    overpass,
  ]);

  if (!__DEV__) {
    return (
      <ScreenContainer>
        <Text style={typography.body}>Diagnostics are only available in development builds.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        className="mb-3"
      >
        <Text style={[typography.body, { color: colors.primary }]}>← חזרה</Text>
      </Pressable>

      {isDevPreviewMode() ? (
        <View
          className="mb-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text style={[typography.label, { color: colors.white }]}>RUNTIME:</Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.white, writingDirection: 'ltr' },
            ]}
          >
            {DEV_PREVIEW_RUNTIME_LABEL}
          </Text>
          <Text style={[typography.label, { color: colors.white, marginTop: 8 }]}>
            AUTH:
          </Text>
          <Text style={[typography.bodySmall, { color: colors.white }]}>
            {authDiagnostics.authenticationMode}
          </Text>
        </View>
      ) : null}

      {isDevAuthBypassActive() && !isDevPreviewMode() ? (
        <View
          className="mb-4 rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text style={[typography.subtitle, { color: colors.white }]}>
            {devAuthBanner}
          </Text>
        </View>
      ) : null}

      <View
        className="mb-4 rounded-2xl px-4 py-3"
        style={{ backgroundColor: colors.accent }}
      >
        <Text style={[typography.label, { color: colors.white }]}>
          RUNTIME DIAGNOSTIC BUILD:
        </Text>
        <Text
          style={[
            typography.hero,
            { color: colors.white, fontSize: 20, writingDirection: 'ltr' },
          ]}
        >
          {DIAGNOSTIC_BUILD_ID}
        </Text>
      </View>

      <Pressable
        onPress={() => void handleCopy()}
        className="mb-4 items-center rounded-2xl py-4"
        style={{ backgroundColor: colors.primary }}
        accessibilityRole="button"
        accessibilityLabel="העתק דוח אבחון"
      >
        <Text style={[typography.subtitle, { color: colors.white }]}>
          העתק דוח אבחון
        </Text>
      </Pressable>
      {copyStatus ? (
        <Text style={[typography.caption, { marginBottom: 8, color: colors.success }]}>
          {copyStatus}
        </Text>
      ) : null}

      <Section title="Authentication">
        <MonoLine label="Auth mode" value={authDiagnostics.authenticationMode} />
        <MonoLine
          label="Authenticated"
          value={authDiagnostics.authenticatedSession ? 'YES' : 'NO'}
        />
        <MonoLine label="Anonymous" value={authDiagnostics.anonymous ? 'YES' : 'NO'} />
        <MonoLine label="Production auth" value={authDiagnostics.productionAuth} />
        <MonoLine
          label="Auth failure classification"
          value={authDiagnostics.authFailureClassification}
        />
        <MonoLine label="Auth failure message" value={authDiagnostics.authFailureMessage} />
      </Section>

      <Section title="Map">
        <MonoLine label="Map renderer" value={mapDiagnostics.mapRenderer} />
        <MonoLine label="Location source" value={mapDiagnostics.locationSource} />
        <MonoLine label="Permission" value={mapDiagnostics.permission} />
        <MonoLine label="Latitude" value={mapDiagnostics.latitude} />
        <MonoLine label="Longitude" value={mapDiagnostics.longitude} />
        <MonoLine label="Accuracy" value={mapDiagnostics.accuracyMeters} />
        <MonoLine label="Age" value={mapDiagnostics.ageSeconds} />
        <MonoLine label="Fallback reason" value={mapDiagnostics.fallbackReason} />
        <MonoLine label="Overpass center latitude" value={mapDiagnostics.overpassCenterLatitude} />
        <MonoLine label="Overpass center longitude" value={mapDiagnostics.overpassCenterLongitude} />
        <MonoLine label="Overpass center source" value={mapDiagnostics.overpassCenterSource} />
      </Section>

      <Section title="Build / Runtime Identity">
        <MonoLine label="App" value="MitzvaPlus" />
        <MonoLine label="Version" value={getAppVersionLabel()} />
        <MonoLine
          label="Expo SDK"
          value={Constants.expoConfig?.sdkVersion ?? Constants.expoRuntimeVersion ?? '—'}
        />
        <MonoLine label="RN" value={Platform.constants?.reactNativeVersion?.minor ?? '—'} />
        <MonoLine label="Mode" value={__DEV__ ? 'development' : 'production'} />
        <MonoLine label="Platform" value={Platform.OS} />
        <MonoLine label="Timestamp" value={new Date().toISOString()} />
        <MonoLine label="Authenticated" value={isAuthenticated} />
        <MonoLine label="Supabase URL configured" value={supabaseUrlConfigured} />
        <MonoLine label="Anon key configured" value={supabaseAnonKeyConfigured} />
        <MonoLine label="Supabase client ready" value={isSupabaseConfigured} />
        <MonoLine label="Diagnostic Build ID" value={DIAGNOSTIC_BUILD_ID} />
      </Section>

      <Section title="Minyan Flow State">
        <MonoLine label="State" value={flow.state} />
        <MonoLine label="Mutation in flight" value={flow.mutationInFlight} />
        <MonoLine label="Selected OSM key" value={flow.selectedSynagogueOsmKey} />
        <MonoLine label="Mutation type" value={flow.currentMutationType} />
        <MonoLine label="Last mutation success" value={flow.lastMutationSuccess} />
        <MonoLine
          label="Last mutation at"
          value={flow.lastMutationAt ? new Date(flow.lastMutationAt).toISOString() : null}
        />
      </Section>

      <Section title="Selected Synagogue">
        <MonoLine label="Name" value={selectedSynagogue.name} />
        <MonoLine label="synagogue.id" value={selectedSynagogue.synagogueId} />
        <MonoLine label="synagogue_osm_key" value={selectedSynagogue.synagogueOsmKey} />
        <MonoLine label="OSM type" value={selectedSynagogue.osmType} />
        <MonoLine label="OSM id" value={selectedSynagogue.osmId} />
        <MonoLine label="Latitude" value={selectedSynagogue.latitude} />
        <MonoLine label="Longitude" value={selectedSynagogue.longitude} />
      </Section>

      <Section title="OSM Key Comparison">
        <Text style={[typography.caption, { writingDirection: 'ltr', marginBottom: 8 }]}>
          {formatOsmKeyComparison(osmComparison)}
        </Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          Anchor existence cannot be inspected from the client due to security policy.
        </Text>
      </Section>

      <DevLocationSection />

      <Section title="Device Location (mutation)">
        <MonoLine label="Location source" value={location.locationSource ?? 'GPS'} />
        <MonoLine label="User latitude" value={location.userLatitude} />
        <MonoLine label="User longitude" value={location.userLongitude} />
        <MonoLine label="Accuracy (m)" value={location.accuracyMeters} />
        <MonoLine label="Captured at" value={location.capturedAt} />
        <MonoLine label="Age (seconds)" value={location.ageSeconds} />
        <MonoLine label="Meets accuracy" value={location.meetsAccuracyRequirement} />
        <MonoLine
          label="Selected test synagogue"
          value={location.selectedTestSynagogueName}
        />
        <MonoLine
          label="Client distance (m)"
          value={location.clientDistanceToSynagogueMeters}
        />
        {location.overrideWarningActive ? (
          <Text style={[typography.caption, { color: colors.accent, marginTop: 4 }]}>
            WARNING: Development location override active
          </Text>
        ) : null}
        <Text style={[typography.caption, { color: colors.muted, marginTop: 4 }]}>
          Client distance is diagnostic only. Server remains authoritative.
        </Text>
      </Section>

      <Section title="List Active Reports">
        <MonoLine label="Success" value={listReports.success} />
        <MonoLine label="Returned count" value={listReports.returnedCount} />
        <MonoLine label="Expired discarded" value={listReports.expiredDiscardedCount} />
        <MonoLine label="Invalid OSM key" value={listReports.invalidOsmKeyCount} />
        <MonoLine label="Merged count" value={listReports.mergedCount} />
        <MonoLine label="Error" value={listReports.errorMessage} />
      </Section>

      <Section title="Last Error (diagnostic)">
        <MonoLine label="User message" value={lastError?.userMessage} />
        <MonoLine label="RPC" value={lastError?.rpcName} />
        <MonoLine label="Postgres" value={lastError?.postgresCode} />
        <MonoLine label="Details" value={lastError?.details} />
        <MonoLine label="Stage" value={lastError?.stage} />
        <MonoLine label="Minyan code" value={lastError?.minyanCode} />
      </Section>

      <Section title="RPC Trace (last 10)">
        {rpcHistory.length === 0 ? (
          <Text style={typography.caption}>No RPC calls recorded yet.</Text>
        ) : (
          rpcHistory.map((entry) => (
            <View key={entry.traceId} className="mb-3">
              <Text style={[typography.label, { writingDirection: 'ltr' }]}>
                {entry.rpcName}
              </Text>
              <MonoLine label="Status" value={entry.success ? 'SUCCESS' : 'FAILED'} />
              <MonoLine label="Code" value={entry.postgresCode} />
              <MonoLine label="Details" value={entry.details} />
              <MonoLine label="Stage" value={entry.stage} />
              <MonoLine label="Duration" value={`${entry.durationMs}ms`} />
            </View>
          ))
        )}
      </Section>

      <Section title="Parashat Hashavua">
        <MonoLine label="Device ISO" value={calendar?.deviceLocalIso} />
        <MonoLine label="Date key" value={calendar?.localDateKey} />
        <MonoLine label="Timezone" value={calendar?.timezone} />
        <MonoLine label="Target Shabbat" value={calendar?.targetShabbatDate} />
        <MonoLine label="Provider" value={calendar?.providerUsed} />
        <MonoLine label="Hebcal result" value={calendar?.hebcalResult} />
        <MonoLine label="Normalized parasha" value={calendar?.normalizedParashaName} />
        <MonoLine label="From cache" value={calendar?.fromCache} />
        <MonoLine label="Cache key" value={calendar?.cacheKey} />
        <MonoLine label="Cache version" value={calendar?.cacheVersion} />
        <MonoLine label="Fallback used" value={calendar?.fallbackUsed} />
        <MonoLine label="Error" value={calendar?.error} />
        <MonoLine label="Final weeklyParasha" value={calendar?.finalWeeklyParasha} />
      </Section>

      <Section title="Home Data Pipeline">
        <MonoLine label="Next event id" value={home?.nextEventId} />
        <MonoLine label="Event type" value={home?.nextEventType} />
        <MonoLine label="Title" value={home?.nextEventTitle} />
        <MonoLine label="Sub label" value={home?.nextEventSubLabel} />
        <MonoLine label="Hero label" value={home?.nextEventHeroLabel} />
        <MonoLine label="Theme key" value={home?.nextEventThemeKey} />
        <MonoLine label="Target datetime" value={home?.nextEventDatetime} />
        <MonoLine label="Remaining seconds" value={home?.nextEventRemainingSeconds} />
        <MonoLine label="Remaining ms" value={home?.nextEventRemainingMs} />
        <MonoLine label="Weekly parasha" value={home?.weeklyParashaFinal} />
        <MonoLine label="Parasha fallback" value={home?.weeklyParashaFallback} />
        <MonoLine label="Selected mitzvot count" value={home?.selectedMitzvotCount} />
        <MonoLine label="Preferences revision" value={home?.preferencesRevision} />
        <MonoLine
          label="Selected IDs"
          value={home?.selectedMitzvotIds?.join(', ') ?? '—'}
        />
      </Section>

      <Section title="Zmanim Location">
        <MonoLine label="Source" value={home?.zmanimLocationSource ?? holiday?.zmanimLocationSource} />
        <MonoLine label="Accuracy (m)" value={home?.zmanimLocationAccuracy ?? holiday?.zmanimLocationAccuracy} />
        <MonoLine label="Age (seconds)" value={home?.zmanimLocationAgeSeconds ?? holiday?.zmanimLocationAgeSeconds} />
      </Section>

      <Section title="Holiday Context">
        <MonoLine label="Holiday key" value={holiday?.holidayKey} />
        <MonoLine label="Holiday name" value={holiday?.holidayName} />
        <MonoLine label="Hours until" value={holiday?.hoursUntil} />
        <MonoLine label="Theme key" value={holiday?.themeKey} />
        <MonoLine label="Prep card enabled" value={holiday?.prepCardEnabled} />
        <MonoLine
          label="Trivia categories"
          value={holiday?.triviaCategories?.join(', ') ?? '—'}
        />
        <MonoLine label="Upcoming events" value={holiday?.upcomingEventCount} />
      </Section>

      <Section title="My Mitzvot">
        <MonoLine label="Selection count" value={myMitzvot?.selectionCount} />
        <MonoLine label="Preferences revision" value={myMitzvot?.preferencesRevision} />
        <MonoLine label="Last saved revision" value={myMitzvot?.lastSavedRevision} />
        <MonoLine label="Last save status" value={myMitzvot?.lastSaveStatus} />
        <MonoLine
          label="Last save timestamp"
          value={
            myMitzvot?.lastSaveTimestamp
              ? new Date(myMitzvot.lastSaveTimestamp).toISOString()
              : null
          }
        />
        <MonoLine label="Save was noop" value={myMitzvot?.lastSaveWasNoop} />
        <MonoLine
          label="Notification reconciliation"
          value={myMitzvot?.notificationReconciliationStatus}
        />
        <MonoLine label="Home refresh triggered" value={myMitzvot?.homeRefreshTriggered} />
      </Section>

      <Section title="Navigation">
        <MonoLine label="Latitude" value={navigationDiag?.latitude} />
        <MonoLine label="Longitude" value={navigationDiag?.longitude} />
        <MonoLine label="Android URL type" value={navigationDiag?.androidUrlType} />
        <MonoLine label="iOS URL type" value={navigationDiag?.iosUrlType} />
        <MonoLine label="canOpenURL succeeded" value={navigationDiag?.canOpenUrlSucceeded} />
        <MonoLine label="Fallback used" value={navigationDiag?.fallbackUsed} />
      </Section>

      <Section title="OVERPASS">
        <MonoLine label="Platform" value={overpass?.platform ?? Platform.OS} />
        <MonoLine
          label="Endpoint"
          value={
            overpass?.successfulEndpoint ??
            overpass?.endpointAttempts[0]?.endpoint ??
            null
          }
        />
        <MonoLine label="Status" value={overpass?.finalStatus} />
        <MonoLine
          label="Duration"
          value={
            overpass?.endpointAttempts.length
              ? overpass.endpointAttempts
                  .map((attempt) => `${attempt.durationMs}ms`)
                  .join(', ')
              : null
          }
        />
        <MonoLine
          label="Timeout"
          value={overpass?.timeoutMs ? `${overpass.timeoutMs}ms` : null}
        />
        <MonoLine
          label="Abort reason"
          value={overpass?.endpointAttempts.at(-1)?.abortReason}
        />
        <MonoLine label="Fallback endpoint" value={overpass?.fallbackEndpoint} />
        <MonoLine label="Final result" value={overpass?.finalResult} />
        <MonoLine label="Query radius (m)" value={overpass?.radiusMeters} />
        <MonoLine label="Element count" value={overpass?.elementCount} />
        <MonoLine label="Cache hit" value={overpass?.cacheHit} />
        <MonoLine label="Cache stale" value={overpass?.cacheStale} />
        <MonoLine label="Final source" value={overpass?.finalSource} />
        {overpass?.finalStatus === 'CACHE_FALLBACK' ? (
          <Text style={[typography.caption, { color: colors.accent, marginBottom: 8 }]}>
            OVERPASS CACHE FALLBACK
          </Text>
        ) : null}
        {overpass?.endpointAttempts.map((attempt, index) => (
          <View key={`${attempt.endpoint}-${attempt.startedAt}`} className="mb-3">
            <Text style={[typography.label, { writingDirection: 'ltr' }]}>
              Attempt {index + 1}
            </Text>
            <MonoLine label="Endpoint" value={attempt.endpoint} />
            <MonoLine label="Status" value={attempt.status} />
            <MonoLine label="Classification" value={attempt.classification} />
            <MonoLine label="Duration" value={`${attempt.durationMs}ms`} />
            <MonoLine label="HTTP status" value={attempt.httpStatus} />
            <MonoLine label="AbortController aborted" value={attempt.abortControllerAborted} />
            <MonoLine label="Client timeout abort" value={attempt.abortedByClientTimeout} />
            <MonoLine label="Network error name" value={attempt.networkErrorName} />
            <MonoLine label="Network error message" value={attempt.networkErrorMessage} />
          </View>
        ))}
        <MonoLine label="Probe status" value={overpass?.probeResult?.status} />
        <MonoLine label="Probe duration" value={overpass?.probeResult?.durationMs} />
        <MonoLine label="Probe classification" value={overpass?.probeResult?.classification} />
        <Pressable
          onPress={() => void handleOverpassProbe()}
          disabled={isProbeRunning}
          className="mt-2 items-center rounded-xl py-3"
          style={{ backgroundColor: colors.primary, opacity: isProbeRunning ? 0.6 : 1 }}
          accessibilityRole="button"
        >
          <Text style={[typography.body, { color: colors.white }]}>
            {isProbeRunning ? 'Running Overpass probe…' : 'Run Overpass probe'}
          </Text>
        </Pressable>
        {probeStatus ? (
          <Text style={[typography.caption, { marginTop: 8, writingDirection: 'ltr' }]}>
            {probeStatus}
          </Text>
        ) : null}
      </Section>

      <Section title="Debug Event Log">
        {eventLog.length === 0 ? (
          <Text style={typography.caption}>No events yet.</Text>
        ) : (
          eventLog.map((entry) => (
            <Text
              key={`${entry.timestamp}-${entry.eventName}`}
              style={[typography.caption, { marginBottom: 4, writingDirection: 'ltr' }]}
            >
              [{entry.category}][{entry.severity}] {entry.eventName}
              {entry.payload ? ` ${JSON.stringify(entry.payload)}` : ''}
            </Text>
          ))
        )}
      </Section>
    </ScreenContainer>
  );
}
