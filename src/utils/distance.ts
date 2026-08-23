import type { Coordinates } from '@/types/location';

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine distance between two WGS84 coordinates, in meters.
 */
export function calculateDistanceMeters(
  from: Coordinates,
  to: Coordinates,
): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Formats a distance for Hebrew UI, e.g. "350 מטר" or '1.2 ק"מ'.
 */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '—';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} מטר`;
  }

  const kilometers = meters / 1000;
  const rounded =
    kilometers >= 10 ? Math.round(kilometers).toString() : kilometers.toFixed(1);

  return `${rounded} ק"מ`;
}

/**
 * Approximate lat/lng offset for a given distance in meters.
 * Useful for generating nearby sample points relative to a user location.
 */
export function offsetCoordinates(
  origin: Coordinates,
  eastMeters: number,
  northMeters: number,
): Coordinates {
  const latitude =
    origin.latitude + (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitude =
    origin.longitude +
    (eastMeters /
      (EARTH_RADIUS_METERS * Math.cos(toRadians(origin.latitude)))) *
      (180 / Math.PI);

  return { latitude, longitude };
}
