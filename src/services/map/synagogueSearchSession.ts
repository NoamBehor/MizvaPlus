import type { Coordinates } from '@/types/location';

let lockedCoordinates: Coordinates | null = null;

function cloneCoordinates(coordinates: Coordinates): Coordinates {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
}

/** First GPS fix of this process becomes the Overpass search center. */
export function getOrLockSearchCoordinates(live: Coordinates): Coordinates {
  if (!lockedCoordinates) {
    lockedCoordinates = cloneCoordinates(live);
  }

  return lockedCoordinates;
}

/** User-initiated refresh: search around the current GPS from now on. */
export function relockSearchCoordinates(live: Coordinates): Coordinates {
  lockedCoordinates = cloneCoordinates(live);
  return lockedCoordinates;
}

export function getLockedSearchCoordinates(): Coordinates | null {
  return lockedCoordinates;
}
