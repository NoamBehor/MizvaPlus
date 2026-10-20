import type { Coordinates } from '@/types/location';

/**
 * Returns true when coordinates are finite WGS84 values suitable for map markers.
 */
export function isValidWgs84Coordinate(coordinates: Coordinates): boolean {
  const { latitude, longitude } = coordinates;

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}
