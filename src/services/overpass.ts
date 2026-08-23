import {
  OSM_SYNAGOGUE_NAME_FALLBACK,
  OVERPASS_API_URL,
  OVERPASS_CACHE_TTL_MS,
  OVERPASS_QUERY_TIMEOUT_SECONDS,
  OVERPASS_REQUEST_TIMEOUT_MS,
} from '@/constants/overpass';
import type { Coordinates } from '@/types/location';
import type { OsmElementType, Synagogue } from '@/types/synagogue';
import { calculateDistanceMeters } from '@/utils/distance';

interface OverpassCenter {
  lat: number;
  lon: number;
}

interface OverpassElement {
  type: OsmElementType;
  id: number;
  lat?: number;
  lon?: number;
  center?: OverpassCenter;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

interface CacheEntry {
  result: Synagogue[];
  expiresAt: number;
}

const resultCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<Synagogue[]>>();

function buildCacheKey(coordinates: Coordinates, radiusMeters: number): string {
  return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)},${radiusMeters}`;
}

/**
 * Builds an Overpass QL query for Jewish places of worship near a point.
 * Covers common OSM tagging variations (place_of_worship, building=synagogue, etc.).
 */
export function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): string {
  const around = `${radiusMeters},${latitude},${longitude}`;

  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
(
  node["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  way["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  relation["amenity"="place_of_worship"]["religion"="jewish"](around:${around});
  node["amenity"="place_of_worship"]["religion"="judaism"](around:${around});
  way["amenity"="place_of_worship"]["religion"="judaism"](around:${around});
  relation["amenity"="place_of_worship"]["religion"="judaism"](around:${around});
  node["building"="synagogue"](around:${around});
  way["building"="synagogue"](around:${around});
  relation["building"="synagogue"](around:${around});
  node["amenity"="synagogue"](around:${around});
  way["amenity"="synagogue"](around:${around});
  relation["amenity"="synagogue"](around:${around});
);
out center tags;`;
}

function extractCoordinates(element: OverpassElement): Coordinates | null {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (
    element.center &&
    typeof element.center.lat === 'number' &&
    typeof element.center.lon === 'number'
  ) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function buildAddress(tags: Record<string, string>): string {
  const streetParts: string[] = [];

  if (tags['addr:street']) {
    streetParts.push(
      tags['addr:housenumber']
        ? `${tags['addr:street']} ${tags['addr:housenumber']}`
        : tags['addr:street'],
    );
  }

  if (tags['addr:place'] && streetParts.length === 0) {
    streetParts.push(tags['addr:place']);
  }

  const localityParts: string[] = [];
  if (tags['addr:city']) {
    localityParts.push(tags['addr:city']);
  } else if (tags['addr:town']) {
    localityParts.push(tags['addr:town']);
  } else if (tags['addr:village']) {
    localityParts.push(tags['addr:village']);
  }

  const addressParts = [...streetParts, ...localityParts].filter(Boolean);
  if (addressParts.length > 0) {
    return addressParts.join(', ');
  }

  if (tags['addr:full']) {
    return tags['addr:full'];
  }

  return 'כתובת לא זמינה';
}

function extractName(tags: Record<string, string>): string {
  const candidates = [
    tags.name,
    tags['name:he'],
    tags['name:en'],
    tags.official_name,
    tags.alt_name,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return OSM_SYNAGOGUE_NAME_FALLBACK;
}

function normalizeElement(
  element: OverpassElement,
  userCoordinates: Coordinates,
): Synagogue | null {
  const coordinates = extractCoordinates(element);
  if (!coordinates) {
    return null;
  }

  const tags = element.tags ?? {};
  const distanceMeters = calculateDistanceMeters(userCoordinates, coordinates);

  return {
    id: `${element.type}/${element.id}`,
    name: extractName(tags),
    address: buildAddress(tags),
    coordinates,
    distanceMeters,
    denomination: tags.denomination,
    osmType: element.type,
    osmId: element.id,
    tags,
  };
}

function parseOverpassResponse(
  payload: unknown,
  userCoordinates: Coordinates,
): Synagogue[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const response = payload as OverpassResponse;
  if (!Array.isArray(response.elements)) {
    return [];
  }

  const seenIds = new Set<string>();
  const synagogues: Synagogue[] = [];

  for (const element of response.elements) {
    if (
      !element ||
      (element.type !== 'node' &&
        element.type !== 'way' &&
        element.type !== 'relation') ||
      typeof element.id !== 'number'
    ) {
      continue;
    }

    const synagogue = normalizeElement(element, userCoordinates);
    if (!synagogue || seenIds.has(synagogue.id)) {
      continue;
    }

    seenIds.add(synagogue.id);
    synagogues.push(synagogue);
  }

  return synagogues.sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );
}

async function executeOverpassRequest(
  coordinates: Coordinates,
  radiusMeters: number,
): Promise<Synagogue[]> {
  const query = buildOverpassQuery(
    coordinates.latitude,
    coordinates.longitude,
    radiusMeters,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OVERPASS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Overpass API returned malformed JSON');
    }

    return parseOverpassResponse(payload, coordinates);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Overpass API request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches and normalizes nearby synagogues from OpenStreetMap via Overpass.
 * Includes in-flight deduplication and a short-lived in-memory cache.
 */
export async function fetchNearbySynagoguesFromOverpass(
  coordinates: Coordinates,
  radiusMeters: number,
): Promise<Synagogue[]> {
  const cacheKey = buildCacheKey(coordinates, radiusMeters);
  const cached = resultCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = executeOverpassRequest(coordinates, radiusMeters)
    .then((result) => {
      resultCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + OVERPASS_CACHE_TTL_MS,
      });
      return result;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, request);
  return request;
}
