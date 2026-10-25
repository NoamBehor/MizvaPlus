import { colors } from '@/constants/colors';
import type {
  ActiveMinyanReport,
  SynagogueWithMinyan,
} from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { isValidWgs84Coordinate } from '@/utils/coordinates';

export type MapSynagogueFilter = 'all' | 'activeMinyan';

/** How many nearby synagogues the map list and pins may show. */
export const MAP_NEAREST_LIMIT = 5;

export function takeNearestSynagogues<T extends { distanceMeters?: number }>(
  synagogues: T[],
  limit = MAP_NEAREST_LIMIT,
): T[] {
  return [...synagogues]
    .sort(
      (left, right) =>
        (left.distanceMeters ?? Number.POSITIVE_INFINITY) -
        (right.distanceMeters ?? Number.POSITIVE_INFINITY),
    )
    .slice(0, limit);
}

/** Synagogues safe to render as map markers. */
export function filterSynagoguesForMap<T extends Synagogue | SynagogueWithMinyan>(
  synagogues: T[],
): T[] {
  return synagogues.filter((synagogue) =>
    isValidWgs84Coordinate(synagogue.coordinates),
  );
}

export function filterSynagoguesByMapFilter(
  synagogues: SynagogueWithMinyan[],
  filter: MapSynagogueFilter,
): SynagogueWithMinyan[] {
  if (filter === 'activeMinyan') {
    return synagogues.filter((synagogue) => Boolean(synagogue.minyan));
  }

  return synagogues;
}

export function resolveSelectedSynagogueId(
  synagogues: Array<{ id: string }>,
  currentId: string | null,
): string | null {
  if (synagogues.length === 0) {
    return null;
  }

  if (currentId && synagogues.some((synagogue) => synagogue.id === currentId)) {
    return currentId;
  }

  return synagogues[0]?.id ?? null;
}

export function synagogueNeedsMinyan(
  minyan?: ActiveMinyanReport,
): boolean {
  return Boolean(minyan && minyan.missingCount > 0);
}

export function resolveMarkerPinColor(
  synagogue: SynagogueWithMinyan,
  selectedSynagogueId: string | null,
): string {
  if (synagogueNeedsMinyan(synagogue.minyan)) {
    return colors.goldDeep;
  }

  if (selectedSynagogueId === synagogue.id) {
    return colors.secondary;
  }

  return colors.primary;
}
