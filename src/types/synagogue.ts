import type { Coordinates } from '@/types/location';

export interface PrayerTime {
  id: string;
  name: string;
  time: string;
}

export type OsmElementType = 'node' | 'way' | 'relation';

export interface Synagogue {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  distanceMeters?: number;
  denomination?: string;
  hasMinyan?: boolean;
  prayerTimes?: PrayerTime[];
  osmType?: OsmElementType;
  osmId?: number;
  tags?: Record<string, string>;
}

export interface SynagogueProvider {
  getNearbySynagogues(
    coordinates: Coordinates,
    radiusMeters: number,
  ): Promise<Synagogue[]>;
}
