import { DEV_PREVIEW_DEFAULT_COORDINATES } from '@/services/devPreview/devPreviewData';
import { resolveDevOverrideLocation } from '@/services/devPreview/devLocationOverride';
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

const BROWSER_GEOLOCATION_TIMEOUT_MS = 12_000;

function buildWebPreviewLocation(reason?: string): UserLocation {
  return {
    coordinates: DEV_PREVIEW_DEFAULT_COORDINATES,
    accuracy: 100,
    timestamp: Date.now(),
    source: 'FALLBACK',
    fallbackReason: reason,
  };
}

async function readBrowserPermissionState(): Promise<LocationPermissionStatus> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    if (result.state === 'granted') {
      return 'granted';
    }
    if (result.state === 'denied') {
      return 'blocked';
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function readBrowserGeolocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new LocationServiceError(
          'location_unavailable',
          'Browser geolocation is unavailable.',
        ),
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy:
            typeof position.coords.accuracy === 'number'
              ? position.coords.accuracy
              : undefined,
          timestamp: position.timestamp,
          source: 'GPS',
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new LocationServiceError(
              'permission_denied',
              'Location permission was denied.',
            ),
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(new LocationServiceError('timeout', 'Location request timed out.'));
          return;
        }

        reject(
          new LocationServiceError(
            'location_unavailable',
            'Current location is unavailable.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: BROWSER_GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  });
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  return readBrowserPermissionState();
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  try {
    await readBrowserGeolocation();
    return 'granted';
  } catch (error) {
    if (error instanceof LocationServiceError && error.code === 'permission_denied') {
      return readBrowserPermissionState();
    }

    const permission = await readBrowserPermissionState();
    return permission === 'unknown' ? 'denied' : permission;
  }
}

export async function getCurrentLocation(): Promise<UserLocation> {
  if (__DEV__) {
    const overrideLocation = resolveDevOverrideLocation();
    if (overrideLocation) {
      return overrideLocation;
    }
  }

  try {
    return await readBrowserGeolocation();
  } catch (error) {
    if (error instanceof LocationServiceError) {
      if (error.code === 'permission_denied') {
        throw error;
      }

      const reason =
        error.code === 'timeout'
          ? 'GPS request timed out and no cached location is available'
          : error.message;

      return buildWebPreviewLocation(reason);
    }

    return buildWebPreviewLocation('browser_geolocation_unavailable');
  }
}

export async function getCachedLocationIfPermitted(): Promise<UserLocation | null> {
  if (__DEV__) {
    const overrideLocation = resolveDevOverrideLocation();
    if (overrideLocation) {
      return overrideLocation;
    }
  }

  const permission = await getLocationPermissionStatus();
  if (permission !== 'granted') {
    return null;
  }

  return null;
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

export async function watchLocation(
  onUpdate: (location: UserLocation) => void,
): Promise<LocationWatchSubscription> {
  onUpdate(await getCurrentLocation());
  return { remove: () => undefined };
}

export async function areLocationServicesEnabled(): Promise<boolean> {
  return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
}

export type { Coordinates };
