import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  getCurrentLocation,
  getLocationPermissionStatus,
  LocationServiceError,
  requestLocationPermission,
} from '@/services/location';
import type {
  LocationPermissionStatus,
  UserLocation,
} from '@/types/location';

export interface UseUserLocationResult {
  location: UserLocation | null;
  status: LocationPermissionStatus;
  isLoading: boolean;
  error: string | null;
  errorCode: LocationServiceError['code'] | null;
  requestPermission: () => Promise<void>;
  refreshLocation: () => Promise<void>;
}

function toUserFacingError(error: unknown): {
  message: string;
  code: LocationServiceError['code'] | null;
} {
  if (error instanceof LocationServiceError) {
    switch (error.code) {
      case 'permission_denied':
        return {
          code: error.code,
          message: 'לא ניתן לגשת למיקום. יש לאפשר גישה בהגדרות המכשיר.',
        };
      case 'services_disabled':
        return {
          code: error.code,
          message: 'שירותי המיקום במכשיר כבויים. יש להפעיל אותם בהגדרות.',
        };
      case 'timeout':
        return {
          code: error.code,
          message: 'איתור המיקום ארך זמן רב מדי. נסו שוב.',
        };
      case 'location_unavailable':
      default:
        return {
          code: error.code,
          message: 'לא ניתן לאתר את המיקום כרגע. נסו שוב מאוחר יותר.',
        };
    }
  }

  return {
    code: 'location_unavailable',
    message: 'לא ניתן לאתר את המיקום כרגע. נסו שוב מאוחר יותר.',
  };
}

/**
 * Manages foreground location permission and a one-shot current location.
 * Does not continuously watch GPS.
 */
export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationPermissionStatus>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<
    LocationServiceError['code'] | null
  >(null);
  const isMountedRef = useRef(true);
  const hasLoadedOnceRef = useRef(false);

  const safeSet = useCallback(<T,>(setter: (value: T) => void, value: T) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const fetchLocation = useCallback(async () => {
    safeSet(setIsLoading, true);
    safeSet(setError, null);
    safeSet(setErrorCode, null);

    try {
      const current = await getCurrentLocation();
      safeSet(setLocation, current);
      safeSet(setStatus, 'granted');
      hasLoadedOnceRef.current = true;
    } catch (err) {
      const mapped = toUserFacingError(err);
      safeSet(setError, mapped.message);
      safeSet(setErrorCode, mapped.code);

      if (err instanceof LocationServiceError) {
        if (err.code === 'permission_denied') {
          const permission = await getLocationPermissionStatus();
          safeSet(setStatus, permission);
        }
      }
    } finally {
      safeSet(setIsLoading, false);
    }
  }, [safeSet]);

  const requestPermission = useCallback(async () => {
    safeSet(setIsLoading, true);
    safeSet(setError, null);
    safeSet(setErrorCode, null);

    try {
      const nextStatus = await requestLocationPermission();
      safeSet(setStatus, nextStatus);

      if (nextStatus !== 'granted') {
        safeSet(
          setError,
          nextStatus === 'blocked'
            ? 'הגישה למיקום חסומה. יש לאפשר אותה בהגדרות המכשיר.'
            : 'לא ניתן לגשת למיקום ללא אישור.',
        );
        safeSet(setErrorCode, 'permission_denied');
        safeSet(setIsLoading, false);
        return;
      }

      await fetchLocation();
    } catch (err) {
      const mapped = toUserFacingError(err);
      safeSet(setError, mapped.message);
      safeSet(setErrorCode, mapped.code);

      if (err instanceof LocationServiceError && err.code === 'services_disabled') {
        // Keep permission status as-is; surface services-disabled separately.
      } else {
        const permission = await getLocationPermissionStatus();
        safeSet(setStatus, permission);
      }

      safeSet(setIsLoading, false);
    }
  }, [fetchLocation, safeSet]);

  const refreshLocation = useCallback(async () => {
    if (status !== 'granted') {
      await requestPermission();
      return;
    }

    await fetchLocation();
  }, [fetchLocation, requestPermission, status]);

  useEffect(() => {
    isMountedRef.current = true;

    const bootstrap = async () => {
      try {
        const permission = await getLocationPermissionStatus();
        safeSet(setStatus, permission);

        if (permission === 'granted') {
          await fetchLocation();
          return;
        }

        safeSet(setIsLoading, false);
      } catch (err) {
        const mapped = toUserFacingError(err);
        safeSet(setError, mapped.message);
        safeSet(setErrorCode, mapped.code);
        safeSet(setIsLoading, false);
      }
    };

    void bootstrap();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLocation, safeSet]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') {
        return;
      }

      // Returning from background: refresh location only if already granted.
      // Do not re-prompt for permission.
      if (status === 'granted' && hasLoadedOnceRef.current) {
        void fetchLocation();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchLocation, status]);

  return {
    location,
    status,
    isLoading,
    error,
    errorCode,
    requestPermission,
    refreshLocation,
  };
}
