import type { CalendarLocationInput } from '@/types/calendar';

export type ZmanimLocationSource =
  | 'fresh'
  | 'cached'
  | 'fallback'
  | 'preview'
  | 'unavailable';

export interface ZmanimLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: number;
  source: ZmanimLocationSource;
}

export interface ZmanimLocationState {
  location: ZmanimLocation | null;
  calendarInput: CalendarLocationInput | undefined;
  isResolving: boolean;
  error: string | null;
}

export interface CachedZmanimLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: number;
}
