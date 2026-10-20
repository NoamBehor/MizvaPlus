/**
 * Core pure-logic verification (unit-style harness).
 * Run: npm run verify:core-logic
 *
 * Mirrors critical paths in src/utils — keep in sync when changing algorithms.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateDistanceMeters,
  findMinyanProximityCandidates,
  pruneNotifiedProximityReports,
  shouldSuppressProximityAlert,
} from './lib/minyanProximityEvaluation.harness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  record(label, pass, pass ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return pass;
}

function assertTrue(condition, label, detail = '') {
  record(label, Boolean(condition), detail);
  return Boolean(condition);
}

// ─── Mirrors src/utils/distance.ts (format + offset) ───────────────────────

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function formatDistanceMeters(meters) {
  if (!Number.isFinite(meters) || meters < 0) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} מטר`;
  }
  const kilometers = meters / 1000;
  const rounded =
    kilometers >= 10 ? Math.round(kilometers).toString() : kilometers.toFixed(1);
  return `${rounded} ק"מ`;
}

function offsetCoordinates(origin, eastMeters, northMeters) {
  const latitude =
    origin.latitude + (northMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitude =
    origin.longitude +
    (eastMeters /
      (EARTH_RADIUS_METERS * Math.cos(toRadians(origin.latitude)))) *
      (180 / Math.PI);
  return { latitude, longitude };
}

// ─── Mirrors src/utils/time.ts ─────────────────────────────────────────────

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimeString(value) {
  return TIME_PATTERN.test(value);
}

function parseTimeString(time) {
  if (!isValidTimeString(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

// ─── Mirrors src/utils/podcastResume.ts ────────────────────────────────────

const PODCAST_RESUME_MIN_SECONDS = 5;
const PODCAST_RESUME_END_BUFFER_SECONDS = 10;

function sanitizePodcastSeconds(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function canResumePodcast(positionSeconds, durationSeconds) {
  const position = sanitizePodcastSeconds(positionSeconds);
  const duration = sanitizePodcastSeconds(durationSeconds);
  if (duration <= 0) {
    return false;
  }
  return (
    position > PODCAST_RESUME_MIN_SECONDS &&
    position < duration - PODCAST_RESUME_END_BUFFER_SECONDS
  );
}

function isPodcastEpisodeCompleted(positionSeconds, durationSeconds) {
  const position = sanitizePodcastSeconds(positionSeconds);
  const duration = sanitizePodcastSeconds(durationSeconds);
  if (duration <= 0) {
    return false;
  }
  return position >= duration - PODCAST_RESUME_END_BUFFER_SECONDS;
}

// ─── Mirrors src/utils/date.ts ─────────────────────────────────────────────

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

function runDistanceTests() {
  const jerusalem = { latitude: 31.7683, longitude: 35.2137 };
  const telAviv = { latitude: 32.0853, longitude: 34.7818 };
  const meters = calculateDistanceMeters(jerusalem, telAviv);
  assertTrue(meters > 50_000 && meters < 60_000, 'Haversine: Jerusalem–Tel Aviv ~53km', `${Math.round(meters)}m`);

  assertEqual(formatDistanceMeters(350), '350 מטר', 'formatDistanceMeters: sub-km');
  assertEqual(formatDistanceMeters(1500), '1.5 ק"מ', 'formatDistanceMeters: km decimal');
  assertEqual(formatDistanceMeters(-1), '—', 'formatDistanceMeters: invalid');

  const offset = offsetCoordinates(jerusalem, 0, 1000);
  const back = calculateDistanceMeters(jerusalem, offset);
  assertTrue(back > 990 && back < 1010, 'offsetCoordinates: ~1km north', `${Math.round(back)}m`);
}

function runTimeTests() {
  assertTrue(isValidTimeString('09:30'), 'isValidTimeString: valid morning');
  assertTrue(!isValidTimeString('24:00'), 'isValidTimeString: rejects 24:00');
  assertTrue(!isValidTimeString('9:30'), 'isValidTimeString: rejects single-digit hour');

  assertEqual(parseTimeString('18:05'), { hours: 18, minutes: 5 }, 'parseTimeString');
  let parseInvalidThrew = false;
  try {
    parseTimeString('99:99');
  } catch {
    parseInvalidThrew = true;
  }
  assertTrue(parseInvalidThrew, 'parseTimeString: throws on invalid input');
  assertEqual(formatCountdown(3661), '01:01:01', 'formatCountdown');
  assertEqual(formatCountdown(0), '00:00:00', 'formatCountdown: zero');
}

function runPodcastResumeTests() {
  assertEqual(sanitizePodcastSeconds(12.9), 12, 'sanitizePodcastSeconds floors');
  assertEqual(sanitizePodcastSeconds(-3), 0, 'sanitizePodcastSeconds negative');

  assertTrue(canResumePodcast(30, 120), 'canResumePodcast: mid episode');
  assertTrue(!canResumePodcast(3, 120), 'canResumePodcast: too early');
  assertTrue(!canResumePodcast(115, 120), 'canResumePodcast: near end buffer');
  assertTrue(isPodcastEpisodeCompleted(115, 120), 'isPodcastEpisodeCompleted: in buffer');
  assertTrue(!isPodcastEpisodeCompleted(0, 0), 'isPodcastEpisodeCompleted: zero duration');
}

function runDateTests() {
  assertEqual(getPreviousDateKey('2026-03-01'), '2026-02-28', 'getPreviousDateKey: leap year boundary');
}

const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

function getTimeZoneOffsetMs(timeZone, date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const hourRaw = Number(parts.hour);
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function israelWallTimeToDate(dateKey, time) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const { hours, minutes } = parseTimeString(time);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0);
  let instant = utcGuess;
  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(ISRAEL_TIMEZONE, new Date(instant));
    const next = utcGuess - offset;
    if (next === instant) {
      break;
    }
    instant = next;
  }
  return new Date(instant);
}

function runReminderTimezoneTests() {
  const winter = israelWallTimeToDate('2026-01-15', '07:30');
  const summer = israelWallTimeToDate('2026-07-15', '07:30');
  assertEqual(winter.toISOString(), '2026-01-15T05:30:00.000Z', 'israelWallTimeToDate: winter IST+2');
  assertEqual(summer.toISOString(), '2026-07-15T04:30:00.000Z', 'israelWallTimeToDate: summer IDT+3');
  assertTrue(
    winter.getTime() !== summer.getTime(),
    'israelWallTimeToDate: DST changes UTC instant for same wall clock',
  );
}

function runProximityDedupTests() {
  const expires = '2099-01-01T12:00:00.000Z';
  assertTrue(
    shouldSuppressProximityAlert('r1', expires, { r1: expires }),
    'shouldSuppressProximityAlert: same expiry',
  );
  assertTrue(
    !shouldSuppressProximityAlert('r1', expires, { r1: '2099-01-02T12:00:00.000Z' }),
    'shouldSuppressProximityAlert: expiry changed',
  );
  const pruned = pruneNotifiedProximityReports(
    { alive: '2099-01-01T12:00:00.000Z', dead: '2020-01-01T12:00:00.000Z' },
    new Date('2026-01-01T00:00:00.000Z'),
  );
  assertEqual(Object.keys(pruned), ['alive'], 'pruneNotifiedProximityReports: drops expired');
}

function runMinyanProximityTests() {
  const synagogue = {
    id: 'node/1',
    coordinates: { latitude: 31.7683, longitude: 35.2137 },
  };
  const userNear = { latitude: 31.76831, longitude: 35.21371 };
  const candidates = findMinyanProximityCandidates({
    userCoordinates: userNear,
    synagogues: [synagogue],
    reports: [
      {
        synagogueOsmKey: 'node/1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ],
    radiusMeters: 150,
  });
  assertEqual(candidates.length, 1, 'minyan proximity: match within radius');

  const far = findMinyanProximityCandidates({
    userCoordinates: { latitude: 32.0, longitude: 35.5 },
    synagogues: [synagogue],
    reports: [
      {
        synagogueOsmKey: 'node/1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    ],
  });
  assertEqual(far.length, 0, 'minyan proximity: outside radius');

  const expired = findMinyanProximityCandidates({
    userCoordinates: userNear,
    synagogues: [synagogue],
    reports: [
      {
        synagogueOsmKey: 'node/1',
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      },
    ],
  });
  assertEqual(expired.length, 0, 'minyan proximity: expired report skipped');
}

console.log(`Core logic verification (root: ${root})\n`);

runDistanceTests();
runTimeTests();
runPodcastResumeTests();
runDateTests();
runReminderTimezoneTests();
runProximityDedupTests();
runMinyanProximityTests();

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${passed}/${results.length} passed${failed ? `, ${failed} failed` : ''}`);
process.exit(failed > 0 ? 1 : 0);
