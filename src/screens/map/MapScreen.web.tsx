import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoogleMapsWebView } from '@/components/map/GoogleMapsWebView.web';
import { MapScreenHeader } from '@/components/map/MapScreenHeader';
import { LoadingPanel, MapStatePanel } from '@/components/map/MapStatePanel';
import { MapSynagogueSheet } from '@/components/map/MapSynagogueSheet';
import { colors } from '@/constants/colors';
import { DEFAULT_PLACE_NAME } from '@/constants/defaultPlace';
import { DEFAULT_SYNAGOGUE_RADIUS_METERS } from '@/constants/synagogues';
import { resolveSynagogueSearchRadiusMeters } from '@/constants/overpass';
import { useCollapsingMapHeight } from '@/hooks/useCollapsingMapHeight';
import { useMinyanLive } from '@/hooks/useMinyanLive';
import { useScrollBottomInset } from '@/hooks/useScrollBottomInset';
import { useSynagogues } from '@/hooks/useSynagogues';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  getDevLocationOverrideSelection,
  subscribeDevLocationOverride,
} from '@/services/devPreview/devLocationOverride';
import { getLockedSearchCoordinates } from '@/services/map/synagogueSearchSession';
import {
  formatLocationPermissionForDiagnostics,
  getLocationAgeSeconds,
} from '@/services/location';
import { useAppStore } from '@/store/appStore';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import type { Synagogue } from '@/types/synagogue';
import type { SynagogueWithMinyan } from '@/services/minyanLive/minyanLiveTypes';
import {
  filterSynagoguesForMap,
  resolveDisplayedSynagogues,
  resolveSelectedSynagogueId,
  synagogueNeedsMinyan,
  takeMapDisplaySynagogues,
  type MapSynagogueFilter,
} from '@/utils/mapSynagogues';

export function MapScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedSynagogueId, setSelectedSynagogueId] = useState<string | null>(
    null,
  );
  const [focusSynagogueId, setFocusSynagogueId] = useState<string | null>(null);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [synagogueFilter, setSynagogueFilter] =
    useState<MapSynagogueFilter>('all');
  const [devOverrideRevision, setDevOverrideRevision] = useState(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const { scrollPaddingBottom } = useScrollBottomInset();
  const { expandedHeight, onScroll, expandMap, mapWrapperStyle } =
    useCollapsingMapHeight();

  const {
    location,
    status,
    isLoading: isLocationLoading,
    error: locationError,
    requestPermission,
    refreshLocation,
  } = useUserLocation({ watch: true });

  const latitude = location?.coordinates.latitude;
  const longitude = location?.coordinates.longitude;

  const coordinates = useMemo(() => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return null;
    }
    return { latitude, longitude };
  }, [latitude, longitude]);

  const searchRadiusMeters = useMemo(
    () => resolveSynagogueSearchRadiusMeters(DEFAULT_SYNAGOGUE_RADIUS_METERS),
    [],
  );

  const {
    synagogues,
    isLoading: isSynagoguesLoading,
    error: synagoguesError,
    cacheNotice,
    isStaleCache,
    isEmpty,
    refresh: refreshSynagogues,
  } = useSynagogues(coordinates, searchRadiusMeters);

  const showMapContent = Boolean(location && coordinates);
  const isFallbackLocation = location?.source === 'FALLBACK';

  const devOverrideSelection = useMemo(() => {
    void devOverrideRevision;
    return getDevLocationOverrideSelection();
  }, [devOverrideRevision]);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    return subscribeDevLocationOverride(() => {
      setDevOverrideRevision((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const searchCenter = getLockedSearchCoordinates() ?? coordinates;
    useDiagnosticsStore.getState().setMapDiagnostics({
      locationSource: location?.source ?? null,
      permission: formatLocationPermissionForDiagnostics(status),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      accuracyMeters: location?.accuracy ?? null,
      ageSeconds: location ? getLocationAgeSeconds(location) : null,
      fallbackReason: location?.fallbackReason ?? null,
      overpassCenterLatitude: searchCenter?.latitude ?? null,
      overpassCenterLongitude: searchCenter?.longitude ?? null,
      overpassCenterSource: location?.source ?? null,
      mapRenderer: 'WEB_GOOGLE_MAPS',
    });
  }, [coordinates, location, status]);

  const {
    synagoguesWithMinyan,
    isLoading: isMinyanLiveLoading,
    loadError: minyanLiveLoadError,
    isMutating: isMinyanMutating,
    mutationSynagogueOsmKey: minyanMutationSynagogueOsmKey,
    mutationError: minyanMutationError,
    successMessage: minyanSuccessMessage,
    isOwnedReport,
    createReport,
    updateReport,
    fulfillReport,
    clearMutationError,
    clearSuccessMessage,
  } = useMinyanLive(synagogues, showMapContent);

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    useDiagnosticsStore.getState().setLoadedSynagogues(
      synagogues.map((synagogue) => ({
        osmKey: synagogue.id,
        name: synagogue.name,
        latitude: synagogue.coordinates.latitude,
        longitude: synagogue.coordinates.longitude,
      })),
    );
  }, [synagogues]);

  const displayedSynagogues = useMemo(
    () => resolveDisplayedSynagogues(synagoguesWithMinyan, synagogueFilter),
    [synagogueFilter, synagoguesWithMinyan],
  );

  const displayedAllCount = useMemo(
    () => takeMapDisplaySynagogues(synagoguesWithMinyan).length,
    [synagoguesWithMinyan],
  );

  const displayedMinyanCount = useMemo(
    () =>
      synagoguesWithMinyan.filter((synagogue) =>
        synagogueNeedsMinyan(synagogue.minyan),
      ).length,
    [synagoguesWithMinyan],
  );

  useEffect(() => {
    setSelectedSynagogueId((currentId) =>
      resolveSelectedSynagogueId(displayedSynagogues, currentId),
    );
  }, [displayedSynagogues]);

  const selectedSynagogue = useMemo(
    () =>
      displayedSynagogues.find((item) => item.id === selectedSynagogueId) ??
      null,
    [displayedSynagogues, selectedSynagogueId],
  );

  useEffect(() => {
    if (!__DEV__ || !selectedSynagogue) {
      return;
    }

    useDiagnosticsStore.getState().setSelectedSynagogue({
      name: selectedSynagogue.name,
      synagogueId: selectedSynagogue.id,
      synagogueOsmKey: selectedSynagogue.id,
      osmType: selectedSynagogue.osmType ?? null,
      osmId: selectedSynagogue.osmId ?? null,
      latitude: selectedSynagogue.coordinates.latitude,
      longitude: selectedSynagogue.coordinates.longitude,
    });
    useDiagnosticsStore
      .getState()
      .setActiveReportOsmKey(selectedSynagogue.minyan?.synagogueOsmKey ?? null);
  }, [selectedSynagogue]);

  const nearbySynagogues = useMemo(
    () =>
      displayedSynagogues.filter((item) => item.id !== selectedSynagogueId),
    [displayedSynagogues, selectedSynagogueId],
  );

  const handleMarkerPress = useCallback((synagogue: SynagogueWithMinyan) => {
    setSelectedSynagogueId(synagogue.id);
    setFocusSynagogueId(synagogue.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    expandMap();
  }, [expandMap]);

  const focusSynagogue = useCallback((synagogue: Synagogue) => {
    setSelectedSynagogueId(synagogue.id);
    setFocusSynagogueId(synagogue.id);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    expandMap();
  }, [expandMap]);

  const handleRetryAll = useCallback(async () => {
    const nextLocation = await refreshLocation();
    const nextCoordinates = nextLocation?.coordinates ?? coordinates;
    if (nextCoordinates) {
      await refreshSynagogues(nextCoordinates);
      setRecenterNonce((current) => current + 1);
    }
  }, [coordinates, refreshLocation, refreshSynagogues]);

  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing) {
      return;
    }

    setIsManualRefreshing(true);
    try {
      await handleRetryAll();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [handleRetryAll, isManualRefreshing]);

  const showPermissionPrompt =
    !isLocationLoading &&
    (status === 'unknown' || status === 'denied' || status === 'blocked') &&
    !location;

  const showLocationError =
    !isLocationLoading &&
    !showPermissionPrompt &&
    Boolean(locationError) &&
    !location;

  const showLocating = isLocationLoading && !location;
  const showMap = Boolean(location && coordinates);

  const mapSynagogues = useMemo(
    () => filterSynagoguesForMap(displayedSynagogues),
    [displayedSynagogues],
  );

  const headerLocationTone = useMemo(() => {
    if (showLocating) {
      return 'loading' as const;
    }
    if (isFallbackLocation) {
      return 'fallback' as const;
    }
    if (location) {
      return 'ok' as const;
    }
    return 'unknown' as const;
  }, [isFallbackLocation, location, showLocating]);

  const headerLocationLabel = useMemo(() => {
    if (isFallbackLocation) {
      return `מיקום GPS לא זמין — מוצגים בתי כנסת לפי ${DEFAULT_PLACE_NAME}`;
    }
    if (location?.source === 'GPS' && typeof location.accuracy === 'number') {
      return `מיקום מעודכן (±${Math.round(location.accuracy)} מ')`;
    }
    if (location) {
      return 'מיקום מעודכן';
    }
    return null;
  }, [isFallbackLocation, location]);

  return (
    <SafeAreaView
      className="flex-1"
      edges={['top']}
      style={{ backgroundColor: colors.surface }}
    >
      <MapScreenHeader
        locationLabel={headerLocationLabel}
        locationTone={headerLocationTone}
        synagogueCount={!isSynagoguesLoading ? displayedAllCount : 0}
        activeMinyanCount={displayedMinyanCount}
        filter={synagogueFilter}
        onFilterChange={setSynagogueFilter}
        onRefreshLocation={() => {
          void handleManualRefresh();
        }}
        isRefreshing={isManualRefreshing || isSynagoguesLoading}
      />

      {showPermissionPrompt ? (
        <MapStatePanel
          title={
            status === 'unknown'
              ? 'מצא בתי כנסת בקרבתך'
              : 'לא ניתן לגשת למיקום'
          }
          description={
            status === 'unknown'
              ? 'כדי למצוא בתי כנסת בקרבתך, נדרש אישור מיקום.'
              : status === 'blocked'
                ? 'הגישה למיקום חסומה. אפשרו מיקום בדפדפן ואז חזרו לכאן.'
                : 'כדי למצוא בתי כנסת בקרבתך, נדרש אישור מיקום.'
          }
          actionLabel="אפשר גישה למיקום"
          onAction={() => {
            void requestPermission();
          }}
        />
      ) : null}

      {showLocationError ? (
        <MapStatePanel
          title="לא ניתן לאתר את המיקום"
          description={
            locationError ??
            'אירעה שגיאה באיתור המיקום. בדקו את החיבור ונסו שוב.'
          }
          actionLabel="נסו שוב"
          onAction={() => {
            void refreshLocation();
          }}
        />
      ) : null}

      {showLocating ? <LoadingPanel message="מאתרים את המיקום שלך..." /> : null}

      {showMap && coordinates ? (
        <View className="flex-1">
          <Animated.View style={mapWrapperStyle}>
            <View style={{ height: expandedHeight, width: '100%' }}>
              <GoogleMapsWebView
                center={coordinates}
                synagogues={mapSynagogues}
                selectedSynagogueId={selectedSynagogueId}
                focusSynagogueId={focusSynagogueId}
                locationSource={location?.source ?? null}
                userAccuracyMeters={location?.accuracy ?? null}
                devOverride={devOverrideSelection}
                isFallbackLocation={isFallbackLocation}
                fillContainer
                followUser={false}
                recenterNonce={recenterNonce}
                onMarkerPress={handleMarkerPress}
              />
            </View>
          </Animated.View>
          <Animated.ScrollView
            ref={scrollViewRef}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
          >
          <MapSynagogueSheet
            location={location}
            selectedSynagogue={selectedSynagogue}
            nearbySynagogues={nearbySynagogues}
            displayedSynagogues={displayedSynagogues}
            totalCount={displayedSynagogues.length}
            isSynagoguesLoading={isSynagoguesLoading}
            synagoguesError={synagoguesError}
            isEmpty={isEmpty}
            emptyDescription={`לא מצאנו בתי כנסת בטווח של ${searchRadiusMeters / 1000} ק"מ. נסו לרענן או לבדוק מיקום אחר.`}
            cacheNotice={cacheNotice}
            isStaleCache={isStaleCache}
            isAuthenticated={isAuthenticated}
            isMinyanLiveLoading={isMinyanLiveLoading}
            minyanLiveLoadError={minyanLiveLoadError}
            isMinyanMutating={isMinyanMutating}
            minyanMutationSynagogueOsmKey={minyanMutationSynagogueOsmKey}
            minyanMutationError={minyanMutationError}
            minyanSuccessMessage={minyanSuccessMessage}
            isOwnedReport={isOwnedReport}
            onRetrySynagogues={() => {
              void refreshSynagogues(coordinates ?? undefined);
            }}
            onRetryAll={() => {
              void handleRetryAll();
            }}
            onFocusSynagogue={focusSynagogue}
            onCreateMinyan={(attendance) =>
              selectedSynagogue
                ? createReport(selectedSynagogue.id, attendance)
                : Promise.resolve(false)
            }
            onUpdateMinyan={(reportId, attendance) =>
              selectedSynagogue
                ? updateReport(selectedSynagogue.id, reportId, attendance)
                : Promise.resolve(false)
            }
            onFulfillMinyan={(reportId) =>
              selectedSynagogue
                ? fulfillReport(selectedSynagogue.id, reportId)
                : Promise.resolve(false)
            }
            onClearMinyanMutationError={clearMutationError}
            onClearMinyanSuccessMessage={clearSuccessMessage}
          />
          </Animated.ScrollView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
