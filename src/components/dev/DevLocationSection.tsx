import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import {
  clearDevLocationOverride,
  getDevLocationOverrideSelection,
  isDevLocationOverrideActive,
  resolveActiveLocationSource,
  setDevLocationOverride,
  subscribeDevLocationOverride,
} from '@/services/devPreview/devLocationOverride';
import { getCurrentLocation, getLocationAgeSeconds } from '@/services/location';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import { calculateDistanceMeters } from '@/utils/distance';

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

export function DevLocationSection() {
  const loadedSynagogues = useDiagnosticsStore((state) => state.loadedSynagogues);
  const selectedSynagogue = useDiagnosticsStore((state) => state.selectedSynagogue);
  const locationDiagnostics = useDiagnosticsStore((state) => state.location);
  const [overrideRevision, setOverrideRevision] = useState(0);
  const [liveLatitude, setLiveLatitude] = useState<number | null>(null);
  const [liveLongitude, setLiveLongitude] = useState<number | null>(null);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [liveSource, setLiveSource] = useState<string | null>(null);
  const [liveAgeSeconds, setLiveAgeSeconds] = useState<number | null>(null);
  const [liveFallbackReason, setLiveFallbackReason] = useState<string | null>(null);

  const overrideActive = isDevLocationOverrideActive();
  const activeOverride = getDevLocationOverrideSelection();

  useEffect(() => {
    return subscribeDevLocationOverride(() => {
      setOverrideRevision((current) => current + 1);
    });
  }, []);

  const refreshLiveLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      setLiveLatitude(location.coordinates.latitude);
      setLiveLongitude(location.coordinates.longitude);
      setLiveAccuracy(location.accuracy ?? null);
      setLiveSource(resolveActiveLocationSource(location));
      setLiveAgeSeconds(getLocationAgeSeconds(location));
      setLiveFallbackReason(location.fallbackReason ?? null);
    } catch {
      setLiveLatitude(null);
      setLiveLongitude(null);
      setLiveAccuracy(null);
      setLiveSource(resolveActiveLocationSource());
      setLiveAgeSeconds(null);
      setLiveFallbackReason(null);
    }
  }, []);

  useEffect(() => {
    void refreshLiveLocation();
  }, [overrideRevision, refreshLiveLocation]);

  const distanceMeters = useMemo(() => {
    if (
      liveLatitude === null ||
      liveLongitude === null ||
      selectedSynagogue.latitude === null ||
      selectedSynagogue.longitude === null
    ) {
      return null;
    }

    return Math.round(
      calculateDistanceMeters(
        { latitude: liveLatitude, longitude: liveLongitude },
        {
          latitude: selectedSynagogue.latitude,
          longitude: selectedSynagogue.longitude,
        },
      ),
    );
  }, [liveLatitude, liveLongitude, selectedSynagogue.latitude, selectedSynagogue.longitude]);

  const handleEnableOverride = useCallback(
    (synagogue: {
      osmKey: string;
      name: string;
      latitude: number;
      longitude: number;
    }) => {
      setDevLocationOverride(synagogue);
      void refreshLiveLocation();
    },
    [refreshLiveLocation],
  );

  const handleDisableOverride = useCallback(() => {
    clearDevLocationOverride();
    void refreshLiveLocation();
  }, [refreshLiveLocation]);

  if (!__DEV__) {
    return null;
  }

  return (
    <View
      className="mb-4 rounded-2xl border p-4"
      style={{ borderColor: colors.border, backgroundColor: colors.surface }}
    >
      <Text style={[typography.subtitle, { marginBottom: 8 }]}>מיקום פיתוח</Text>

      <Text style={[typography.bodySmall, { marginBottom: 12 }]}>
        {overrideActive ? 'מיקום מדומה' : 'מיקום אמיתי'}
      </Text>

      {overrideActive && activeOverride ? (
        <View
          className="mb-4 rounded-xl px-3 py-3"
          style={{ backgroundColor: colors.secondary }}
        >
          <Text style={[typography.label, { color: colors.white, marginBottom: 8 }]}>
            מיקום פיתוח — DEV_OVERRIDE
          </Text>
          <MonoLine label="Synagogue" value={activeOverride.name} />
          <MonoLine label="OSM" value={activeOverride.osmKey} />
          <MonoLine label="Latitude" value={activeOverride.latitude} />
          <MonoLine label="Longitude" value={activeOverride.longitude} />
          <MonoLine label="Source" value="DEV_OVERRIDE" />
          <Text style={[typography.caption, { color: colors.white, marginTop: 8 }]}>
            מיקום פיתוח בלבד — לא GPS אמיתי
          </Text>
        </View>
      ) : null}

      <MonoLine
        label="Location source"
        value={liveSource ?? locationDiagnostics.locationSource ?? 'GPS'}
      />
      <MonoLine label="Latitude" value={liveLatitude ?? locationDiagnostics.userLatitude} />
      <MonoLine label="Longitude" value={liveLongitude ?? locationDiagnostics.userLongitude} />
      <MonoLine
        label="Accuracy"
        value={
          liveAccuracy !== null
            ? `${liveAccuracy}m`
            : locationDiagnostics.accuracyMeters !== null
              ? `${locationDiagnostics.accuracyMeters}m`
              : null
        }
      />
      <MonoLine label="Age" value={liveAgeSeconds !== null ? `${liveAgeSeconds}s` : null} />
      <MonoLine label="Fallback reason" value={liveFallbackReason} />
      <MonoLine
        label="Selected test synagogue"
        value={
          activeOverride?.name ??
          locationDiagnostics.selectedTestSynagogueName ??
          selectedSynagogue.name
        }
      />
      <MonoLine label="Distance" value={distanceMeters !== null ? `${distanceMeters}m` : null} />
      <MonoLine label="Anchor" value="Server-side" />

      {overrideActive ? (
        <Text style={[typography.caption, { color: colors.accent, marginVertical: 8 }]}>
          WARNING: Development location override active
        </Text>
      ) : null}

      {overrideActive ? (
        <Pressable
          onPress={handleDisableOverride}
          className="mb-4 items-center rounded-xl py-3"
          style={{ backgroundColor: colors.primary }}
          accessibilityRole="button"
        >
          <Text style={[typography.body, { color: colors.white }]}>הפסק מיקום מדומה</Text>
        </Pressable>
      ) : null}

      {loadedSynagogues.length === 0 ? (
        <Text style={[typography.caption, { color: colors.muted }]}>
          טענו את מסך המפה כדי לראות בתי כנסת מהרשימה הנוכחית של Overpass.
        </Text>
      ) : (
        loadedSynagogues.map((synagogue) => (
          <View
            key={synagogue.osmKey}
            className="mb-3 rounded-xl border px-3 py-3"
            style={{ borderColor: colors.border }}
          >
            <Text style={[typography.body, { marginBottom: 8 }]}>{synagogue.name}</Text>
            <MonoLine label="OSM" value={synagogue.osmKey} />
            {!overrideActive ? (
              <Pressable
                onPress={() => handleEnableOverride(synagogue)}
                className="mt-2 items-center rounded-lg py-2"
                style={{ backgroundColor: colors.accent }}
                accessibilityRole="button"
              >
                <Text style={[typography.caption, { color: colors.white }]}>
                  השתמש כמיקום פיתוח
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
