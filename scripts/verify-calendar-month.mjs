/**
 * Hebrew monthly calendar engine verification.
 * Run: node scripts/verify-calendar-month.mjs
 *
 * Mirrors grid padding from src/services/calendar/hebrewMonthGrid.ts
 * and checks live @hebcal/core dates. Never asserts hardcoded zmanim.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function shiftDateKeyByDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function buildHebrewMonthGridKeys(firstDateKey, daysInMonth, startWeekday) {
  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push({
      dateKey: shiftDateKeyByDays(firstDateKey, i - startWeekday),
      inCurrentMonth: false,
    });
  }
  for (let day = 0; day < daysInMonth; day += 1) {
    cells.push({
      dateKey: shiftDateKeyByDays(firstDateKey, day),
      inCurrentMonth: true,
    });
  }
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const lastKey = cells[cells.length - 1]?.dateKey ?? firstDateKey;
    const pad = 7 - remainder;
    for (let i = 1; i <= pad; i += 1) {
      cells.push({
        dateKey: shiftDateKeyByDays(lastKey, i),
        inCurrentMonth: false,
      });
    }
  }
  return cells;
}

function gregorianDateKeyFromGreg(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function runSourceAudit() {
  const types = read('src/types/calendar.ts');
  record(
    'Types: CalendarHebrewMonth and getHebrewMonth exist',
    types.includes('export interface CalendarHebrewMonth') &&
      types.includes('getHebrewMonth('),
  );

  const grid = read('src/services/calendar/hebrewMonthGrid.ts');
  record(
    'Grid helper: Sunday-start padding via startWeekday',
    grid.includes('export function buildHebrewMonthGridKeys') &&
      grid.includes('inCurrentMonth'),
  );

  const provider = read('src/services/calendar/hebcalProvider.ts');
  record(
    'Provider: getHebrewMonth uses buildDayInfo, not calendarService.getDayInfo',
    provider.includes('async getHebrewMonth') &&
      provider.includes('buildDayInfo(key.dateKey, resolved)') &&
      !provider.includes('calendarService.getDayInfo'),
  );
  record(
    'Provider still Israel-only with live candles',
    provider.includes('il: true') &&
      provider.includes('candlelighting: true') &&
      !provider.includes('T12:00:00'),
  );

  const service = read('src/services/calendar/calendarService.ts');
  record(
    'Service: getHebrewMonth uses one timeout and a month cache key',
    service.includes('async getHebrewMonth') &&
      service.includes('month:${hebrewYear}:${hebrewMonth}:') &&
      service.includes('20000'),
  );

  const presentation = read('src/services/calendar/calendarCellPresentation.ts');
  record(
    'Presentation: holiday > fast > shabbat > erev priority',
    presentation.includes("category: 'holiday'") &&
      presentation.indexOf("category: 'holiday'") <
        presentation.indexOf("category: 'fast'") &&
      presentation.indexOf("category: 'fast'") <
        presentation.indexOf("category: 'shabbat'") &&
      presentation.indexOf("category: 'erev'") > 0,
  );
  record(
    'Presentation: omer via HDate, not a second calendar table',
    presentation.includes('getOmerCount') &&
      presentation.includes('months.NISAN') &&
      !presentation.includes('חודש הגאולה'),
  );
}

async function runLiveCalendarFacts() {
  const { HDate, HebrewCalendar, Location, flags, months, gematriya } =
    await import('@hebcal/core');

  const nisan1 = new HDate(1, months.NISAN, 5785);
  const firstDateKey = gregorianDateKeyFromGreg(nisan1.greg());
  record(
    'Nisan 1 5785 has a Gregorian date key from HDate',
    /^\d{4}-\d{2}-\d{2}$/.test(firstDateKey),
    firstDateKey,
  );
  record(
    'Nisan 1 weekday is 0-6',
    nisan1.getDay() >= 0 && nisan1.getDay() <= 6,
    String(nisan1.getDay()),
  );

  const grid = buildHebrewMonthGridKeys(
    firstDateKey,
    nisan1.daysInMonth(),
    nisan1.getDay(),
  );
  record(
    'Grid length is divisible by 7',
    grid.length % 7 === 0,
    String(grid.length),
  );

  const firstInMonthIndex = grid.findIndex((cell) => cell.inCurrentMonth);
  record(
    'First in-month cell index matches HDate weekday',
    firstInMonthIndex === nisan1.getDay(),
    `index ${firstInMonthIndex}, weekday ${nisan1.getDay()}`,
  );
  record(
    'Leading pads are out of month',
    grid.slice(0, firstInMonthIndex).every((cell) => !cell.inCurrentMonth),
  );
  record(
    'Trailing pads are out of month',
    grid.filter((cell) => !cell.inCurrentMonth).length > 0 &&
      !grid[grid.length - 1].inCurrentMonth,
  );

  const nisan15 = new HDate(15, months.NISAN, 5785);
  const nisan15Key = gregorianDateKeyFromGreg(nisan15.greg());
  record(
    'Nisan 15 5785 has a Gregorian date key',
    /^\d{4}-\d{2}-\d{2}$/.test(nisan15Key),
    nisan15Key,
  );
  record(
    'Hebrew day 15 gematriya is ט״ו or טו',
    /ט.?ו/.test(gematriya(15)),
    gematriya(15),
  );
  const nisan15Cell = grid.find((cell) => cell.dateKey === nisan15Key);
  record(
    'Nisan 15 sits in the in-month grid',
    Boolean(nisan15Cell?.inCurrentMonth),
  );

  const jerusalem = Location.lookup('Jerusalem');
  const yearEvents = HebrewCalendar.calendar({
    year: nisan1.greg().getFullYear(),
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: jerusalem,
    sedrot: true,
  });

  const pesach = yearEvents.find(
    (ev) =>
      gregorianDateKeyFromGreg(ev.getDate().greg()) === nisan15Key &&
      (ev.getFlags() & flags.CHAG) !== 0,
  );
  record('Pesach 15 Nisan is a CHAG holiday', Boolean(pesach), pesach?.getDesc());

  const taanit = yearEvents.find((ev) => {
    const desc = ev.getDesc().toLowerCase();
    return (
      desc.includes('ta\'anit bechorot') ||
      desc.includes('taanit bechorot') ||
      desc.includes('fast of the first born')
    );
  });
  record(
    'Taanit Bechorot exists in the Nisan season (may be postponed from Shabbat)',
    Boolean(taanit),
    taanit
      ? `${taanit.getDesc()} ${gregorianDateKeyFromGreg(taanit.getDate().greg())}`
      : '',
  );

  const fridayInNisan = grid.find((cell) => {
    if (!cell.inCurrentMonth) {
      return false;
    }
    const [y, m, d] = cell.dateKey.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getDay() === 5;
  });
  record('Nisan grid contains a Friday', Boolean(fridayInNisan), fridayInNisan?.dateKey);

  const haifa = new Location(32.794, 34.9896, true, 'Asia/Jerusalem', 'Haifa', 'IL');
  const jerusalemEvents = HebrewCalendar.calendar({
    year: 2025,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: jerusalem,
    sedrot: true,
  });
  const haifaEvents = HebrewCalendar.calendar({
    year: 2025,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: haifa,
    sedrot: true,
  });
  const fridayKey = fridayInNisan?.dateKey;
  const jerusalemCandle = jerusalemEvents.find(
    (ev) =>
      (ev.getFlags() & flags.LIGHT_CANDLES) !== 0 &&
      gregorianDateKeyFromGreg(ev.getDate().greg()) === fridayKey,
  );
  const haifaCandle = haifaEvents.find(
    (ev) =>
      (ev.getFlags() & flags.LIGHT_CANDLES) !== 0 &&
      gregorianDateKeyFromGreg(ev.getDate().greg()) === fridayKey,
  );
  record(
    'Friday candle times exist for Jerusalem and Haifa',
    Boolean(jerusalemCandle?.eventTime) && Boolean(haifaCandle?.eventTime),
  );
  record(
    'Friday candle times differ by location (not hardcoded)',
    Boolean(jerusalemCandle?.eventTime) &&
      Boolean(haifaCandle?.eventTime) &&
      jerusalemCandle.eventTime.getTime() !== haifaCandle.eventTime.getTime(),
  );

  const shabbatCell = grid.find((cell) => {
    if (!cell.inCurrentMonth) {
      return false;
    }
    const [y, m, d] = cell.dateKey.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getDay() === 6;
  });
  const shabbatEvents = yearEvents.filter(
    (ev) =>
      gregorianDateKeyFromGreg(ev.getDate().greg()) === shabbatCell?.dateKey,
  );
  const shabbatTypes = new Set(
    shabbatEvents.map((ev) => {
      const desc = ev.getDesc().toLowerCase();
      if (desc.includes('havdalah')) return 'HAVDALAH';
      if ((ev.getFlags() & flags.PARSHA_HASHAVUA) !== 0) return 'SHABBAT';
      if ((ev.getFlags() & flags.CHAG) !== 0) return 'HOLIDAY';
      if ((ev.getFlags() & flags.LIGHT_CANDLES) !== 0) return 'CANDLE_LIGHTING';
      return 'OTHER';
    }),
  );
  record(
    'A Shabbat date can carry multiple event types',
    shabbatTypes.size >= 2,
    [...shabbatTypes].join(','),
  );

  record(
    'Leap year 5784 has Adar II (month 13)',
    HDate.isLeapYear(5784) &&
      new HDate(1, 13, 5784).getMonth() === 13,
  );
}

runSourceAudit();
try {
  await runLiveCalendarFacts();
} catch (error) {
  record('Live @hebcal/core month facts', false, String(error));
}

const failed = results.filter((item) => !item.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
