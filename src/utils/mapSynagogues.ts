import type { SynagogueWithMinyan } from '@/services/minyanLive/minyanLiveTypes';
import type { Synagogue } from '@/types/synagogue';
import { isValidWgs84Coordinate } from '@/utils/coordinates';

/** Synagogues safe to render as map markers. */
export function filterSynagoguesForMap<T extends Synagogue | SynagogueWithMinyan>(
  synagogues: T[],
): T[] {
  return synagogues.filter((synagogue) =>
    isValidWgs84Coordinate(synagogue.coordinates),
  );
}
