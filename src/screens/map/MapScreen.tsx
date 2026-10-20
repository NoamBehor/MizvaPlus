import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapFloatingControls } from '@/components/map/MapFloatingControls';
import { MapMarkerLegend } from '@/components/map/MapMarkerLegend';
import { MapScreenHeader } from '@/components/map/MapScreenHeader';
import { SynagogueListCard } from '@/components/map/SynagogueListCard';
import { colors } from '@/constants/colors';
import {
  DEFAULT_SYNAGOGUE_RADIUS_METERS,
  MAP_INITIAL_LATITUDE_DELTA,
  MAP_INITIAL_LONGITUDE_DELTA,
  SYNAGOGUE_FOCUS_LATITUDE_DELTA,
  SYNAGOGUE_FOCUS_LONGITUDE_DELTA,
} from '@/constants/synagogues';
import { shadows, typography } from '@/constants/theme';
import { useMinyanLive } from '@/hooks/useMinyanLive';
import { useSynagogues } from '@/hooks/useSynagogues';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  formatLocationPermissionForDiagnostics,
  getLocationAgeSeconds,
} from '@/services/location';
import { useAppStore } from '@/store/appStore';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import type { SynagogueWithMinyan } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { filterSynagoguesForMap } from '@/utils/mapSynagogues';

function MapStatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text style={[typography.title, { textAlign: 'center', marginBottom: 12 }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.bodySmall,
          { textAlign: 'center', marginBottom: 24, lineHeight: 22 },
        ]}
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.primary }}
          accessibilityRole="button"
        >
          <Text
            style={{
              color: colors.white,
              fontWeight: '700',
              fontSize: 16,
              textAlign: 'center',
              writingDirection: 'rtl',
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" color={colors.accent} />
      <Text
        style={[
          typography.body,
          { marginTop: 16, textAlign: 'center' },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

function resolveMarkerPinColor(
  synagogue: SynagogueWithMinyan,
  selectedSynagogueId: string | null,
): string {
  if (synagogue.minyan) {
    return colors.accent;
  }

  if (selectedSynagogueId === synagogue.id) {
    return colors.secondary;
  }

  return colors.primary;
}

export function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [selectedSynagogueId, setSelectedSynagogueId] = useState<string | null>(
    null,
  );
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  const {
    location,
    status,
    isLoading: isLocationLoading,
    error: locationError,
    errorCode,
    requestPermission,
    refreshLocation,
  } = useUserLocation();

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
    isEmpty,
    refresh: refreshSynagogues,
  } = useSynagogues(coordinates, DEFAULT_SYNAGOGUE_RADIUS_METERS);

  const showMapContent = Boolean(location && coordinates);
  const isFallbackLocation = location?.source === 'FALLBACK';

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    useDiagnosticsStore.getState().setMapDiagnostics({
      locationSource: location?.source ?? null,
      permission: formatLocationPermissionForDiagnostics(status),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      accuracyMeters: location?.accuracy ?? null,
      ageSeconds: location ? getLocationAgeSeconds(location) : null,
      fallbackReason: location?.fallbackReason ?? null,
      overpassCenterLatitude: coordinates?.latitude ?? null,
      overpassCenterLongitude: coordinates?.longitude ?? null,
      overpassCenterSource: location?.source ?? null,
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

  useEffect(() => {
    if (!__DEV__ || !selectedSynagogueId) {
      return;
    }

    const synagogue = synagoguesWithMinyan.find(
      (item) => item.id === selectedSynagogueId,
    );
    if (!synagogue) {
      return;
    }

    useDiagnosticsStore.getState().setSelectedSynagogue({
      name: synagogue.name,
      synagogueId: synagogue.id,
      synagogueOsmKey: synagogue.id,
      osmType: synagogue.osmType ?? null,
      osmId: synagogue.osmId ?? null,
      latitude: synagogue.coordinates.latitude,
      longitude: synagogue.coordinates.longitude,
    });
    useDiagnosticsStore
      .getState()
      .setActiveReportOsmKey(synagogue.minyan?.synagogueOsmKey ?? null);
  }, [selectedSynagogueId, synagoguesWithMinyan]);

  const focusSynagogue = useCallback((synagogue: Synagogue) => {
    setSelectedSynagogueId(synagogue.id);
    mapRef.current?.animateToRegion(
      {
        latitude: synagogue.coordinates.latitude,
        longitude: synagogue.coordinates.longitude,
        latitudeDelta: SYNAGOGUE_FOCUS_LATITUDE_DELTA,
        longitudeDelta: SYNAGOGUE_FOCUS_LONGITUDE_DELTA,
      },
      350,
    );
  }, []);

  const handleMarkerPress = useCallback((synagogue: Synagogue) => {
    setSelectedSynagogueId(synagogue.id);
  }, []);

  const handleRetryAll = useCallback(() => {
    void refreshLocation();
    void refreshSynagogues();
  }, [refreshLocation, refreshSynagogues]);

  const handleRecenterMap = useCallback(() => {
    if (!initialRegion) {
      return;
    }
    mapRef.current?.animateToRegion(initialRegion, 350);
  }, [initialRegion]);

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

  const mapSynagogues = useMemo(
    () => filterSynagoguesForMap(synagoguesWithMinyan),
    [synagoguesWithMinyan],
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
      return 'מיקום GPS לא זמין — מוצגים בתי כנסת לפי ירושלים';
    }
    if (location?.source === 'GPS' && typeof location.accuracy === 'number') {
      return `מיקום מעודכן (±${Math.round(location.accuracy)} מ')`;
    }
    if (location) {
      return 'מיקום מעודכן';
    }
    return null;
  }, [isFallbackLocation, location]);

  const headerRefreshing = isLocationLoading || isSynagoguesLoading;

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <MapScreenHeader
        locationLabel={headerLocationLabel}
        locationTone={headerLocationTone}
        synagogueCount={
          !isSynagoguesLoading && synagogues.length > 0 ? synagogues.length : null
        }
        isRefreshing={headerRefreshing}
        onRefreshLocation={() => {
          void refreshLocation();
        }}
        onRefreshSynagogues={() => {
          void refreshSynagogues();
        }}
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
          <View
            className="mx-4 overflow-hidden rounded-2xl border"
            style={[
              shadows.hero,
              {
                height: 340,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <MapView
              ref={mapRef}
              style={{ width: '100%', height: '100%' }}
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
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
                  pinColor={resolveMarkerPinColor(synagogue, selectedSynagogueId)}
                  onPress={() => handleMarkerPress(synagogue)}
                />
              ))}
            </MapView>
            <MapMarkerLegend />
            <MapFloatingControls
              onRecenter={handleRecenterMap}
              onRefreshSynagogues={() => {
                void refreshSynagogues();
              }}
            />
            <View
              pointerEvents="none"
              className="absolute bottom-2 start-2 rounded px-2 py-1"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.88)' }}
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
          </View>

          <View className="flex-1 px-4 pt-3">
            {isSynagoguesLoading ? (
              <LoadingPanel message="מחפש בתי כנסת בסביבה..." />
            ) : null}

            {!isSynagoguesLoading && synagoguesError ? (
              <MapStatePanel
                title="לא הצלחנו לטעון בתי כנסת כרגע"
                description={synagoguesError}
                actionLabel="נסו שוב"
                onAction={() => {
                  void refreshSynagogues();
                }}
              />
            ) : null}

            {!isSynagoguesLoading && !synagoguesError && isEmpty ? (
              <MapStatePanel
                title="לא נמצאו בתי כנסת באזור"
                description={`לא מצאנו בתי כנסת בטווח של ${DEFAULT_SYNAGOGUE_RADIUS_METERS / 1000} ק"מ. נסו לרענן או לבדוק מיקום אחר.`}
                actionLabel="רענון"
                onAction={handleRetryAll}
              />
            ) : null}

            {!isSynagoguesLoading && !synagoguesError && synagogues.length > 0 ? (
              <FlatList
                data={synagoguesWithMinyan}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                  <View className="mb-2 gap-1">
                    <Text style={typography.label}>
                      {`${synagogues.length} בתי כנסת בקרבתך`}
                    </Text>
                    {isAuthenticated && isMinyanLiveLoading ? (
                      <Text style={[typography.caption, { color: colors.muted }]}>
                        מעדכן מצב מניינים...
                      </Text>
                    ) : null}
                    {isAuthenticated && minyanLiveLoadError ? (
                      <Text style={[typography.caption, { color: colors.error }]}>
                        {minyanLiveLoadError}
                      </Text>
                    ) : null}
                  </View>
                }
                renderItem={({ item }) => (
                  <SynagogueListCard
                    synagogue={item}
                    selected={selectedSynagogueId === item.id}
                    onPress={focusSynagogue}
                    minyan={item.minyan}
                    isAuthenticated={isAuthenticated}
                    isOwnedReport={
                      item.minyan ? isOwnedReport(item.id, item.minyan.id) : false
                    }
                    isMinyanMutating={isMinyanMutating}
                    minyanMutationSynagogueOsmKey={minyanMutationSynagogueOsmKey}
                    minyanMutationError={
                      selectedSynagogueId === item.id ? minyanMutationError : null
                    }
                    minyanSuccessMessage={
                      selectedSynagogueId === item.id ? minyanSuccessMessage : null
                    }
                    onCreateMinyan={(attendance) => createReport(item.id, attendance)}
                    onUpdateMinyan={(reportId, attendance) =>
                      updateReport(item.id, reportId, attendance)
                    }
                    onFulfillMinyan={(reportId) => fulfillReport(item.id, reportId)}
                    onClearMinyanMutationError={clearMutationError}
                    onClearMinyanSuccessMessage={clearSuccessMessage}
                  />
                )}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
