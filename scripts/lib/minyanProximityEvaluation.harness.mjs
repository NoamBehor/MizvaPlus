/**
 * Pure JS harness for minyan proximity logic.
 * Keep in sync with src/services/minyanProximity/minyanProximityEvaluation.ts
 */
export const MINYAN_PROXIMITY_ALERT_RADIUS_METERS = 150;

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function calculateDistanceMeters(from, to) {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function isValidWgs84Coordinate(coordinates) {
  const { latitude, longitude } = coordinates;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function findMinyanProximityCandidates(input) {
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

  const candidates = [];

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

export function shouldSuppressProximityAlert(reportId, expiresAt, notifiedByReportId) {
  return notifiedByReportId[reportId] === expiresAt;
}

export function pruneNotifiedProximityReports(notifiedByReportId, now = new Date()) {
  const next = {};
  for (const [reportId, expiresAt] of Object.entries(notifiedByReportId)) {
    const expires = new Date(expiresAt);
    if (Number.isFinite(expires.getTime()) && expires > now) {
      next[reportId] = expiresAt;
    }
  }
  return next;
}

export function offsetCoordinates(origin, eastMeters, northMeters) {
  const latitude =
    origin.latitude + (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitude =
    origin.longitude +
    (eastMeters /
      (EARTH_RADIUS_METERS * Math.cos(toRadians(origin.latitude)))) *
      (180 / Math.PI);
  return { latitude, longitude };
}
