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

function sortByDistance<T extends { distanceMeters?: number }>(synagogues: T[]): T[] {
  return [...synagogues].sort(
    (left, right) =>
      (left.distanceMeters ?? Number.POSITIVE_INFINITY) -
      (right.distanceMeters ?? Number.POSITIVE_INFINITY),
  );
}

export function takeNearestSynagogues<T extends { distanceMeters?: number }>(
  synagogues: T[],
  limit = MAP_NEAREST_LIMIT,
): T[] {
  return sortByDistance(synagogues).slice(0, limit);
}

export function synagogueNeedsMinyan(
  minyan?: ActiveMinyanReport,
): boolean {
  return Boolean(minyan && minyan.missingCount > 0);
}

/** Five nearest synagogues plus any farther ones that still need a minyan. */
export function takeMapDisplaySynagogues(
  synagogues: SynagogueWithMinyan[],
  limit = MAP_NEAREST_LIMIT,
): SynagogueWithMinyan[] {
  const nearest = takeNearestSynagogues(synagogues, limit);
  const needsMinyan = synagogues.filter((synagogue) =>
    synagogueNeedsMinyan(synagogue.minyan),
  );
  const byId = new Map<string, SynagogueWithMinyan>();

  for (const synagogue of [...nearest, ...needsMinyan]) {
    byId.set(synagogue.id, synagogue);
  }

  return sortByDistance([...byId.values()]);
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

export function resolveDisplayedSynagogues(
  synagogues: SynagogueWithMinyan[],
  filter: MapSynagogueFilter,
): SynagogueWithMinyan[] {
  const filtered = filterSynagoguesByMapFilter(synagogues, filter);
  if (filter === 'activeMinyan') {
    return sortByDistance(filtered);
  }

  return takeMapDisplaySynagogues(filtered);
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
