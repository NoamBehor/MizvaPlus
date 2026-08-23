import type { CalendarLocationInput } from '@/types/calendar';

const LOCATION_KEY_PRECISION = 3;

export function buildCalendarLocationCacheKey(
  location?: CalendarLocationInput,
): string {
  if (
    location?.latitude !== undefined &&
    location?.longitude !== undefined
  ) {
    return `${location.latitude.toFixed(LOCATION_KEY_PRECISION)},${location.longitude.toFixed(LOCATION_KEY_PRECISION)}`;
  }

  return 'default';
}

export function buildCalendarDayCacheKey(
  dateKey: string,
  location?: CalendarLocationInput,
): string {
  return `${dateKey}:${buildCalendarLocationCacheKey(location)}`;
}
