import * as Location from 'expo-location';

import type {
  Coordinates,
  LocationErrorCode,
  LocationPermissionStatus,
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

function toUserLocation(position: Location.LocationObject): UserLocation {
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
 * Retrieves the device's current location. Requires granted permission.
 */
export async function getCurrentLocation(): Promise<UserLocation> {
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

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return toUserLocation(position);
  } catch (error) {
    throw mapNativeError(error);
  }
}

/**
 * Subscribes to location updates. Caller must call `remove()` on unmount.
 * Prefer a one-shot `getCurrentLocation` unless continuous updates are required.
 */
export async function watchLocation(
  onUpdate: (location: UserLocation) => void,
  onError?: (error: LocationServiceError) => void,
): Promise<LocationWatchSubscription> {
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
      onUpdate(toUserLocation(position));
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
