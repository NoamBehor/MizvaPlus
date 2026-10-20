import { MINYAN_PROXIMITY_ALERT_RADIUS_METERS } from '@/constants/minyanProximity';
import type { ActiveMinyanReport } from '@/services/minyanLive/minyanLiveTypes';
import type { Coordinates } from '@/types/location';
import type { Synagogue } from '@/types/synagogue';
import { calculateDistanceMeters } from '@/utils/distance';
import { isValidWgs84Coordinate } from '@/utils/coordinates';

export interface MinyanProximityCandidate {
  reportId: string;
  synagogueOsmKey: string;
  synagogueName: string;
  distanceMeters: number;
  expiresAt: string;
}

export interface MinyanProximityEvaluationInput {
  userCoordinates: Coordinates;
  synagogues: Synagogue[];
  reports: ActiveMinyanReport[];
  radiusMeters?: number;
  now?: Date;
}

/**
 * Finds active minyan requests whose synagogue anchor is within the alert radius.
 */
export function findMinyanProximityCandidates(
  input: MinyanProximityEvaluationInput,
): MinyanProximityCandidate[] {
  const {
    userCoordinates,
    synagogues,
    reports,
    radiusMeters = MINYAN_PROXIMITY_ALERT_RADIUS_METERS,
    now = new Date(),
  } = input;

  if (!isValidWgs84Coordinate(userCoordinates)) {
    return [];
  }

  const synagogueByOsmKey = new Map(
    synagogues
      .filter((synagogue) => isValidWgs84Coordinate(synagogue.coordinates))
      .map((synagogue) => [synagogue.id, synagogue]),
  );

  const candidates: MinyanProximityCandidate[] = [];

  for (const report of reports) {
    if (report.status !== 'ACTIVE') {
      continue;
    }

    const expiresAt = new Date(report.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
      continue;
    }

    const synagogue = synagogueByOsmKey.get(report.synagogueOsmKey);
    if (!synagogue) {
      continue;
    }

    const distanceMeters = calculateDistanceMeters(
      userCoordinates,
      synagogue.coordinates,
    );

    if (distanceMeters > radiusMeters) {
      continue;
    }

    candidates.push({
      reportId: report.id,
      synagogueOsmKey: report.synagogueOsmKey,
      synagogueName: synagogue.name,
      distanceMeters,
      expiresAt: report.expiresAt,
    });
  }

  return candidates.sort((left, right) => left.distanceMeters - right.distanceMeters);
}

/**
 * Returns true when this report/expiry pair was already notified.
 */
export function shouldSuppressProximityAlert(
  reportId: string,
  expiresAt: string,
  notifiedByReportId: Record<string, string>,
): boolean {
  return notifiedByReportId[reportId] === expiresAt;
}

/**
 * Drops notification dedupe entries for expired reports.
 */
export function pruneNotifiedProximityReports(
  notifiedByReportId: Record<string, string>,
  now: Date = new Date(),
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [reportId, expiresAt] of Object.entries(notifiedByReportId)) {
    const expires = new Date(expiresAt);
    if (Number.isFinite(expires.getTime()) && expires > now) {
      next[reportId] = expiresAt;
    }
  }

  return next;
}
