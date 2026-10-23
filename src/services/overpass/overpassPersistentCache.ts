import { Platform } from 'react-native';

import {
  OVERPASS_PERSISTENT_CACHE_STALE_MAX_MS,
  OVERPASS_PERSISTENT_CACHE_TTL_MS,
} from '@/constants/overpass';
import type { Synagogue } from '@/types/synagogue';
import { getJson, setJson } from '@/utils/storage';

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
  if (Platform.OS === 'web') {
    return __DEV__;
  }

  return true;
}

function isStoredEntry(entry: unknown): entry is StoredEntry {
  return Boolean(
    entry &&
      typeof entry === 'object' &&
      typeof (entry as StoredEntry).cacheKey === 'string' &&
      Array.isArray((entry as StoredEntry).result) &&
      typeof (entry as StoredEntry).cachedAt === 'number',
  );
}

async function readStore(): Promise<StoredEntry[]> {
  if (!isPersistentCacheEnabled()) {
    return [];
  }

  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return [];
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isStoredEntry);
    }

    const parsed = await getJson<unknown>(STORAGE_KEY);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isStoredEntry);
  } catch {
    return [];
  }
}

async function writeStore(entries: StoredEntry[]): Promise<void> {
  if (!isPersistentCacheEnabled()) {
    return;
  }

  const next = entries.slice(0, MAX_ENTRIES);

  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return;
    }

    await setJson(STORAGE_KEY, next);
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

export async function readOverpassPersistentCache(
  cacheKey: string,
): Promise<OverpassPersistentCacheLookup | null> {
  if (!isPersistentCacheEnabled()) {
    return null;
  }

  const now = Date.now();
  const store = await readStore();
  const entry = store.find((item) => item.cacheKey === cacheKey);
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

export async function writeOverpassPersistentCache(input: {
  cacheKey: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  result: Synagogue[];
}): Promise<void> {
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

  const remaining = (await readStore()).filter(
    (entry) => entry.cacheKey !== input.cacheKey,
  );
  await writeStore([nextEntry, ...remaining]);
}
