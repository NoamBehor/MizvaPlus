import { Platform } from 'react-native';

import {
  OVERPASS_PERSISTENT_CACHE_STALE_MAX_MS,
  OVERPASS_PERSISTENT_CACHE_TTL_MS,
} from '@/constants/overpass';
import type { Synagogue } from '@/types/synagogue';

const STORAGE_KEY = 'mitzvaplus:overpass:synagogue-cache:v1';
const MAX_ENTRIES = 8;

interface StoredEntry {
  cacheKey: string;
  result: Synagogue[];
  cachedAt: number;
  expiresAt: number;
  radiusMeters: number;
  latitude: number;
  longitude: number;
}

export interface OverpassPersistentCacheLookup {
  result: Synagogue[];
  isStale: boolean;
  cachedAt: number;
}

function isPersistentCacheEnabled(): boolean {
  return __DEV__ && Platform.OS === 'web';
}

function readStore(): StoredEntry[] {
  if (!isPersistentCacheEnabled() || typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is StoredEntry =>
        Boolean(
          entry &&
            typeof entry === 'object' &&
            typeof (entry as StoredEntry).cacheKey === 'string' &&
            Array.isArray((entry as StoredEntry).result) &&
            typeof (entry as StoredEntry).cachedAt === 'number',
        ),
    );
  } catch {
    return [];
  }
}

function writeStore(entries: StoredEntry[]): void {
  if (!isPersistentCacheEnabled() || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Ignore quota or private-mode storage failures.
  }
}

export function buildOverpassPersistentCacheKey(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)},${radiusMeters}`;
}

export function readOverpassPersistentCache(
  cacheKey: string,
): OverpassPersistentCacheLookup | null {
  if (!isPersistentCacheEnabled()) {
    return null;
  }

  const now = Date.now();
  const entry = readStore().find((item) => item.cacheKey === cacheKey);
  if (!entry) {
    return null;
  }

  const ageMs = now - entry.cachedAt;
  if (ageMs > OVERPASS_PERSISTENT_CACHE_STALE_MAX_MS) {
    return null;
  }

  const isStale = now > entry.expiresAt;
  return {
    result: entry.result,
    isStale,
    cachedAt: entry.cachedAt,
  };
}

export function writeOverpassPersistentCache(input: {
  cacheKey: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  result: Synagogue[];
}): void {
  if (!isPersistentCacheEnabled()) {
    return;
  }

  const now = Date.now();
  const nextEntry: StoredEntry = {
    cacheKey: input.cacheKey,
    result: input.result,
    cachedAt: now,
    expiresAt: now + OVERPASS_PERSISTENT_CACHE_TTL_MS,
    radiusMeters: input.radiusMeters,
    latitude: input.latitude,
    longitude: input.longitude,
  };

  const remaining = readStore().filter((entry) => entry.cacheKey !== input.cacheKey);
  writeStore([nextEntry, ...remaining]);
}
