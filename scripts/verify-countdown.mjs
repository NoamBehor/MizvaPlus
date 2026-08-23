/**
 * Countdown regression checks — useCountdown infinite-render guard (P10.6.1).
 * Run: npm run verify:countdown
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function computeCountdown(targetDate) {
  const targetMs = new Date(targetDate).getTime();
  const nowMs = Date.now();
  const diffMs = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: diffMs === 0,
  };
}

function isSameCountdown(a, b) {
  return (
    a.hours === b.hours &&
    a.minutes === b.minutes &&
    a.seconds === b.seconds &&
    a.totalSeconds === b.totalSeconds &&
    a.isExpired === b.isExpired
  );
}

console.log('Countdown regression verification\n=================================\n');

const hookSrc = read('src/hooks/useCountdown.ts');
const nextEventSrc = read('src/components/home/NextEventCard.tsx');

record(
  'useCountdown guards setState when values are unchanged',
  hookSrc.includes('isSameCountdown') &&
    hookSrc.includes('isSameCountdown(prev, next) ? prev : next'),
);

record(
  'useCountdown tick callback is stable (empty deps)',
  /const tick = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/.test(hookSrc),
);

record(
  'useCountdown effect keys off target timestamp, not unstable callback',
  hookSrc.includes('[targetMs, tick]') && hookSrc.includes('targetDateRef'),
);

record(
  'useCountdown cleans up interval and AppState subscription',
  hookSrc.includes('clearInterval(interval)') &&
    hookSrc.includes('subscription.remove()'),
);

record(
  'NextEventCard does not pass new Date().toISOString() each render',
  !nextEventSrc.includes('new Date().toISOString()'),
);

record(
  'NextEventCard uses stable idle countdown fallback',
  nextEventSrc.includes('IDLE_COUNTDOWN_TARGET'),
);

const futureTarget = new Date(Date.now() + 3_661_000).toISOString();
const first = computeCountdown(futureTarget);
const second = computeCountdown(futureTarget);

record(
  'computeCountdown is deterministic for the same target',
  isSameCountdown(first, second),
);

const expired = computeCountdown('1970-01-01T00:00:00.000Z');
record(
  'expired target reports isExpired',
  expired.isExpired && expired.totalSeconds === 0,
);

const hasFailure = results.some((entry) => !entry.pass);
process.exit(hasFailure ? 1 : 0);
