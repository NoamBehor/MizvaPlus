import { Platform } from 'react-native';

import { DEFAULT_SYNAGOGUE_RADIUS_METERS } from '@/constants/synagogues';

/**
 * Overpass API configuration.
 * Override primary endpoint via EXPO_PUBLIC_OVERPASS_API_URL without touching UI code.
 */
export const OVERPASS_API_URL =
  process.env.EXPO_PUBLIC_OVERPASS_API_URL ??
  'https://overpass-api.de/api/interpreter';

/**
 * Deterministic failover endpoints (same Overpass QL query on each).
 * Primary env override is tried first when set.
 */
export const OVERPASS_ENDPOINTS = [
  OVERPASS_API_URL,
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
].filter((url, index, all) => all.indexOf(url) === index);

/**
 * Custom User-Agent for Overpass requests.
 * overpass-api.de rejects the default okhttp/Node fetch User-Agent (HTTP 406).
 */
export const OVERPASS_USER_AGENT =
  'MizvaPlus/1.0 (Linux; Android; OpenStreetMap consumer)';

/** Request timeout in milliseconds. */
export const OVERPASS_REQUEST_TIMEOUT_MS = 25_000;

/** Overpass query timeout in seconds (server-side). */
export const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;

/** Fallback name when an OSM object has no name tag. */
export const OSM_SYNAGOGUE_NAME_FALLBACK = 'בית כנסת';

/** In-memory cache TTL for identical coordinate/radius lookups. */
export const OVERPASS_CACHE_TTL_MS = 5 * 60 * 1000;

/** Upper bound for mobile synagogue search radius (meters). */
export const OVERPASS_MAX_RADIUS_METERS = 15_000;

/** Tighter discovery radius for web development preview (Overpass latency). */
export const OVERPASS_WEB_DEV_RADIUS_METERS = 2_500;

/** Shorter client timeout for web development preview (faster endpoint failover). */
export const OVERPASS_WEB_DEV_REQUEST_TIMEOUT_MS = 15_000;

/** Shorter server-side Overpass query timeout for web development preview. */
export const OVERPASS_WEB_DEV_QUERY_TIMEOUT_SECONDS = 15;

/** Fresh TTL for persisted web development synagogue cache entries. */
export const OVERPASS_PERSISTENT_CACHE_TTL_MS = 30 * 60 * 1000;

/** Maximum age for stale persisted cache used only as a network-failure fallback. */
export const OVERPASS_PERSISTENT_CACHE_STALE_MAX_MS = 24 * 60 * 60 * 1000;

/**
 * Resolves the synagogue search radius for the current platform/build.
 * Production Android keeps the caller-provided radius (typically 4 km).
 */
export function resolveSynagogueSearchRadiusMeters(
  radiusMeters: number = DEFAULT_SYNAGOGUE_RADIUS_METERS,
): number {
  if (__DEV__ && Platform.OS === 'web') {
    return Math.min(radiusMeters, OVERPASS_WEB_DEV_RADIUS_METERS);
  }

  return radiusMeters;
}

/** Client HTTP timeout for Overpass requests on the current platform/build. */
export function resolveOverpassRequestTimeoutMs(): number {
  if (__DEV__ && Platform.OS === 'web') {
    return OVERPASS_WEB_DEV_REQUEST_TIMEOUT_MS;
  }

  return OVERPASS_REQUEST_TIMEOUT_MS;
}

/** Overpass QL `[timeout:…]` value for the current platform/build. */
export function resolveOverpassQueryTimeoutSeconds(): number {
  if (__DEV__ && Platform.OS === 'web') {
    return OVERPASS_WEB_DEV_QUERY_TIMEOUT_SECONDS;
  }

  return OVERPASS_QUERY_TIMEOUT_SECONDS;
}
