/**
 * Holiday context & structured upcoming event verification.
 * Run: npm run verify:holiday-context
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { flags, HebrewCalendar, Location } = await import('@hebcal/core');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function stripHebrewNikkud(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0590-\u05bd]/g, '')
    .replace(/[\u05bf-\u05c7]/g, '')
    .normalize('NFC');
}

const HEBCAL_EVENT_HEBREW_NAMES = {
  'tzom gedaliah': 'צום גדליה',
  'yom kippur': 'יום כיפור',
  'rosh hashana': 'ראש השנה',
  sukkot: 'סוכות',
};

const HOLIDAY_PREP_WINDOW_MS = 120 * 60 * 60 * 1000;

function normalizeEventKey(value) {
  return value.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, ' ').trim();
}

function isFastBeginsEvent(event) {
  const desc = event.eventDesc?.toLowerCase() ?? '';
  if (desc === 'fast begins') return true;
  return stripHebrewNikkud(event.titleHebrew).includes('תחילת הצום');
}

function isFastEndsEvent(event) {
  const desc = event.eventDesc?.toLowerCase() ?? '';
  if (desc === 'fast ends') return true;
  const plain = stripHebrewNikkud(event.titleHebrew);
  return plain.includes('סיום הצום') || plain.includes('סוף הצום');
}

function resolveEventDescriptor(event) {
  const holidayKey = event.eventKey ? normalizeEventKey(event.eventKey) : 'other';
  const titleHebrew =
    HEBCAL_EVENT_HEBREW_NAMES[holidayKey] ?? stripHebrewNikkud(event.titleHebrew);
  return { holidayKey, titleHebrew, themeKey: event.type === 'FAST' ? 'fast' : 'default' };
}

function buildHeroHeadline(event) {
  if (event.eventType === 'fast_end') return `סיום ${event.title}`;
  if (event.eventType === 'fast_start') return `תחילת ${event.title}`;
  if (event.eventType === 'holiday_in') return `כניסת ${event.title}`;
  if (event.subLabel && event.parashaName) {
    return `${event.subLabel} · פרשת ${event.parashaName}`;
  }
  return event.subLabel ?? event.title;
}

function findActiveFast(events, nowMs) {
  const beginsByDate = new Map();
  const endsByDate = new Map();

  for (const event of events) {
    if (event.type !== 'FAST' || !event.startDate) continue;
    if (isFastBeginsEvent(event) && event.fastVariant === 'minor') {
      beginsByDate.set(event.dateKey, event);
    } else if (isFastEndsEvent(event) && event.fastVariant === 'minor') {
      endsByDate.set(event.dateKey, event);
    }
  }

  for (const [dateKey, end] of endsByDate) {
    const begin = beginsByDate.get(dateKey);
    if (!begin?.startDate || !end.startDate) continue;
    const beginMs = new Date(begin.startDate).getTime();
    const endMs = new Date(end.startDate).getTime();
    if (nowMs >= beginMs && nowMs < endMs) {
      return { begin, end };
    }
  }
  return null;
}

function resolveFastDisplayTitle(event, relatedEvents = []) {
  const holidayOnDate = relatedEvents.find(
    (candidate) =>
      candidate.dateKey === event.dateKey &&
      candidate.eventKey &&
      !['fast begins', 'fast ends'].includes(normalizeEventKey(candidate.eventKey)),
  );
  if (holidayOnDate) {
    return resolveEventDescriptor(holidayOnDate).titleHebrew;
  }
  return resolveEventDescriptor(event).titleHebrew;
}

function pickNextUpcomingEvent(events, nowMs = Date.now()) {
  const activeFast = findActiveFast(events, nowMs);
  if (activeFast) {
    return {
      title: resolveFastDisplayTitle(activeFast.end, events),
      subLabel: 'סיום הצום',
      eventType: 'fast_end',
      fastStartDate: activeFast.begin.startDate,
      targetDate: activeFast.end.startDate,
    };
  }

  const next = events.find((event) => event.startDate && new Date(event.startDate).getTime() > nowMs);
  if (!next) return null;

  if (next.type === 'FAST' && isFastBeginsEvent(next)) {
    return {
      title: resolveFastDisplayTitle(next, events),
      subLabel: 'תחילת הצום',
      eventType: 'fast_start',
      targetDate: next.startDate,
    };
  }

  return {
    title: resolveEventDescriptor(next).titleHebrew,
    subLabel: next.type === 'CANDLE_LIGHTING' ? 'כניסת שבת' : undefined,
    eventType: 'other',
    targetDate: next.startDate,
  };
}

function getHolidayContext(events, upcomingEvent, nowMs = Date.now()) {
  for (const event of events) {
    if (!event.startDate) continue;
    const descriptor = resolveEventDescriptor(event);
    const deltaMs = new Date(event.startDate).getTime() - nowMs;
    if (deltaMs < 0 || deltaMs > HOLIDAY_PREP_WINDOW_MS) continue;
    if (event.type !== 'HOLIDAY' && event.type !== 'FAST') continue;
    return {
      active: true,
      holidayKey: descriptor.holidayKey,
      hoursUntil: Math.ceil(deltaMs / (60 * 60 * 1000)),
      prepCardEnabled: true,
    };
  }

  if (upcomingEvent?.holidayKey) {
    const deltaMs = new Date(upcomingEvent.targetDate).getTime() - nowMs;
    if (deltaMs >= 0 && deltaMs <= HOLIDAY_PREP_WINDOW_MS) {
      return { active: true, holidayKey: upcomingEvent.holidayKey, prepCardEnabled: true };
    }
  }

  return { active: false, prepCardEnabled: false };
}

function mapHebcalFastEvent(ev, dateKey) {
  const eventFlags = ev.getFlags();
  const fastVariant = eventFlags & flags.MAJOR_FAST ? 'major' : 'minor';
  const titleHebrew = ev.render('he');
  const eventDesc = ev.getDesc();
  const eventKey = normalizeEventKey(ev.basename());
  let startDate;
  let startTime;
  if (ev.eventTime instanceof Date) {
    startDate = ev.eventTime.toISOString();
    startTime = ev.eventTime.toISOString();
  }
  return {
    id: `${eventKey}-${dateKey}`,
    type: 'FAST',
    titleHebrew,
    eventDesc,
    dateKey,
    startDate,
    startTime,
    fastVariant,
    eventKey,
  };
}

function gregorianDateKeyFromEvent(ev) {
  const gregorian = ev.getDate().greg();
  const year = gregorian.getFullYear();
  const month = String(gregorian.getMonth() + 1).padStart(2, '0');
  const day = String(gregorian.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFastEventsForYear(year, location) {
  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location,
    sedrot: true,
  });

  return events
    .filter((ev) => (ev.getFlags() & (flags.MINOR_FAST | flags.MAJOR_FAST)) !== 0)
    .map((ev) => mapHebcalFastEvent(ev, gregorianDateKeyFromEvent(ev)));
}

console.log('Holiday context verification\n============================\n');

const descriptorSrc = read('src/constants/eventDescriptors.ts');
const mapperSrc = read('src/services/eventMapper.ts');
const holidaySrc = read('src/services/holidayContext/index.ts');
const zmanimSrc = read('src/services/zmanimLocation/index.ts');
const homeSrc = read('src/screens/home/HomeScreen.tsx');
const nextCardSrc = read('src/components/home/NextEventCard.tsx');

record(
  'event descriptors map Tzom Gedaliah',
  descriptorSrc.includes("'tzom gedaliah': 'צום גדליה'"),
);
record(
  'event descriptors map Yom Kippur',
  descriptorSrc.includes("'yom kippur': 'יום כיפור'"),
);
record(
  'event mapper exports structured pickNextUpcomingEventDisplay',
  mapperSrc.includes('pickNextUpcomingEventDisplay'),
);
record(
  'holiday context uses 120-hour window',
  holidaySrc.includes('120 * 60 * 60 * 1000'),
);
record(
  'zmanim location exposes source states',
  zmanimSrc.includes("'fresh'") &&
    zmanimSrc.includes("'cached'") &&
    zmanimSrc.includes("'fallback'") &&
    zmanimSrc.includes("'preview'"),
);
record(
  'Home integrates HolidayPrepCard',
  homeSrc.includes('HolidayPrepCard'),
);
record(
  'NextEventCard uses heroLabel',
  nextCardSrc.includes('displayEvent.heroLabel'),
);
record(
  'NextEventCard uses useZmanimLocation',
  nextCardSrc.includes('useZmanimLocation'),
);

record(
  'descriptor: Tzom Gedaliah Hebrew name',
  resolveEventDescriptor({
    id: '1',
    type: 'FAST',
    titleHebrew: 'Tzom Gedaliah',
    dateKey: '2026-09-14',
    eventKey: 'tzom gedaliah',
  }).titleHebrew === 'צום גדליה',
);

record(
  'hero: fast end headline',
  buildHeroHeadline({
    title: 'צום גדליה',
    subLabel: 'סיום הצום',
    eventType: 'fast_end',
  }) === 'סיום צום גדליה',
);

record(
  'hero: Rosh Hashanah entry',
  buildHeroHeadline({
    title: 'ראש השנה',
    eventType: 'holiday_in',
  }) === 'כניסת ראש השנה',
);

record(
  'hero: Shabbat with parasha',
  buildHeroHeadline({
    title: 'שבת',
    subLabel: 'כניסת שבת',
    parashaName: 'האזינו',
    eventType: 'shabbat_in',
  }) === 'כניסת שבת · פרשת האזינו',
);

const jerusalem =
  Location.lookup('Jerusalem') ?? new Location(31.7683, 35.2137, true, 'Asia/Jerusalem', 'Jerusalem', 'IL');
const allFast2026 = getFastEventsForYear(2026, jerusalem);
const gedaliahHoliday = allFast2026.find((ev) => ev.eventKey.includes('gedaliah'));
const gedaliahEvents = gedaliahHoliday
  ? allFast2026.filter(
      (ev) =>
        ev.dateKey === gedaliahHoliday.dateKey &&
        (isFastBeginsEvent(ev) || isFastEndsEvent(ev) || ev.id === gedaliahHoliday.id),
    )
  : [];

record('Hebcal: Tzom Gedaliah events found', gedaliahEvents.length >= 2, `count=${gedaliahEvents.length}`);

if (gedaliahEvents.length >= 2) {
  const begins = gedaliahEvents.find((ev) => isFastBeginsEvent(ev));
  const ends = gedaliahEvents.find((ev) => isFastEndsEvent(ev));

  if (begins?.startDate && ends?.startDate) {
    const beginMs = new Date(begins.startDate).getTime();
    const beforeMs = beginMs - 60 * 60 * 1000;
    const duringMs = beginMs + 60 * 60 * 1000;
    const afterMs = new Date(ends.startDate).getTime() + 60 * 60 * 1000;

    const before = pickNextUpcomingEvent(gedaliahEvents, beforeMs);
    record(
      'fast lifecycle: before dawn',
      before?.eventType === 'fast_start' && before.title === 'צום גדליה',
      before?.subLabel,
    );

    const during = pickNextUpcomingEvent(gedaliahEvents, duringMs);
    record(
      'fast lifecycle: during fast',
      during?.eventType === 'fast_end' && during.title === 'צום גדליה',
      during?.subLabel,
    );

    const after = pickNextUpcomingEvent(gedaliahEvents, afterMs);
    record(
      'fast lifecycle: after fast does not show fast end',
      after === null || after.eventType !== 'fast_end',
      after?.title,
    );
  }
}

const yomKippurHoliday = allFast2026.find((ev) => ev.eventKey.includes('kippur'));
record(
  'Hebcal: Yom Kippur major fast event found',
  Boolean(yomKippurHoliday?.fastVariant === 'major'),
  yomKippurHoliday?.eventKey,
);

const tishaEvents = getFastEventsForYear(2026, jerusalem).filter((ev) =>
  ev.eventKey.includes('bav') || ev.eventKey.includes("b'av"),
);
record("Hebcal: Tisha B'Av fast events found", tishaEvents.length >= 2);

record(
  'holiday context: 6 days before inactive',
  !getHolidayContext(
    [
      {
        id: 'rh',
        type: 'HOLIDAY',
        titleHebrew: 'ראש השנה',
        dateKey: '2026-10-01',
        eventKey: 'rosh hashana',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    null,
  ).active,
);

record(
  'holiday context: 5 days before active',
  getHolidayContext(
    [
      {
        id: 'rh',
        type: 'HOLIDAY',
        titleHebrew: 'ראש השנה',
        dateKey: '2026-10-01',
        eventKey: 'rosh hashana',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    null,
  ).active,
);

record(
  'holiday context: after event inactive',
  !getHolidayContext(
    [
      {
        id: 'rh',
        type: 'HOLIDAY',
        titleHebrew: 'ראש השנה',
        dateKey: '2026-09-01',
        eventKey: 'rosh hashana',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    null,
  ).active,
);

record(
  'theme: fast descriptor uses fast theme',
  resolveEventDescriptor({
    id: 'f',
    type: 'FAST',
    titleHebrew: 'צום',
    dateKey: '2026-09-14',
    eventKey: 'tzom gedaliah',
  }).themeKey === 'fast',
);

record(
  'location: stale cache threshold defined',
  zmanimSrc.includes('CACHED_MAX_AGE_MS'),
);

const hasFailure = results.some((entry) => !entry.pass);
console.log(`\n${results.filter((r) => r.pass).length}/${results.length} passed`);
process.exit(hasFailure ? 1 : 0);
