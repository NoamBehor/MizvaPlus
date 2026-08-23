/**
 * Overpass API configuration.
 * Override via EXPO_PUBLIC_OVERPASS_API_URL without touching UI code.
 */
export const OVERPASS_API_URL =
  process.env.EXPO_PUBLIC_OVERPASS_API_URL ??
  'https://overpass-api.de/api/interpreter';

/** Request timeout in milliseconds. */
export const OVERPASS_REQUEST_TIMEOUT_MS = 25_000;

/** Overpass query timeout in seconds (server-side). */
export const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;

/** Fallback name when an OSM object has no name tag. */
export const OSM_SYNAGOGUE_NAME_FALLBACK = 'בית כנסת';

/** In-memory cache TTL for identical coordinate/radius lookups. */
export const OVERPASS_CACHE_TTL_MS = 5 * 60 * 1000;
