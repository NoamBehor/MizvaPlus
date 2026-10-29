import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { MapMarkerLegend } from '@/components/map/MapMarkerLegend';
import { MapScreenHeader } from '@/components/map/MapScreenHeader';
import { LoadingPanel, MapStatePanel } from '@/components/map/MapStatePanel';
import { MapSynagogueSheet } from '@/components/map/MapSynagogueSheet';
import { colors } from '@/constants/colors';
import { DEFAULT_PLACE_NAME } from '@/constants/defaultPlace';
import {
  DEFAULT_SYNAGOGUE_RADIUS_METERS,
  MAP_INITIAL_LATITUDE_DELTA,
  MAP_INITIAL_LONGITUDE_DELTA,
  SYNAGOGUE_FOCUS_LATITUDE_DELTA,
  SYNAGOGUE_FOCUS_LONGITUDE_DELTA,
} from '@/constants/synagogues';
import { typography } from '@/constants/theme';
import { useCollapsingMapHeight } from '@/hooks/useCollapsingMapHeight';
import { useMinyanLive } from '@/hooks/useMinyanLive';
import { useScrollBottomInset } from '@/hooks/useScrollBottomInset';
import { useSynagogues } from '@/hooks/useSynagogues';
import { useUserLocation } from '@/hooks/useUserLocation';
import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { getLockedSearchCoordinates } from '@/services/map/synagogueSearchSession';
import {
  formatLocationPermissionForDiagnostics,
  getLocationAgeSeconds,
} from '@/services/location';
import { useAppStore } from '@/store/appStore';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import type { Synagogue } from '@/types/synagogue';
import {
  filterSynagoguesForMap,
  resolveDisplayedSynagogues,
  resolveMarkerPinColor,
  resolveSelectedSynagogueId,
  synagogueNeedsMinyan,
  takeMapDisplaySynagogues,
  type MapSynagogueFilter,
} from '@/utils/mapSynagogues';

export function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedSynagogueId, setSelectedSynagogueId] = useState<string | null>(
    null,
  );
  const [synagogueFilter, setSynagogueFilter] =
    useState<MapSynagogueFilter>('all');
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [mapTilesTimedOut, setMapTilesTimedOut] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const { scrollPaddingBottom } = useScrollBottomInset();
  const { onScroll, mapWrapperStyle, legendStyle } = useCollapsingMapHeight();

  const {
    location,
    status,
    isLoading: isLocationLoading,
    error: locationError,
    errorCode,
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

  const {
    synagogues,
    isLoading: isSynagoguesLoading,
    error: synagoguesError,
    cacheNotice,
    isStaleCache,
    isEmpty,
    refresh: refreshSynagogues,
  } = useSynagogues(coordinates, DEFAULT_SYNAGOGUE_RADIUS_METERS);

  const showMapContent = Boolean(location && coordinates);
  const isFallbackLocation = location?.source === 'FALLBACK';

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
      mapRenderer: 'NATIVE_REACT_NATIVE_MAPS',
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

  const initialRegion = useMemo<Region | null>(() => {
    if (!coordinates) {
      return null;
    }

    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      latitudeDelta: MAP_INITIAL_LATITUDE_DELTA,
      longitudeDelta: MAP_INITIAL_LONGITUDE_DELTA,
    };
  }, [coordinates]);

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

  const recenterOnUser = useCallback(
    (nextCoordinates: { latitude: number; longitude: number }) => {
      mapRef.current?.animateToRegion(
        {
          latitude: nextCoordinates.latitude,
          longitude: nextCoordinates.longitude,
          latitudeDelta: MAP_INITIAL_LATITUDE_DELTA,
          longitudeDelta: MAP_INITIAL_LONGITUDE_DELTA,
        },
        350,
      );
    },
    [],
  );

  const focusSynagogue = useCallback(
    (synagogue: Synagogue) => {
      setSelectedSynagogueId(synagogue.id);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      mapRef.current?.animateToRegion(
        {
          latitude: synagogue.coordinates.latitude,
          longitude: synagogue.coordinates.longitude,
          latitudeDelta: SYNAGOGUE_FOCUS_LATITUDE_DELTA,
          longitudeDelta: SYNAGOGUE_FOCUS_LONGITUDE_DELTA,
        },
        350,
      );
    },
    [],
  );

  const handleMarkerPress = useCallback((synagogue: Synagogue) => {
    focusSynagogue(synagogue);
  }, [focusSynagogue]);

  const handleRetryAll = useCallback(async () => {
    const nextLocation = await refreshLocation();
    const nextCoordinates = nextLocation?.coordinates ?? coordinates;
    if (nextCoordinates) {
      await refreshSynagogues(nextCoordinates);
      recenterOnUser(nextCoordinates);
    }
  }, [coordinates, recenterOnUser, refreshLocation, refreshSynagogues]);

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

  const showServicesDisabled =
    !isLocationLoading && errorCode === 'services_disabled';

  const showLocationError =
    !isLocationLoading &&
    !showServicesDisabled &&
    !showPermissionPrompt &&
    Boolean(locationError) &&
    !location;

  const showLocating = isLocationLoading && !location;

  const showMap = Boolean(location && initialRegion);
  const androidMapsKeyMissing =
    Platform.OS === 'android' &&
    Constants.expoConfig?.extra?.googleMapsAndroidConfigured === false;

  useEffect(() => {
    if (androidMapsKeyMissing || !showMap) {
      return;
    }

    setMapTilesLoaded(false);
    setMapTilesTimedOut(false);
    const timeoutId = setTimeout(() => {
      setMapTilesTimedOut(true);
      if (__DEV__) {
        logDiagnosticEvent('MAP', 'map_tiles_timed_out', 'warn', {
          platform: Platform.OS,
          googleMapsAndroidConfigured:
            Constants.expoConfig?.extra?.googleMapsAndroidConfigured !== false,
        });
      }
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [androidMapsKeyMissing, showMap]);

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

      {showServicesDisabled ? (
        <MapStatePanel
          title="שירותי המיקום כבויים"
          description="יש להפעיל את שירותי המיקום במכשיר כדי למצוא בתי כנסת בקרבתכם."
          actionLabel="נסו שוב"
          onAction={() => {
            void requestPermission();
          }}
        />
      ) : null}

      {showPermissionPrompt && !showServicesDisabled ? (
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
                ? 'הגישה למיקום חסומה. פתחו את הגדרות המכשיר, אפשרו מיקום לאפליקציה, ואז חזרו לכאן.'
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

      {showLocating ? (
        <LoadingPanel message="מאתרים את המיקום שלך..." />
      ) : null}

      {showMap && initialRegion ? (
        <View className="flex-1">
          <Animated.View collapsable={false} style={mapWrapperStyle}>
              {androidMapsKeyMissing ? (
                <MapStatePanel
                  title="לא ניתן להציג את המפה"
                  description="מפת Google לא הוגדרה בגרסה זו. חיפוש בתי הכנסת לפי המיקום עדיין זמין למטה."
                />
              ) : (
                <MapView
                  ref={mapRef}
                  style={{ width: '100%', height: '100%' }}
                  provider={
                    Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined
                  }
                  initialRegion={initialRegion}
                  showsUserLocation
                  showsMyLocationButton={false}
                  toolbarEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  onMapLoaded={() => {
                    setMapTilesLoaded(true);
                    setMapTilesTimedOut(false);
                    if (__DEV__) {
                      logDiagnosticEvent('MAP', 'map_tiles_loaded', 'info', {
                        platform: Platform.OS,
                      });
                    }
                  }}
                >
                  {mapSynagogues.map((synagogue) => (
                    <Marker
                      key={synagogue.id}
                      identifier={synagogue.id}
                      coordinate={synagogue.coordinates}
                      title={synagogue.name}
                      description={
                        synagogue.minyan
                          ? `מניין נדרש · חסרים ${synagogue.minyan.missingCount}`
                          : synagogue.address
                      }
                      pinColor={resolveMarkerPinColor(
                        synagogue,
                        selectedSynagogueId,
                      )}
                      onPress={() => handleMarkerPress(synagogue)}
                    />
                  ))}
                </MapView>
              )}
              {!androidMapsKeyMissing && mapTilesTimedOut && !mapTilesLoaded ? (
                <View
                  pointerEvents="none"
                  className="absolute rounded-xl px-3 py-2"
                  style={{
                    top: 12,
                    left: 24,
                    right: 24,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.muted, textAlign: 'center' },
                    ]}
                  >
                    לא הצלחנו לטעון את אריחי Google Maps. חיפוש בתי הכנסת ברשימה למטה אינו תלוי באריחים.
                  </Text>
                </View>
              ) : null}
              <Animated.View
                pointerEvents="none"
                style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, legendStyle]}
              >
                <MapMarkerLegend />
              </Animated.View>
              <View
                pointerEvents="none"
                className="absolute rounded px-2 py-1"
                style={{ left: 16, top: 12, backgroundColor: 'rgba(255, 255, 255, 0.88)' }}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.muted,
                      fontSize: 10,
                      writingDirection: 'ltr',
                    },
                  ]}
                >
                  © OpenStreetMap contributors
                </Text>
              </View>
          </Animated.View>

          <Animated.ScrollView
            ref={scrollViewRef}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
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
            emptyDescription={`לא מצאנו בתי כנסת בטווח של ${DEFAULT_SYNAGOGUE_RADIUS_METERS / 1000} ק"מ. נסו לרענן או לבדוק מיקום אחר.`}
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
