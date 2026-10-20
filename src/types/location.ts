export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationSource =
  | 'GPS'
  | 'CACHED'
  | 'FALLBACK'
  | 'UNAVAILABLE'
  | 'DEV_OVERRIDE';

export interface UserLocation {
  coordinates: Coordinates;
  accuracy?: number;
  timestamp: number;
  /** Present when the location service can identify how coordinates were resolved. */
  source?: LocationSource;
  /** Human-readable reason when source is FALLBACK or UNAVAILABLE. */
  fallbackReason?: string;
}

export type LocationPermissionStatus =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'blocked';

export type LocationErrorCode =
  | 'permission_denied'
  | 'location_unavailable'
  | 'timeout'
  | 'services_disabled';

export interface LocationWatchSubscription {
  remove: () => void;
}
