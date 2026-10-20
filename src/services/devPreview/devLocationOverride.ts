import { Platform } from 'react-native';

import { logDiagnosticEvent } from '@/services/diagnostics/diagnosticLogger';
import type { LocationSource, UserLocation } from '@/types/location';

/** Clearly marked development accuracy — not a real GPS reading. */
export const DEV_LOCATION_OVERRIDE_ACCURACY_METERS = 5;

export interface DevLocationOverrideSelection {
  osmKey: string;
  name: string;
  latitude: number;
  longitude: number;
}

type DevLocationOverrideListener = () => void;

let activeOverride: DevLocationOverrideSelection | null = null;
const listeners = new Set<DevLocationOverrideListener>();

function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDevLocationOverride(
  listener: DevLocationOverrideListener,
): () => void {
  if (!__DEV__) {
    return () => undefined;
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isDevLocationOverrideActive(): boolean {
  return __DEV__ && activeOverride !== null;
}

export function getDevLocationOverrideSelection(): DevLocationOverrideSelection | null {
  if (!__DEV__) {
    return null;
  }

  return activeOverride;
}

export function setDevLocationOverride(selection: DevLocationOverrideSelection): void {
  if (!__DEV__) {
    return;
  }

  activeOverride = {
    osmKey: selection.osmKey,
    name: selection.name,
    latitude: selection.latitude,
    longitude: selection.longitude,
  };

  logDiagnosticEvent('MAP', 'dev_location_override_enabled', 'warn', {
    osmKey: selection.osmKey,
    name: selection.name,
  });

  notifyListeners();
}

export function clearDevLocationOverride(): void {
  if (!__DEV__) {
    return;
  }

  if (!activeOverride) {
    return;
  }

  activeOverride = null;

  logDiagnosticEvent('MAP', 'dev_location_override_cleared', 'info');

  notifyListeners();
}

export function isDevMinyanLocationOverridePlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'web';
}

export function resolveDevOverrideLocation(): UserLocation | null {
  if (!__DEV__ || !activeOverride) {
    return null;
  }

  return {
    coordinates: {
      latitude: activeOverride.latitude,
      longitude: activeOverride.longitude,
    },
    accuracy: DEV_LOCATION_OVERRIDE_ACCURACY_METERS,
    timestamp: Date.now(),
    source: 'DEV_OVERRIDE',
  };
}

/**
 * Dev-only location for Minyan mutations on Android/Web E2E.
 * Always returns a fresh timestamp so RPC freshness checks pass.
 */
export function resolveDevOverrideLocationForMinyanMutation(): UserLocation | null {
  if (!__DEV__ || !isDevMinyanLocationOverridePlatform() || !activeOverride) {
    return null;
  }

  return resolveDevOverrideLocation();
}

export function resolveActiveLocationSource(
  location?: UserLocation | null,
): LocationSource {
  if (isDevLocationOverrideActive()) {
    return 'DEV_OVERRIDE';
  }

  if (location?.source) {
    return location.source;
  }

  return 'GPS';
}
