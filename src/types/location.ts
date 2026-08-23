export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UserLocation {
  coordinates: Coordinates;
  accuracy?: number;
  timestamp: number;
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
