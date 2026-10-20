import { Platform } from 'react-native';

import { DEV_PREVIEW_DEFAULT_COORDINATES } from '@/services/devPreview/devPreviewData';
import { isDevPreviewMode } from '@/services/devPreview/isDevPreviewMode';
import {
  getCurrentLocation,
  getLocationPermissionStatus,
} from '@/services/location';
import type { CalendarLocationInput } from '@/types/calendar';
import type { UserLocation } from '@/types/location';
import { getJson, setJson } from '@/utils/storage';

import type {
  CachedZmanimLocation,
  ZmanimLocation,
  ZmanimLocationSource,
} from './types';

export type {
  CachedZmanimLocation,
  ZmanimLocation,
  ZmanimLocationSource,
  ZmanimLocationState,
} from './types';

const CACHE_STORAGE_KEY = '@mitzvahapp/zmanim_location_cache';
const FRESH_MAX_AGE_MS = 5 * 60 * 1000;
const CACHED_MAX_AGE_MS = 60 * 60 * 1000;

const JERUSALEM_FALLBACK: ZmanimLocation = {
  latitude: DEV_PREVIEW_DEFAULT_COORDINATES.latitude,
  longitude: DEV_PREVIEW_DEFAULT_COORDINATES.longitude,
  capturedAt: 0,
  source: 'fallback',
};

export function getLocationAgeMs(location: ZmanimLocation, nowMs = Date.now()): number {
  if (!location.capturedAt) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, nowMs - location.capturedAt);
}

export function formatZmanimLocationSourceLabel(
  source: ZmanimLocationSource,
): string {
  switch (source) {
    case 'fresh':
      return 'LIVE GPS';
    case 'cached':
      return 'CACHED GPS';
    case 'preview':
      return 'PREVIEW / FALLBACK';
    case 'fallback':
      return 'FALLBACK';
    case 'unavailable':
      return 'UNAVAILABLE';
    default:
      return source;
  }
}

/** User-facing Hebrew label for zmanim location source — presentation only. */
export function formatZmanimLocationDisplayLabel(
  source: ZmanimLocationSource,
): string {
  switch (source) {
    case 'fresh':
      return 'לפי המיקום שלך';
    case 'cached':
      return 'לפי המיקום האחרון שנשמר';
    case 'fallback':
    case 'preview':
      return 'ירושלים — מיקום ברירת מחדל';
    case 'unavailable':
      return 'מיקום לא זמין — זמנים לפי ירושלים';
    default:
      return formatZmanimLocationSourceLabel(source);
  }
}

export function toCalendarLocationInput(
  location: ZmanimLocation | null,
): CalendarLocationInput | undefined {
  if (!location || location.source === 'fallback' || location.source === 'unavailable') {
    if (location?.source === 'preview') {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }
    return undefined;
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function fromUserLocation(
  userLocation: UserLocation,
  source: ZmanimLocationSource,
): ZmanimLocation {
  return {
    latitude: userLocation.coordinates.latitude,
    longitude: userLocation.coordinates.longitude,
    accuracy: userLocation.accuracy,
    capturedAt: userLocation.timestamp,
    source,
  };
}

function fromCached(cached: CachedZmanimLocation): ZmanimLocation {
  const ageMs = getLocationAgeMs({
    ...cached,
    source: 'cached',
  });

  return {
    latitude: cached.latitude,
    longitude: cached.longitude,
    accuracy: cached.accuracy,
    capturedAt: cached.capturedAt,
    source: ageMs <= FRESH_MAX_AGE_MS ? 'fresh' : 'cached',
  };
}

export async function readCachedZmanimLocation(): Promise<ZmanimLocation | null> {
  const cached = await getJson<CachedZmanimLocation>(CACHE_STORAGE_KEY);
  if (!cached) {
    return null;
  }

  const ageMs = getLocationAgeMs({ ...cached, source: 'cached' });
  if (ageMs > CACHED_MAX_AGE_MS) {
    return null;
  }

  return fromCached(cached);
}

export async function writeCachedZmanimLocation(
  location: ZmanimLocation,
): Promise<void> {
  await setJson<CachedZmanimLocation>(CACHE_STORAGE_KEY, {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    capturedAt: location.capturedAt,
  });
}

export function resolvePreviewLocation(): ZmanimLocation {
  return {
    latitude: DEV_PREVIEW_DEFAULT_COORDINATES.latitude,
    longitude: DEV_PREVIEW_DEFAULT_COORDINATES.longitude,
    accuracy: 100,
    capturedAt: Date.now(),
    source: 'preview',
  };
}

export function resolveFallbackLocation(): ZmanimLocation {
  return {
    ...JERUSALEM_FALLBACK,
    capturedAt: Date.now(),
  };
}

/**
 * Resolves the best available zmanim location without blocking indefinitely.
 * Priority: fresh GPS → recent cache → Jerusalem fallback.
 * Web dev preview uses preview coordinates.
 */
export async function resolveZmanimLocation(): Promise<ZmanimLocation> {
  if (Platform.OS === 'web' || isDevPreviewMode()) {
    return resolvePreviewLocation();
  }

  const cached = await readCachedZmanimLocation();
  const permission = await getLocationPermissionStatus();

  if (permission !== 'granted') {
    return cached ?? resolveFallbackLocation();
  }

  try {
    const fresh = fromUserLocation(await getCurrentLocation(), 'fresh');
    await writeCachedZmanimLocation(fresh);
    return fresh;
  } catch {
    if (cached) {
      return cached;
    }
    return resolveFallbackLocation();
  }
}

/** Non-blocking bootstrap — returns cache/fallback immediately when possible. */
export async function bootstrapZmanimLocation(): Promise<ZmanimLocation> {
  if (Platform.OS === 'web' || isDevPreviewMode()) {
    return resolvePreviewLocation();
  }

  const cached = await readCachedZmanimLocation();
  if (cached) {
    void resolveZmanimLocation();
    return cached;
  }

  return resolveZmanimLocation();
}
