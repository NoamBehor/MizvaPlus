import { getMitzvahById } from '@/services/mitzvot';
import {
  planCalendarMitzvahReminders,
  resolveNextOccasionDisplayDateKey,
  type CalendarMitzvahReminder,
} from '@/services/calendarMitzvahReminders';
import type { HebrewCalendarEvent } from '@/types/calendar';
import type { Mitzvah, UserMitzvahPreference } from '@/types/mitzvah';
import { israelWallTimeToDate } from '@/utils/reminderTimezone';
import { addDaysToDateKey, getIsraelDateKey } from '@/utils/timezone';

let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
}

function mitzvah(id: string): Mitzvah {
  const found = getMitzvahById(id);
  if (!found) {
    throw new Error(`missing mitzvah ${id}`);
  }
  return found;
}

function preference(mitzvahId: string, enabled: boolean): UserMitzvahPreference {
  return {
    userId: 'user-a',
    mitzvahId,
    enabled,
    reminderEnabled: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function event(partial: HebrewCalendarEvent): HebrewCalendarEvent {
  return partial;
}

function offsets(reminders: CalendarMitzvahReminder[]): string[] {
  return reminders.map((reminder) => reminder.offset).sort();
}

const now = new Date('2026-08-01T09:00:00.000Z').getTime();
const noSunset = () => null;

const gedaliaStart = '2026-09-14T02:10:00.000Z';
const gedalia = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: now,
  mitzvot: [mitzvah('taanit-gedalia'), mitzvah('tefillin')],
  preferences: {
    'taanit-gedalia': preference('taanit-gedalia', true),
    tefillin: preference('tefillin', true),
  },
  sunsetForDateKey: noSunset,
  events: [
    event({
      id: 'gedalia-begins',
      type: 'FAST',
      titleHebrew: 'תחילת הצום',
      eventDesc: 'Fast begins',
      dateKey: '2026-09-14',
      startDate: gedaliaStart,
      startTime: '05:10',
    }),
    event({
      id: 'gedalia-name',
      type: 'FAST',
      titleHebrew: 'צום גדליה',
      eventDesc: 'Tzom Gedaliah',
      eventKey: 'tzom gedaliah',
      dateKey: '2026-09-14',
      linkedMitzvahIds: ['taanit-gedalia'],
    }),
  ],
});

assert(gedalia.length === 3, 'fast begin schedules week, day, and hour');
assert(
  offsets(gedalia).join(',') === 'day,hour,week',
  'fast begin offsets are week, day, and hour',
);
assert(
  gedalia.every((reminder) => reminder.holidayKey === 'taanit_gedalia'),
  'fast begin is keyed by the fast',
);
assert(
  gedalia.every((reminder) => !reminder.identifier.includes('tefillin')),
  'daily mitzvot do not get occasion reminders',
);

const gedaliaStartKey = getIsraelDateKey(new Date(gedaliaStart));
const week = gedalia.find((reminder) => reminder.offset === 'week');
const hour = gedalia.find((reminder) => reminder.offset === 'hour');
assert(
  week?.dateIso ===
    israelWallTimeToDate(addDaysToDateKey(gedaliaStartKey, -7), '09:00').toISOString(),
  'week reminder is 09:00 Israel seven days before the fast',
);
assert(week?.body === 'בעוד שבוע', 'week reminder says בעוד שבוע');
assert(hour?.body === 'בעוד שעה', 'hour reminder says בעוד שעה');
assert(
  hour?.dateIso === new Date(new Date(gedaliaStart).getTime() - 60 * 60 * 1000).toISOString(),
  'hour reminder is one hour before fast begins',
);

const nearNow = new Date(gedaliaStart).getTime() - 2 * 60 * 60 * 1000;
const near = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: nearNow,
  mitzvot: [mitzvah('taanit-gedalia')],
  preferences: { 'taanit-gedalia': preference('taanit-gedalia', true) },
  sunsetForDateKey: noSunset,
  events: [
    event({
      id: 'gedalia-begins',
      type: 'FAST',
      titleHebrew: 'תחילת הצום',
      eventDesc: 'Fast begins',
      dateKey: '2026-09-14',
      startDate: gedaliaStart,
      startTime: '05:10',
    }),
    event({
      id: 'gedalia-name',
      type: 'FAST',
      titleHebrew: 'צום גדליה',
      eventKey: 'tzom gedaliah',
      dateKey: '2026-09-14',
      linkedMitzvahIds: ['taanit-gedalia'],
    }),
  ],
});
assert(offsets(near).join(',') === 'hour', 'past week and day reminders are skipped');

const sukkotCandle = '2026-09-24T15:13:00.000Z';
const sukkot = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: now,
  mitzvot: [mitzvah('sukkot')],
  preferences: { sukkot: preference('sukkot', true) },
  sunsetForDateKey: () => '2026-09-23T15:50:00.000Z',
  events: [
    event({
      id: 'erev-sukkot',
      type: 'HOLIDAY',
      titleHebrew: 'ערב סוכות',
      eventDesc: 'Erev Sukkot',
      dateKey: '2026-09-24',
      linkedMitzvahIds: ['sukkot'],
    }),
    event({
      id: 'sukkot-candles',
      type: 'CANDLE_LIGHTING',
      titleHebrew: 'הדלקת נרות',
      eventDesc: 'Candle lighting',
      dateKey: '2026-09-24',
      startDate: sukkotCandle,
      startTime: '18:13',
    }),
    event({
      id: 'sukkot-1',
      type: 'HOLIDAY',
      titleHebrew: 'סוכות',
      eventDesc: 'Sukkot I',
      dateKey: '2026-09-25',
      linkedMitzvahIds: ['sukkot'],
    }),
    event({
      id: 'sukkot-2',
      type: 'HOLIDAY',
      titleHebrew: 'סוכות',
      eventDesc: 'Sukkot II (CH\'\'M)',
      dateKey: '2026-09-26',
      linkedMitzvahIds: ['sukkot'],
    }),
    event({
      id: 'sukkot-2-candles',
      type: 'CANDLE_LIGHTING',
      titleHebrew: 'הדלקת נרות',
      eventDesc: 'Candle lighting',
      dateKey: '2026-09-25',
      startDate: '2026-09-25T15:10:00.000Z',
      startTime: '18:10',
    }),
  ],
});
assert(sukkot.length === 3, 'multi-day holiday schedules one set at the start');
assert(
  sukkot.find((reminder) => reminder.offset === 'hour')?.dateIso ===
    new Date(new Date(sukkotCandle).getTime() - 60 * 60 * 1000).toISOString(),
  'candle-lighting holiday uses eve candle lighting, not day 2',
);

const purimSunset = '2026-03-02T16:00:00.000Z';
const purim = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: new Date('2026-01-01T00:00:00.000Z').getTime(),
  mitzvot: [mitzvah('purim')],
  preferences: { purim: preference('purim', true) },
  sunsetForDateKey: (dateKey) => (dateKey === '2026-03-02' ? purimSunset : null),
  events: [
    event({
      id: 'erev-purim',
      type: 'HOLIDAY',
      titleHebrew: 'ערב פורים',
      eventDesc: 'Erev Purim',
      dateKey: '2026-03-02',
      linkedMitzvahIds: ['purim'],
    }),
    event({
      id: 'purim-day',
      type: 'HOLIDAY',
      titleHebrew: 'פורים',
      eventDesc: 'Purim',
      dateKey: '2026-03-03',
      linkedMitzvahIds: ['purim'],
    }),
  ],
});
assert(purim.length === 3, 'untimed holiday schedules from sunset on the eve');
assert(
  purim.find((reminder) => reminder.offset === 'hour')?.dateIso ===
    new Date(new Date(purimSunset).getTime() - 60 * 60 * 1000).toISOString(),
  'untimed holiday hour reminder is one hour before sunset',
);

const yomKippur = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: now,
  mitzvot: [mitzvah('yom-kippur'), mitzvah('yom-kippur-fast')],
  preferences: {
    'yom-kippur': preference('yom-kippur', true),
    'yom-kippur-fast': preference('yom-kippur-fast', true),
  },
  sunsetForDateKey: noSunset,
  events: [
    event({
      id: 'yk-candles',
      type: 'CANDLE_LIGHTING',
      titleHebrew: 'הדלקת נרות',
      eventDesc: 'Candle lighting',
      dateKey: '2026-09-20',
      startDate: '2026-09-20T15:19:00.000Z',
      startTime: '18:19',
    }),
    event({
      id: 'yk-day',
      type: 'HOLIDAY',
      titleHebrew: 'יום כיפור',
      eventDesc: 'Yom Kippur',
      dateKey: '2026-09-21',
      linkedMitzvahIds: ['yom-kippur', 'yom-kippur-fast'],
    }),
    event({
      id: 'yk-fast',
      type: 'FAST',
      titleHebrew: 'תחילת הצום',
      eventDesc: 'Fast begins',
      dateKey: '2026-09-20',
      startDate: '2026-09-20T15:19:00.000Z',
      startTime: '18:19',
    }),
  ],
});
assert(yomKippur.length === 3, 'Yom Kippur holiday and fast share one reminder set');
assert(
  new Set(yomKippur.map((reminder) => reminder.identifier)).size === 3,
  'Yom Kippur identifiers are unique',
);
assert(
  yomKippur.every((reminder) => reminder.identifier.includes(':yom_kippur:')),
  'Yom Kippur reminders use the shared holiday key',
);

const disabled = planCalendarMitzvahReminders({
  userId: 'user-a',
  nowMs: now,
  mitzvot: [mitzvah('pesach')],
  preferences: { pesach: preference('pesach', false) },
  sunsetForDateKey: noSunset,
  events: [
    event({
      id: 'pesach-candles',
      type: 'CANDLE_LIGHTING',
      titleHebrew: 'הדלקת נרות',
      dateKey: '2026-04-01',
      startDate: '2026-04-01T15:39:00.000Z',
      startTime: '18:39',
    }),
    event({
      id: 'pesach-day',
      type: 'HOLIDAY',
      titleHebrew: 'פסח',
      eventDesc: 'Pesach I',
      dateKey: '2026-04-02',
      linkedMitzvahIds: ['pesach'],
    }),
  ],
});
assert(disabled.length === 0, 'disabled mitzvah produces no reminders');

const ykDateKey = resolveNextOccasionDisplayDateKey({
  mitzvahId: 'yom-kippur-fast',
  nowMs: now,
  sunsetForDateKey: noSunset,
  events: [
    event({
      id: 'yk-erev',
      type: 'HOLIDAY',
      titleHebrew: 'ערב יום כיפור',
      eventDesc: 'Erev Yom Kippur',
      dateKey: '2026-09-20',
      linkedMitzvahIds: ['yom-kippur', 'yom-kippur-fast'],
    }),
    event({
      id: 'yk-day',
      type: 'HOLIDAY',
      titleHebrew: 'יום כיפור',
      eventDesc: 'Yom Kippur',
      dateKey: '2026-09-21',
      linkedMitzvahIds: ['yom-kippur', 'yom-kippur-fast'],
    }),
    event({
      id: 'yk-fast',
      type: 'FAST',
      titleHebrew: 'תחילת הצום',
      eventDesc: 'Fast begins',
      dateKey: '2026-09-20',
      startDate: '2026-09-20T15:19:00.000Z',
      linkedMitzvahIds: ['yom-kippur-fast'],
    }),
  ],
});
assert(ykDateKey === '2026-09-21', 'Yom Kippur fast next date is the holiday day');

if (failed > 0) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}

console.log('occasion reminder checks passed');
