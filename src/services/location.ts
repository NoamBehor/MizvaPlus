import * as Location from 'expo-location';

import { DEV_PREVIEW_DEFAULT_COORDINATES } from '@/services/devPreview/devPreviewData';
import { resolveDevOverrideLocation } from '@/services/devPreview/devLocationOverride';
import type {
  Coordinates,
  LocationErrorCode,
  LocationPermissionStatus,
  LocationSource,
  LocationWatchSubscription,
  UserLocation,
} from '@/types/location';

export class LocationServiceError extends Error {
  readonly code: LocationErrorCode;

  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.name = 'LocationServiceError';
    this.code = code;
  }
}

const GPS_REQUEST_TIMEOUT_MS = 12_000;

function mapPermissionStatus(
  status: Location.PermissionStatus,
  canAskAgain: boolean,
): LocationPermissionStatus {
  if (status === Location.PermissionStatus.GRANTED) {
    return 'granted';
  }

  if (status === Location.PermissionStatus.UNDETERMINED) {
    return 'unknown';
  }

  // Denied and the OS will not show the prompt again → treat as blocked.
  if (!canAskAgain) {
    return 'blocked';
  }

  return 'denied';
}

function toUserLocation(
  position: Location.LocationObject,
  source: 'GPS' | 'CACHED',
): UserLocation {
  return {
    coordinates: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    },
    accuracy:
      typeof position.coords.accuracy === 'number'
        ? position.coords.accuracy
        : undefined,
    timestamp: position.timestamp,
    source,
  };
}

function buildFallbackLocation(reason: string): UserLocation {
  return {
    coordinates: DEV_PREVIEW_DEFAULT_COORDINATES,
    timestamp: Date.now(),
    source: 'FALLBACK',
    fallbackReason: reason,
  };
}

function mapNativeError(error: unknown): LocationServiceError {
  if (error instanceof LocationServiceError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes('timeout')) {
    return new LocationServiceError('timeout', 'Location request timed out.');
  }

  if (
    message.includes('disabled') ||
    message.includes('location services') ||
    message.includes('not enabled')
  ) {
    return new LocationServiceError(
      'services_disabled',
      'Device location services are disabled.',
    );
  }

  if (
    message.includes('permission') ||
    message.includes('denied') ||
    message.includes('unauthorized')
  ) {
    return new LocationServiceError(
      'permission_denied',
      'Location permission was denied.',
    );
  }

  return new LocationServiceError(
    'location_unavailable',
    'Current location is unavailable.',
  );
}

async function readLastKnownPosition(): Promise<UserLocation | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (!lastKnown) {
      return null;
    }

    return toUserLocation(lastKnown, 'CACHED');
  } catch {
    return null;
  }
}

async function readCurrentGpsPosition(): Promise<UserLocation> {
  const position = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Location request timed out.'));
      }, GPS_REQUEST_TIMEOUT_MS);
    }),
  ]);

  return toUserLocation(position, 'GPS');
}

async function assertLocationAccess(): Promise<void> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationServiceError(
      'services_disabled',
      'Device location services are disabled.',
    );
  }

  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new LocationServiceError(
      'permission_denied',
      'Location permission was denied.',
    );
  }
}

/**
 * Returns the current foreground location permission without prompting.
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const result = await Location.getForegroundPermissionsAsync();
  return mapPermissionStatus(result.status, result.canAskAgain);
}

/**
 * Requests foreground location permission and returns the mapped status.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationServiceError(
      'services_disabled',
      'Device location services are disabled.',
    );
  }

  const result = await Location.requestForegroundPermissionsAsync();
  return mapPermissionStatus(result.status, result.canAskAgain);
}

/**
 * Returns a cached last-known position when permission is granted.
 * Used for quick map startup before a fresh GPS fix is available.
 */
export async function getCachedLocationIfPermitted(): Promise<UserLocation | null> {
  if (__DEV__) {
    const overrideLocation = resolveDevOverrideLocation();
    if (overrideLocation) {
      return overrideLocation;
    }
  }

  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return null;
  }

  return readLastKnownPosition();
}

/**
 * Resolves device location using last-known cache, then a fresh GPS fix.
 * Never silently substitutes Jerusalem when permission is denied.
 */
export async function resolveDeviceLocation(): Promise<UserLocation> {
  if (__DEV__) {
    const overrideLocation = resolveDevOverrideLocation();
    if (overrideLocation) {
      return overrideLocation;
    }
  }

  await assertLocationAccess();

  const cached = await readLastKnownPosition();

  try {
    return await readCurrentGpsPosition();
  } catch (error) {
    if (cached) {
      return cached;
    }

    const mapped = mapNativeError(error);
    const reason =
      mapped.code === 'timeout'
        ? 'GPS request timed out and no cached location is available'
        : mapped.message;

    return buildFallbackLocation(reason);
  }
}

/**
 * Retrieves the device's current location. Requires granted permission unless
 * a development override is active. May return CACHED or explicit FALLBACK.
 */
export async function getCurrentLocation(): Promise<UserLocation> {
  return resolveDeviceLocation();
}

export function getLocationAgeSeconds(location: UserLocation): number {
  return Math.max(0, Math.round((Date.now() - location.timestamp) / 1000));
}

export function formatLocationPermissionForDiagnostics(
  status: LocationPermissionStatus,
): 'GRANTED' | 'DENIED' | 'UNKNOWN' {
  if (status === 'granted') {
    return 'GRANTED';
  }

  if (status === 'denied' || status === 'blocked') {
    return 'DENIED';
  }

  return 'UNKNOWN';
}

export function resolveLocationSourceLabel(
  location: UserLocation | null | undefined,
): LocationSource | null {
  return location?.source ?? null;
}

/**
 * Subscribes to location updates. Caller must call `remove()` on unmount.
 * Prefer a one-shot `getCurrentLocation` unless continuous updates are required.
 */
export async function watchLocation(
  onUpdate: (location: UserLocation) => void,
  onError?: (error: LocationServiceError) => void,
): Promise<LocationWatchSubscription> {
  if (__DEV__) {
    const overrideLocation = resolveDevOverrideLocation();
    if (overrideLocation) {
      onUpdate(overrideLocation);
      return { remove: () => undefined };
    }
  }

  try {
    const initial = await resolveDeviceLocation();
    onUpdate(initial);
  } catch (error) {
    onError?.(mapNativeError(error));
    throw mapNativeError(error);
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationServiceError(
      'services_disabled',
      'Device location services are disabled.',
    );
  }

  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new LocationServiceError(
      'permission_denied',
      'Location permission was denied.',
    );
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25,
      timeInterval: 10_000,
    },
    (position) => {
      onUpdate(toUserLocation(position, 'GPS'));
    },
    (reason) => {
      onError?.(mapNativeError(new Error(reason)));
    },
  );

  return {
    remove: () => {
      subscription.remove();
    },
  };
}

export async function areLocationServicesEnabled(): Promise<boolean> {
  return Location.hasServicesEnabledAsync();
}

/** Re-export Coordinates for callers that previously imported from this module. */
export type { Coordinates };
