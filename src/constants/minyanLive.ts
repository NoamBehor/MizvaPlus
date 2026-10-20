/**
 * Minyan Live geofence and lifecycle constants (V1).
 *
 * Server-side RPCs mirror these values in `public.minyan_live_config()`.
 * Keep client and server in sync when changing limits.
 *
 * Effective geofence radius maximum = MINYAN_MAX_REPORT_RADIUS_METERS +
 * MINYAN_ACCURACY_CAP_METERS = 120 m + 30 m = **150 m**.
 */
export const MINYAN_REQUIRED_COUNT = 10;

/** Base geofence radius around the canonical synagogue anchor (meters). */
export const MINYAN_MAX_REPORT_RADIUS_METERS = 120;

/** Reject GPS fixes with accuracy worse than this (meters). */
export const MINYAN_MAX_GPS_ACCURACY_METERS = 50;

/** Cap applied to accuracy when expanding the effective geofence radius. */
export const MINYAN_ACCURACY_CAP_METERS = 30;

/** Maximum age of a location fix at submit time (milliseconds). */
export const MINYAN_LOCATION_MAX_AGE_MS = 30_000;

/** Active report time-to-live (minutes). Refreshed on attendance update. */
export const MINYAN_REPORT_TTL_MINUTES = 20;

/** Effective maximum distance including accuracy buffer (meters). */
export const MINYAN_EFFECTIVE_RADIUS_MAX_METERS =
  MINYAN_MAX_REPORT_RADIUS_METERS + MINYAN_ACCURACY_CAP_METERS;

/** V1 rate limits — enforced server-side only. */
export const MINYAN_RATE_LIMIT_NEW_REPORTS_PER_HOUR = 5;
export const MINYAN_RATE_LIMIT_UPDATES_PER_REPORT = 10;
export const MINYAN_RATE_LIMIT_SUPERSEDE_COOLDOWN_MINUTES = 2;
export const MINYAN_RATE_LIMIT_FULFILL_INTERVAL_SECONDS = 5;
