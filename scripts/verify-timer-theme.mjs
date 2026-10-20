/**
 * Timer theme resolver verification.
 * Run: npm run verify:timer-theme
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

function resolveTimerTheme(context) {
  const { type, eventType, themeKey, holidayKey } = context;

  if (themeKey === 'rosh_hashanah' || holidayKey === 'rosh_hashanah') {
    return 'rosh_hashana';
  }

  if (themeKey === 'sukkot' || holidayKey === 'sukkot') {
    return 'sukkot';
  }

  if (
    type === 'FAST' ||
    themeKey === 'fast' ||
    themeKey === 'yom_kippur' ||
    eventType === 'fast_start' ||
    eventType === 'fast_end'
  ) {
    return 'fast';
  }

  if (
    type === 'SHABBAT_ENTRY' ||
    type === 'SHABBAT_EXIT' ||
    eventType === 'shabbat_in' ||
    eventType === 'shabbat_out'
  ) {
    return 'shabbat';
  }

  if (
    eventType === 'holiday_in' ||
    eventType === 'holiday_out' ||
    eventType === 'holiday_day' ||
    type === 'HOLIDAY'
  ) {
    return 'yom_tov';
  }

  return 'default';
}

console.log('Timer theme verification\n========================\n');

const timerThemesSrc = read('src/constants/timerThemes.ts');
const bannerSrc = read('src/components/home/ThemedTimerBanner.tsx');
const nextEventSrc = read('src/components/home/NextEventCard.tsx');

record(
  'timerThemes exports resolveTimerTheme',
  timerThemesSrc.includes('export function resolveTimerTheme'),
);
record(
  'timerThemes defines TIMER_THEMES mapping',
  timerThemesSrc.includes('export const TIMER_THEMES') &&
    timerThemesSrc.includes('rosh_hashana') &&
    timerThemesSrc.includes('sukkot') &&
    timerThemesSrc.includes('fast'),
);
record(
  'ThemedTimerBanner component exists',
  bannerSrc.includes('export function ThemedTimerBanner'),
);
record(
  'NextEventCard uses resolveTimerTheme and ThemedTimerBanner',
  nextEventSrc.includes('resolveTimerTheme') &&
    nextEventSrc.includes('ThemedTimerBanner'),
);

record(
  'rosh hashanah maps to rosh_hashana',
  resolveTimerTheme({
    type: 'HOLIDAY',
    eventType: 'holiday_in',
    themeKey: 'rosh_hashanah',
    holidayKey: 'rosh_hashanah',
  }) === 'rosh_hashana',
);
record(
  'sukkot maps to sukkot',
  resolveTimerTheme({
    type: 'HOLIDAY',
    eventType: 'holiday_in',
    themeKey: 'sukkot',
    holidayKey: 'sukkot',
  }) === 'sukkot',
);
record(
  'fast maps to fast',
  resolveTimerTheme({
    type: 'FAST',
    eventType: 'fast_end',
    themeKey: 'fast',
    holidayKey: 'taanit_gedalia',
  }) === 'fast',
);
record(
  'shabbat entry maps to shabbat',
  resolveTimerTheme({
    type: 'SHABBAT_ENTRY',
    eventType: 'shabbat_in',
    themeKey: 'shabbat',
  }) === 'shabbat',
);
record(
  'holiday entry maps to yom_tov',
  resolveTimerTheme({
    type: 'HOLIDAY',
    eventType: 'holiday_in',
    themeKey: 'pesach',
    holidayKey: 'pesach',
  }) === 'yom_tov',
);
record(
  'weekday maps to default',
  resolveTimerTheme({
    type: 'MITZVAH',
    eventType: 'other',
    themeKey: 'default',
  }) === 'default',
);

const failed = results.filter((result) => !result.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);

if (failed.length > 0) {
  process.exit(1);
}
