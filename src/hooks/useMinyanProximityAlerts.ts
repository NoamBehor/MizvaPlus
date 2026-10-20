import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { MINYAN_PROXIMITY_SCAN_INTERVAL_MS } from '@/constants/minyanProximity';
import {
  findMinyanProximityCandidates,
  pruneNotifiedProximityReports,
  shouldSuppressProximityAlert,
} from '@/services/minyanProximity/minyanProximityEvaluation';
import { presentMinyanProximityAlert } from '@/services/minyanProximity/minyanProximityNotifications';
import {
  getMinyanProximityNotificationState,
  getMinyanProximityPreferences,
  saveMinyanProximityNotificationState,
} from '@/services/minyanProximity/minyanProximityStorage';
import { listActiveMinyanReports } from '@/services/minyanLive/minyanLiveService';
import { getCurrentLocation } from '@/services/location';
import { getNotificationPermissionStatus } from '@/services/notifications';
import { getNearbySynagogues } from '@/services/synagogues';
import { isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/store/appStore';

const SYNAGOGUE_LOOKUP_RADIUS_METERS = 2_000;

/**
 * Foreground-only proximity alerts for active minyan requests within 150 m.
 * Requires the user preference, notification permission, GPS, and Supabase.
 */
export function useMinyanProximityAlerts(): void {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const scanInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web' || !isSupabaseConfigured()) {
      return;
    }

    let cancelled = false;

    const scan = async () => {
      if (cancelled || !isMountedRef.current || scanInFlightRef.current) {
        return;
      }

      const preferences = await getMinyanProximityPreferences();
      if (!preferences.enabled) {
        return;
      }

      const permission = await getNotificationPermissionStatus();
      if (permission !== 'granted') {
        return;
      }

      scanInFlightRef.current = true;

      try {
        const location = await getCurrentLocation();
        if (
          location.source === 'FALLBACK' ||
          location.source === 'UNAVAILABLE'
        ) {
          return;
        }

        const synagogues = await getNearbySynagogues(
          location.coordinates,
          SYNAGOGUE_LOOKUP_RADIUS_METERS,
        );
        if (synagogues.length === 0) {
          return;
        }

        const reports = await listActiveMinyanReports(
          synagogues.map((synagogue) => synagogue.id),
        );

        const candidates = findMinyanProximityCandidates({
          userCoordinates: location.coordinates,
          synagogues,
          reports,
        });

        const notificationState = await getMinyanProximityNotificationState();
        const notifiedByReportId = pruneNotifiedProximityReports(
          notificationState.notifiedByReportId,
        );

        let changed = false;

        for (const candidate of candidates) {
          if (
            shouldSuppressProximityAlert(
              candidate.reportId,
              candidate.expiresAt,
              notifiedByReportId,
            )
          ) {
            continue;
          }

          await presentMinyanProximityAlert(candidate);
          notifiedByReportId[candidate.reportId] = candidate.expiresAt;
          changed = true;
        }

        if (changed) {
          await saveMinyanProximityNotificationState({
            notifiedByReportId,
          });
        } else if (
          Object.keys(notifiedByReportId).length !==
          Object.keys(notificationState.notifiedByReportId).length
        ) {
          await saveMinyanProximityNotificationState({
            notifiedByReportId,
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[useMinyanProximityAlerts] scan failed:', error);
        }
      } finally {
        scanInFlightRef.current = false;
      }
    };

    void scan();

    const interval = setInterval(() => {
      void scan();
    }, MINYAN_PROXIMITY_SCAN_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' || nextState === 'inactive') {
        void scan();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      subscription.remove();
    };
  }, [isAuthenticated]);
}
