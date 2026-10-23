/**
 * Place used when the device has no fresher GPS fix.
 * 110 Gilboa Street, Alfei Menashe. OpenStreetMap has the street גלבוע
 * but no separate node for house 110, so the point is on that street.
 * Shabbat and holiday times and the synagogue search use these coordinates.
 */
export const DEFAULT_PLACE_NAME = 'אלפי מנשה';

export const DEFAULT_PLACE_ADDRESS = 'רחוב הגלבוע 110, אלפי מנשה';

export const DEFAULT_PLACE_COORDINATES = {
  latitude: 32.17158,
  longitude: 35.01156,
} as const;
