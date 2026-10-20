import { Linking, Platform } from 'react-native';

import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import { useDiagnosticsStore } from '@/store/diagnosticsStore';
import type { Coordinates } from '@/types/location';

export interface SynagogueNavigationTarget {
  name: string;
  coordinates: Coordinates;
}

export interface SynagogueNavigationUrls {
  primary: string;
  fallback: string;
}

function isFiniteLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidSynagogueNavigationTarget(
  target: SynagogueNavigationTarget,
): boolean {
  const { latitude, longitude } = target.coordinates;
  return isFiniteLatitude(latitude) && isValidLongitude(longitude);
}

export function buildSynagogueNavigationUrls(
  target: SynagogueNavigationTarget,
): SynagogueNavigationUrls | null {
  if (!isValidSynagogueNavigationTarget(target)) {
    return null;
  }

  const { latitude, longitude } = target.coordinates;
  const label = encodeURIComponent(target.name.trim() || 'בית כנסת');

  if (Platform.OS === 'ios') {
    const primary = `maps://?daddr=${latitude},${longitude}&dirflg=d`;
    const fallback = `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d&q=${label}`;
    return { primary, fallback };
  }

  if (Platform.OS === 'web') {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
    return { primary: mapsUrl, fallback: mapsUrl };
  }

  const primary = `google.navigation:q=${latitude},${longitude}`;
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
  return { primary, fallback };
}

export async function openSynagogueNavigation(
  target: SynagogueNavigationTarget,
): Promise<{ opened: boolean; error?: string }> {
  const urls = buildSynagogueNavigationUrls(target);
  if (!urls) {
    return { opened: false, error: 'invalid_coordinates' };
  }

  const androidUrlType =
    Platform.OS === 'android' ? 'google.navigation' : null;
  const iosUrlType = Platform.OS === 'ios' ? 'maps://' : null;

  try {
    const canOpenPrimary = await Linking.canOpenURL(urls.primary);
    if (canOpenPrimary) {
      await Linking.openURL(urls.primary);
      if (__DEV__) {
        useDiagnosticsStore.getState().setNavigationSnapshot({
          latitude: target.coordinates.latitude,
          longitude: target.coordinates.longitude,
          androidUrlType,
          iosUrlType,
          canOpenUrlSucceeded: true,
          fallbackUsed: false,
          capturedAt: Date.now(),
        });
        logDiagnosticEvent('NAVIGATION', 'open_primary', 'info', {
          platform: Platform.OS,
        });
      }
      return { opened: true };
    }

    await Linking.openURL(urls.fallback);
    if (__DEV__) {
      useDiagnosticsStore.getState().setNavigationSnapshot({
        latitude: target.coordinates.latitude,
        longitude: target.coordinates.longitude,
        androidUrlType,
        iosUrlType,
        canOpenUrlSucceeded: false,
        fallbackUsed: true,
        capturedAt: Date.now(),
      });
      logDiagnosticEvent('NAVIGATION', 'open_fallback', 'info');
    }
    return { opened: true };
  } catch {
    try {
      await Linking.openURL(urls.fallback);
      if (__DEV__) {
        useDiagnosticsStore.getState().setNavigationSnapshot({
          latitude: target.coordinates.latitude,
          longitude: target.coordinates.longitude,
          androidUrlType,
          iosUrlType,
          canOpenUrlSucceeded: false,
          fallbackUsed: true,
          capturedAt: Date.now(),
        });
      }
      return { opened: true };
    } catch {
      if (__DEV__) {
        useDiagnosticsStore.getState().setNavigationSnapshot({
          latitude: target.coordinates.latitude,
          longitude: target.coordinates.longitude,
          androidUrlType,
          iosUrlType,
          canOpenUrlSucceeded: false,
          fallbackUsed: true,
          capturedAt: Date.now(),
        });
        logDiagnosticEvent('NAVIGATION', 'open_failed', 'error');
      }
      return { opened: false, error: 'open_failed' };
    }
  }
}
