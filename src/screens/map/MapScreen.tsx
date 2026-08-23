import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SynagogueListCard } from '@/components/map/SynagogueListCard';
import { colors } from '@/constants/colors';
import {
  DEFAULT_SYNAGOGUE_RADIUS_METERS,
  MAP_INITIAL_LATITUDE_DELTA,
  MAP_INITIAL_LONGITUDE_DELTA,
  SYNAGOGUE_FOCUS_LATITUDE_DELTA,
  SYNAGOGUE_FOCUS_LONGITUDE_DELTA,
} from '@/constants/synagogues';
import { typography } from '@/constants/theme';
import { useSynagogues } from '@/hooks/useSynagogues';
import { useUserLocation } from '@/hooks/useUserLocation';
import type { Synagogue } from '@/types/synagogue';

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

export function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [selectedSynagogueId, setSelectedSynagogueId] = useState<string | null>(
    null,
  );

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

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <View className="px-4 pb-2 pt-3">
        <Text style={typography.title}>בתי כנסת בקרבתך</Text>
        <Text style={[typography.bodySmall, { marginTop: 4 }]}>
          מצאו מקומות תפילה ומניינים קרובים לפי המיקום שלכם
        </Text>
      </View>

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
              ? 'כדי להציג בתי כנסת ומניינים קרובים, יש לאפשר גישה למיקום המכשיר.'
              : status === 'blocked'
                ? 'הגישה למיקום חסומה. פתחו את הגדרות המכשיר, אפשרו מיקום לאפליקציה, ואז חזרו לכאן.'
                : 'אנו זקוקים למיקום שלכם כדי למצוא בתי כנסת ומקומות תפילה בקרבתכם.'
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
            style={{
              height: 280,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
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
              {synagogues.map((synagogue) => (
                <Marker
                  key={synagogue.id}
                  identifier={synagogue.id}
                  coordinate={synagogue.coordinates}
                  title={synagogue.name}
                  description={synagogue.address}
                  pinColor={
                    selectedSynagogueId === synagogue.id
                      ? colors.accent
                      : colors.primary
                  }
                  onPress={() => handleMarkerPress(synagogue)}
                />
              ))}
            </MapView>
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
                data={synagogues}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListHeaderComponent={
                  <Text style={[typography.label, { marginBottom: 8 }]}>
                    {`${synagogues.length} בתי כנסת בקרבתך`}
                  </Text>
                }
                renderItem={({ item }) => (
                  <SynagogueListCard
                    synagogue={item}
                    selected={selectedSynagogueId === item.id}
                    onPress={focusSynagogue}
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
