import { DEFAULT_SYNAGOGUE_RADIUS_METERS } from '@/constants/synagogues';
import { fetchNearbySynagoguesFromOverpass } from '@/services/overpass';
import type { Coordinates } from '@/types/location';
import type { Synagogue, SynagogueProvider } from '@/types/synagogue';
import {
  calculateDistanceMeters,
  offsetCoordinates,
} from '@/utils/distance';

/**
 * Production synagogue provider backed by OpenStreetMap via the Overpass API.
 */
class OverpassSynagogueProvider implements SynagogueProvider {
  async getNearbySynagogues(
    coordinates: Coordinates,
    radiusMeters: number,
  ): Promise<Synagogue[]> {
    return fetchNearbySynagoguesFromOverpass(coordinates, radiusMeters);
  }
}

/**
 * Development/mock synagogue provider.
 *
 * Generates realistic Hebrew sample synagogues relative to the user's
 * coordinates so nearby results appear regardless of geographic location.
 *
 * Select intentionally via `setSynagogueProvider(new MockSynagogueProvider())`.
 */
class MockSynagogueProvider implements SynagogueProvider {
  async getNearbySynagogues(
    coordinates: Coordinates,
    radiusMeters: number,
  ): Promise<Synagogue[]> {
    // Small artificial delay to exercise loading UI in development.
    await new Promise((resolve) => setTimeout(resolve, 350));

    const samples: Array<
      Omit<Synagogue, 'distanceMeters' | 'coordinates'> & {
        eastMeters: number;
        northMeters: number;
      }
    > = [
      {
        id: 'mock-synagogue-great',
        name: 'בית הכנסת הגדול',
        address: 'רחוב הרצל 12',
        eastMeters: 180,
        northMeters: 260,
        denomination: 'אורתודוקסי',
        hasMinyan: true,
        prayerTimes: [
          { id: 'shacharit', name: 'שחרית', time: '07:00' },
          { id: 'mincha', name: 'מנחה', time: '18:30' },
          { id: 'arvit', name: 'ערבית', time: '19:45' },
        ],
      },
      {
        id: 'mock-synagogue-yemenite',
        name: 'בית כנסת תימני נווה שלום',
        address: 'רחוב יהודה הלוי 8',
        eastMeters: -420,
        northMeters: 90,
        denomination: 'תימני',
        hasMinyan: true,
        prayerTimes: [
          { id: 'shacharit', name: 'שחרית', time: '06:30' },
          { id: 'mincha', name: 'מנחה', time: '18:15' },
        ],
      },
      {
        id: 'mock-synagogue-chabad',
        name: 'חב״ד — בית מנחם',
        address: 'רחוב בן יהודה 45',
        eastMeters: 650,
        northMeters: -380,
        denomination: 'חב״ד',
        hasMinyan: true,
        prayerTimes: [
          { id: 'shacharit', name: 'שחרית', time: '07:30' },
          { id: 'mincha', name: 'מנחה', time: '18:45' },
          { id: 'arvit', name: 'ערבית', time: '20:00' },
        ],
      },
      {
        id: 'mock-synagogue-sephardi',
        name: 'בית כנסת עדת הספרדים',
        address: 'רחוב אלנבי 22',
        eastMeters: -1100,
        northMeters: 700,
        denomination: 'ספרדי',
        hasMinyan: false,
        prayerTimes: [
          { id: 'shacharit', name: 'שחרית', time: '08:00' },
        ],
      },
      {
        id: 'mock-synagogue-community',
        name: 'מרכז קהילתי אור חדש',
        address: 'שדרות רוטשילד 3',
        eastMeters: 1400,
        northMeters: 900,
        denomination: 'מסורתי',
        hasMinyan: true,
        prayerTimes: [
          { id: 'mincha', name: 'מנחה', time: '18:20' },
          { id: 'arvit', name: 'ערבית', time: '19:30' },
        ],
      },
      {
        id: 'mock-synagogue-outside-radius',
        name: 'בית כנסת הרחוק',
        address: 'רחוב הירקון 100',
        eastMeters: 2800,
        northMeters: -1500,
        denomination: 'אורתודוקסי',
        hasMinyan: true,
      },
    ];

    return samples
      .map((sample) => {
        const { eastMeters, northMeters, ...rest } = sample;
        const synagogueCoordinates = offsetCoordinates(
          coordinates,
          eastMeters,
          northMeters,
        );
        const distanceMeters = calculateDistanceMeters(
          coordinates,
          synagogueCoordinates,
        );

        return {
          ...rest,
          coordinates: synagogueCoordinates,
          distanceMeters,
        };
      })
      .filter((synagogue) => (synagogue.distanceMeters ?? Infinity) <= radiusMeters)
      .sort(
        (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
      );
  }
}

let activeProvider: SynagogueProvider = new OverpassSynagogueProvider();

/**
 * Replace the active synagogue data provider (e.g. with MockSynagogueProvider for tests).
 */
export function setSynagogueProvider(provider: SynagogueProvider): void {
  activeProvider = provider;
}

/**
 * Returns the currently configured provider (useful for tests).
 */
export function getSynagogueProvider(): SynagogueProvider {
  return activeProvider;
}

/**
 * Fetches nearby synagogues via the configured provider, ensuring distances
 * are populated and results are sorted nearest-first.
 */
export async function getNearbySynagogues(
  coordinates: Coordinates,
  radiusMeters: number = DEFAULT_SYNAGOGUE_RADIUS_METERS,
): Promise<Synagogue[]> {
  const results = await activeProvider.getNearbySynagogues(
    coordinates,
    radiusMeters,
  );

  return results
    .map((synagogue) => {
      const distanceMeters =
        synagogue.distanceMeters ??
        calculateDistanceMeters(coordinates, synagogue.coordinates);

      return {
        ...synagogue,
        distanceMeters,
      };
    })
    .filter((synagogue) => (synagogue.distanceMeters ?? Infinity) <= radiusMeters)
    .sort(
      (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
    );
}

export { MockSynagogueProvider, OverpassSynagogueProvider };
