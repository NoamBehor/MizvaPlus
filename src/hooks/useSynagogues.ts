import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_SYNAGOGUE_RADIUS_METERS } from '@/constants/synagogues';
import { getNearbySynagogues } from '@/services/synagogues';
import type { Coordinates } from '@/types/location';
import type { Synagogue } from '@/types/synagogue';

export interface UseSynagoguesResult {
  synagogues: Synagogue[];
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
}

/**
 * Loads nearby synagogues for the given coordinates via the synagogue service.
 * UI stays decoupled from the data provider implementation.
 */
export function useSynagogues(
  coordinates: Coordinates | null,
  radiusMeters: number = DEFAULT_SYNAGOGUE_RADIUS_METERS,
): UseSynagoguesResult {
  const [synagogues, setSynagogues] = useState<Synagogue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const lastRequestKeyRef = useRef<string | null>(null);

  const load = useCallback(
    async (coords: Coordinates, force = false) => {
      const requestKey = `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)},${radiusMeters}`;
      if (!force && lastRequestKeyRef.current === requestKey) {
        return;
      }
      lastRequestKeyRef.current = requestKey;

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const results = await getNearbySynagogues(coords, radiusMeters);
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        setSynagogues(results);
      } catch {
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        setSynagogues([]);
        setError('לא הצלחנו לטעון בתי כנסת כרגע');
      } finally {
        if (isMountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [radiusMeters],
  );

  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  useEffect(() => {
    isMountedRef.current = true;

    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !coordinates
    ) {
      setSynagogues([]);
      setError(null);
      setIsLoading(false);
      lastRequestKeyRef.current = null;
      return () => {
        isMountedRef.current = false;
      };
    }

    void load(coordinates);

    return () => {
      isMountedRef.current = false;
    };
  }, [coordinates, latitude, longitude, load]);

  const refresh = useCallback(async () => {
    if (!coordinates) {
      return;
    }
    lastRequestKeyRef.current = null;
    await load(coordinates, true);
  }, [coordinates, load]);

  return {
    synagogues,
    isLoading,
    error,
    isEmpty: !isLoading && !error && synagogues.length === 0 && coordinates !== null,
    refresh,
  };
}
