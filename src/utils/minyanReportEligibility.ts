import {
  MINYAN_EFFECTIVE_RADIUS_MAX_METERS,
  MINYAN_MAX_GPS_ACCURACY_METERS,
} from '@/constants/minyanLive';
import {
  getMinyanLiveHebrewMessage,
  mapLocationErrorToMinyanMessage,
} from '@/services/minyanLive/minyanLiveErrors';
import { LocationServiceError } from '@/services/location';
import type { UserLocation } from '@/types/location';

export type MinyanReportEligibilityReason =
  | 'eligible'
  | 'fallback'
  | 'unavailable'
  | 'too_far';

export interface MinyanReportEligibility {
  canAttempt: boolean;
  reason: MinyanReportEligibilityReason;
  message: string | null;
  accuracyHint: string | null;
}

const FALLBACK_LOCATION_ERROR = new LocationServiceError(
  'location_unavailable',
  'Current GPS location is unavailable for minyan report.',
);

export function getMinyanReportEligibility({
  location,
  distanceMeters,
}: {
  location: UserLocation | null;
  distanceMeters?: number | null;
}): MinyanReportEligibility {
  if (!location || location.source === 'UNAVAILABLE') {
    return {
      canAttempt: false,
      reason: 'unavailable',
      message: mapLocationErrorToMinyanMessage(FALLBACK_LOCATION_ERROR),
      accuracyHint: null,
    };
  }

  if (location.source === 'FALLBACK') {
    return {
      canAttempt: false,
      reason: 'fallback',
      message: mapLocationErrorToMinyanMessage(FALLBACK_LOCATION_ERROR),
      accuracyHint: null,
    };
  }

  if (
    typeof distanceMeters === 'number' &&
    Number.isFinite(distanceMeters) &&
    distanceMeters > MINYAN_EFFECTIVE_RADIUS_MAX_METERS
  ) {
    return {
      canAttempt: false,
      reason: 'too_far',
      message: getMinyanLiveHebrewMessage('GEOFENCE_VIOLATION'),
      accuracyHint: null,
    };
  }

  const accuracyHint =
    typeof location.accuracy === 'number' &&
    location.accuracy > MINYAN_MAX_GPS_ACCURACY_METERS
      ? getMinyanLiveHebrewMessage('LOCATION_ACCURACY_INSUFFICIENT')
      : null;

  return {
    canAttempt: true,
    reason: 'eligible',
    message: null,
    accuracyHint,
  };
}
