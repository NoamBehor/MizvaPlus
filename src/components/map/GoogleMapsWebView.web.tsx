import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, type View as RNView } from 'react-native';

import { MapMarkerLegend } from '@/components/map/MapMarkerLegend';
import { colors } from '@/constants/colors';
import {
  MAP_INITIAL_LATITUDE_DELTA,
  SYNAGOGUE_FOCUS_LATITUDE_DELTA,
} from '@/constants/synagogues';
import { typography } from '@/constants/theme';
import { loadGoogleMapsWebApi, resetGoogleMapsWebApiLoader } from '@/services/googleMaps/loadGoogleMapsWebApi';
import type { DevLocationOverrideSelection } from '@/services/devPreview/devLocationOverride';
import type { SynagogueWithMinyan } from '@/services/minyanLive/minyanLiveTypes';
import type { LocationSource } from '@/types/location';
import { isValidWgs84Coordinate } from '@/utils/coordinates';

const MAP_HEIGHT = 340;

function latitudeDeltaToZoom(latitudeDelta: number): number {
  return Math.max(8, Math.min(18, Math.round(Math.log2(360 / latitudeDelta))));
}

function resolveMarkerColor(
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

function buildPinIcon(fillColor: string): google.maps.Icon {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor,
    fillOpacity: 1,
    strokeColor: colors.white,
    strokeWeight: 1.5,
    scale: 1.35,
    anchor: new google.maps.Point(12, 22),
    labelOrigin: new google.maps.Point(12, 9),
  };
}

export interface GoogleMapsWebViewProps {
  center: { latitude: number; longitude: number };
  synagogues: SynagogueWithMinyan[];
  selectedSynagogueId: string | null;
  focusSynagogueId: string | null;
  locationSource: LocationSource | null;
  userAccuracyMeters: number | null;
  devOverride: DevLocationOverrideSelection | null;
  isFallbackLocation: boolean;
  onMarkerPress: (synagogue: SynagogueWithMinyan) => void;
  onMapReady?: () => void;
}

export function GoogleMapsWebView({
  center,
  synagogues,
  selectedSynagogueId,
  focusSynagogueId,
  locationSource,
  userAccuracyMeters,
  devOverride,
  isFallbackLocation,
  onMarkerPress,
  onMapReady,
}: GoogleMapsWebViewProps) {
  const containerRef = useRef<RNView | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const synagogueMarkersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const devMarkerRef = useRef<google.maps.Marker | null>(null);
  const resizeListenerRef = useRef<(() => void) | null>(null);
  const markerPressHandlerRef = useRef(onMarkerPress);
  const centerRef = useRef(center);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);

  markerPressHandlerRef.current = onMarkerPress;
  centerRef.current = center;

  const clearSynagogueMarkers = useCallback(() => {
    for (const marker of synagogueMarkersRef.current) {
      marker.setMap(null);
    }
    synagogueMarkersRef.current = [];
  }, []);

  const getContainerElement = useCallback((): HTMLElement | null => {
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) {
      return null;
    }
    return node;
  }, []);

  const initializeMap = useCallback(async () => {
    setLoadState('loading');

    try {
      await loadGoogleMapsWebApi();
      const container = getContainerElement();
      if (!container) {
        throw new Error('Map container is unavailable.');
      }

      const initialZoom = latitudeDeltaToZoom(MAP_INITIAL_LATITUDE_DELTA);

      mapRef.current = new google.maps.Map(container, {
        center: {
          lat: centerRef.current.latitude,
          lng: centerRef.current.longitude,
        },
        zoom: initialZoom,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy',
      });

      const handleResize = () => {
        const currentCenter = mapRef.current?.getCenter();
        if (!mapRef.current || !currentCenter) {
          return;
        }
        mapRef.current.setCenter({
          lat: currentCenter.lat(),
          lng: currentCenter.lng(),
        });
      };
      window.addEventListener('resize', handleResize);
      resizeListenerRef.current = handleResize;

      setLoadState('ready');
      onMapReady?.();
    } catch {
      setLoadState('error');
    }
  }, [getContainerElement, onMapReady]);

  useEffect(() => {
    void initializeMap();

    return () => {
      if (resizeListenerRef.current) {
        window.removeEventListener('resize', resizeListenerRef.current);
        resizeListenerRef.current = null;
      }
      clearSynagogueMarkers();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      devMarkerRef.current?.setMap(null);
      devMarkerRef.current = null;
      mapRef.current = null;
    };
  }, [clearSynagogueMarkers, initializeMap, retryCount]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== 'ready') {
      return;
    }

    map.setCenter({ lat: center.latitude, lng: center.longitude });
  }, [center.latitude, center.longitude, loadState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== 'ready') {
      return;
    }

    clearSynagogueMarkers();

    for (const synagogue of synagogues) {
      if (!isValidWgs84Coordinate(synagogue.coordinates)) {
        continue;
      }

      const hasMinyan = Boolean(synagogue.minyan);
      const marker = new google.maps.Marker({
        map,
        position: {
          lat: synagogue.coordinates.latitude,
          lng: synagogue.coordinates.longitude,
        },
        title: hasMinyan
          ? `🟡 חסרים ${synagogue.minyan?.missingCount ?? 0} למניין`
          : synagogue.name,
        icon: buildPinIcon(resolveMarkerColor(synagogue, selectedSynagogueId)),
        label: hasMinyan
          ? {
              text: '🟡',
              color: colors.text,
              fontSize: '12px',
            }
          : undefined,
        zIndex: hasMinyan ? 3 : selectedSynagogueId === synagogue.id ? 2 : 1,
      });

      marker.addListener('click', () => {
        markerPressHandlerRef.current(synagogue);
      });

      synagogueMarkersRef.current.push(marker);
    }
  }, [clearSynagogueMarkers, loadState, selectedSynagogueId, synagogues]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== 'ready') {
      return;
    }

    const showDevMarker = locationSource === 'DEV_OVERRIDE' && devOverride;
    const showUserMarker =
      !showDevMarker &&
      (locationSource === 'GPS' || locationSource === 'CACHED');

    devMarkerRef.current?.setMap(null);
    devMarkerRef.current = null;
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;

    if (showDevMarker && devOverride) {
      devMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: devOverride.latitude, lng: devOverride.longitude },
        title: `מיקום פיתוח — ${devOverride.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: colors.accent,
          fillOpacity: 1,
          strokeColor: colors.white,
          strokeWeight: 2,
        },
        zIndex: 5,
      });
      map.setCenter({ lat: devOverride.latitude, lng: devOverride.longitude });
      return;
    }

    if (showUserMarker) {
      userMarkerRef.current = new google.maps.Marker({
        map,
        position: { lat: center.latitude, lng: center.longitude },
        title: 'המיקום שלך',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#2563EB',
          fillOpacity: 1,
          strokeColor: colors.white,
          strokeWeight: 2,
        },
        zIndex: 4,
      });
    }
  }, [
    center.latitude,
    center.longitude,
    devOverride,
    loadState,
    locationSource,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || loadState !== 'ready' || !focusSynagogueId) {
      return;
    }

    const synagogue = synagogues.find((item) => item.id === focusSynagogueId);
    if (!synagogue) {
      return;
    }

    map.panTo({
      lat: synagogue.coordinates.latitude,
      lng: synagogue.coordinates.longitude,
    });
    map.setZoom(latitudeDeltaToZoom(SYNAGOGUE_FOCUS_LATITUDE_DELTA));
  }, [focusSynagogueId, loadState, synagogues]);

  const handleRetry = useCallback(() => {
    resetGoogleMapsWebApiLoader();
    setRetryCount((current) => current + 1);
  }, []);

  const isDevOverride = locationSource === 'DEV_OVERRIDE' && devOverride;

  return (
    <View
      className="mx-4 overflow-hidden rounded-2xl border"
      style={{
        height: MAP_HEIGHT,
        borderColor: isDevOverride ? colors.accent : colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          opacity: loadState === 'ready' ? 1 : 0,
        }}
      />

      {loadState === 'loading' ? (
        <View
          className="absolute inset-0 items-center justify-center px-6"
          style={{ backgroundColor: colors.surface }}
        >
          <Text style={[typography.body, { textAlign: 'center' }]}>טוענים מפה...</Text>
        </View>
      ) : null}

      {loadState === 'error' ? (
        <View
          className="absolute inset-0 items-center justify-center px-6"
          style={{ backgroundColor: colors.surface }}
        >
          <Text style={[typography.body, { textAlign: 'center', marginBottom: 16 }]}>
            לא הצלחנו לטעון את המפה
          </Text>
          <Pressable
            onPress={handleRetry}
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: colors.primary }}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.white, fontWeight: '700' }}>נסו שוב</Text>
          </Pressable>
        </View>
      ) : null}

      {loadState === 'ready' ? <MapMarkerLegend /> : null}

      {isFallbackLocation ? (
        <View
          pointerEvents="none"
          className="absolute start-2 end-2 top-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(254, 243, 199, 0.95)' }}
        >
          <Text style={[typography.caption, { textAlign: 'center' }]}>
            מיקום GPS לא זמין — מוצגים בתי כנסת לפי מיקום ברירת מחדל (ירושלים)
          </Text>
        </View>
      ) : null}

      {isDevOverride ? (
        <View
          pointerEvents="none"
          className="absolute bottom-2 start-2 end-2 rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(201, 162, 39, 0.92)' }}
        >
          <Text style={[typography.label, { color: colors.text, textAlign: 'center' }]}>
            מיקום פיתוח
          </Text>
          <Text style={[typography.bodySmall, { textAlign: 'center', marginTop: 2 }]}>
            {devOverride.name}
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.text, textAlign: 'center', writingDirection: 'ltr' },
            ]}
          >
            {devOverride.osmKey}
          </Text>
          <Text
            style={[
              typography.caption,
              { color: colors.text, textAlign: 'center', writingDirection: 'ltr' },
            ]}
          >
            {devOverride.latitude.toFixed(6)}, {devOverride.longitude.toFixed(6)}
            {userAccuracyMeters !== null ? ` · ${userAccuracyMeters}m` : ''}
          </Text>
        </View>
      ) : null}

      <View
        pointerEvents="none"
        className="absolute bottom-2 start-2 rounded px-2 py-1"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          bottom: isDevOverride ? 88 : 8,
        }}
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
  );
}
