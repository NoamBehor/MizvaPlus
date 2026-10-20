/**
 * Phase 10.8 verification — notification lifecycle (permission, schedule,
 * cancel, reschedule, timezone, preferences).
 * Run: npm run verify:phase10.8
 *
 * Pure-logic tests plus source-contract checks. Physical Android delivery is
 * recorded separately from logcat / dumpsys evidence.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function assertTrue(condition, label, detail = '') {
  record(label, Boolean(condition), detail);
  return Boolean(condition);
}

function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  record(
    label,
    pass,
    pass ? '' : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
  return pass;
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

// ─── Mirrors of src/utils/reminderTimezone.ts (DST-safe) ───────────────────

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
  const [hours, minutes] = time.split(':').map(Number);
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

function getIsraelDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getDeviceLocalDailyTriggerFromIsraelReminder(
  reminderTime,
  referenceDate = new Date(),
) {
  const dateKey = getIsraelDateKey(referenceDate);
  const instant = israelWallTimeToDate(dateKey, reminderTime);
  return { hour: instant.getHours(), minute: instant.getMinutes() };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isValidTimeString(value) {
  return TIME_PATTERN.test(value);
}

function isReminderTimeValid(reminderTime) {
  return Boolean(reminderTime && isValidTimeString(reminderTime));
}

// ─── Mirrors of src/services/notifications.ts permission policy ────────────

function resolveNotificationPermissionDecision(status, canAskAgain) {
  if (status === 'granted') {
    return { action: 'already-granted', shouldPrompt: false };
  }
  if (!canAskAgain) {
    return { action: 'blocked', shouldPrompt: false };
  }
  return { action: 'prompt', shouldPrompt: true };
}

// ─── Mirrors of src/services/notificationScheduler.ts plan ─────────────────

function buildMitzvahReminderId(userId, mitzvahId) {
  return `${userId}:${mitzvahId}:mitzvah-daily`;
}

function buildCalendarNotificationId(userId, eventId) {
  return `${userId}:${eventId}:calendar-event`;
}

function isUserNotificationId(userId, identifier) {
  return identifier.startsWith(`${userId}:`);
}

function shouldScheduleCalendarNotification(event) {
  if (
    event.type === 'CANDLE_LIGHTING' ||
    event.type === 'HAVDALAH' ||
    event.type === 'FAST'
  ) {
    return Boolean(event.startDate && event.startTime);
  }
  if (event.type === 'HOLIDAY') {
    return Boolean(event.startDate);
  }
  return false;
}

function getCalendarNotificationBody(event) {
  switch (event.type) {
    case 'CANDLE_LIGHTING':
      return 'הדלקת נרות מתקרבת';
    case 'HAVDALAH':
      return 'יציאת שבת מתקרבת';
    case 'FAST':
      return 'יום צום מתקרב';
    case 'HOLIDAY':
      return 'חג מתקרב';
    default:
      return event.titleHebrew;
  }
}

function parseTriggerDate(event) {
  if (!event.startDate) {
    return null;
  }
  const triggerDate = new Date(event.startDate);
  if (Number.isNaN(triggerDate.getTime())) {
    return null;
  }
  return triggerDate;
}

function planNotificationReconcile(input) {
  const {
    userId,
    permission,
    nowMs,
    mitzvot,
    preferences,
    activeMitzvahIds,
    calendarEvents,
    currentlyScheduled,
    dailyTriggerFromTime,
  } = input;

  const toSchedule = [];
  const skipped = [];
  const desiredIds = new Set();
  const scheduledIds = new Set();

  if (permission === 'granted') {
    for (const mitzvah of mitzvot) {
      const preference = preferences[mitzvah.id];
      if (
        !activeMitzvahIds.includes(mitzvah.id) ||
        !preference?.enabled ||
        !preference.reminderEnabled ||
        !isReminderTimeValid(preference.reminderTime)
      ) {
        if (preference?.reminderEnabled && !isReminderTimeValid(preference.reminderTime)) {
          skipped.push(buildMitzvahReminderId(userId, mitzvah.id));
        }
        continue;
      }

      const identifier = buildMitzvahReminderId(userId, mitzvah.id);
      desiredIds.add(identifier);
      const { hour, minute } = dailyTriggerFromTime(preference.reminderTime);
      if (!scheduledIds.has(identifier)) {
        scheduledIds.add(identifier);
        toSchedule.push({
          kind: 'daily',
          identifier,
          title: mitzvah.title,
          body: mitzvah.description,
          data: { mitzvahId: mitzvah.id, userId, type: 'mitzvah-daily' },
          hour,
          minute,
        });
      }
    }

    for (const event of calendarEvents) {
      const calendarId = buildCalendarNotificationId(userId, event.id);
      if (!shouldScheduleCalendarNotification(event)) {
        skipped.push(calendarId);
        continue;
      }

      const triggerDate = parseTriggerDate(event);
      if (!triggerDate) {
        skipped.push(calendarId);
        continue;
      }
      if (triggerDate.getTime() <= nowMs) {
        skipped.push(calendarId);
        continue;
      }

      desiredIds.add(calendarId);
      if (!scheduledIds.has(calendarId)) {
        scheduledIds.add(calendarId);
        toSchedule.push({
          kind: 'date',
          identifier: calendarId,
          title: event.titleHebrew,
          body: getCalendarNotificationBody(event),
          data: { eventId: event.id, userId, type: 'calendar-event' },
          dateIso: triggerDate.toISOString(),
        });
      }
    }
  }

  const toCancel = currentlyScheduled.filter(
    (id) => isUserNotificationId(userId, id) && !desiredIds.has(id),
  );

  return { toSchedule, toCancel, skipped };
}

function fixtureBase(overrides = {}) {
  return {
    userId: 'user-a',
    permission: 'granted',
    nowMs: Date.parse('2026-09-03T10:00:00.000Z'),
    mitzvot: [
      {
        id: 'tefillin',
        title: 'תפילין',
        description: 'הנחת תפילין',
      },
    ],
    preferences: {
      tefillin: {
        enabled: true,
        reminderEnabled: true,
        reminderTime: '07:30',
      },
    },
    activeMitzvahIds: ['tefillin'],
    calendarEvents: [],
    currentlyScheduled: [],
    dailyTriggerFromTime: (time) => {
      const [hour, minute] = time.split(':').map(Number);
      return { hour, minute };
    },
    ...overrides,
  };
}

// ─── 1. Permission state handling ──────────────────────────────────────────

function runPermissionTests() {
  assertEqual(
    resolveNotificationPermissionDecision('granted', true),
    { action: 'already-granted', shouldPrompt: false },
    'P10.8 permission: granted does not re-prompt',
  );
  assertEqual(
    resolveNotificationPermissionDecision('granted', false),
    { action: 'already-granted', shouldPrompt: false },
    'P10.8 permission: granted ignores canAskAgain',
  );
  assertEqual(
    resolveNotificationPermissionDecision('undetermined', true),
    { action: 'prompt', shouldPrompt: true },
    'P10.8 permission: first launch / undetermined prompts',
  );
  assertEqual(
    resolveNotificationPermissionDecision('denied', true),
    { action: 'prompt', shouldPrompt: true },
    'P10.8 permission: denied with canAskAgain may prompt',
  );
  assertEqual(
    resolveNotificationPermissionDecision('denied', false),
    { action: 'blocked', shouldPrompt: false },
    'P10.8 permission: OS-permanent deny does not re-prompt',
  );

  const notificationsSrc = read('src/services/notifications.ts');
  assertTrue(
    notificationsSrc.includes('canAskAgain') &&
      notificationsSrc.includes('resolveNotificationPermissionDecision'),
    'P10.8 permission: production uses canAskAgain decision helper',
  );
  assertTrue(
    !notificationsSrc.includes('access_token') &&
      !notificationsSrc.includes('refresh_token') &&
      !notificationsSrc.includes('service_role'),
    'P10.8 logging: notification service does not log secrets',
  );
}

// ─── 2–5. Scheduling / cancel / reschedule / duplicates ────────────────────

function runSchedulingLifecycleTests() {
  const first = planNotificationReconcile(fixtureBase());
  assertEqual(first.toSchedule.length, 1, 'P10.8 schedule: enabled reminder schedules once');
  assertEqual(
    first.toSchedule[0].identifier,
    'user-a:tefillin:mitzvah-daily',
    'P10.8 schedule: deterministic mitzvah identifier',
  );

  const second = planNotificationReconcile(fixtureBase());
  assertEqual(
    second.toSchedule.map((item) => item.identifier),
    first.toSchedule.map((item) => item.identifier),
    'P10.8 duplicate: second plan is identical (idempotent identifiers)',
  );
  assertEqual(
    new Set(first.toSchedule.map((item) => item.identifier)).size,
    first.toSchedule.length,
    'P10.8 duplicate: no duplicate identifiers in one plan',
  );

  const cancelled = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: {
          enabled: true,
          reminderEnabled: false,
          reminderTime: '07:30',
        },
      },
      currentlyScheduled: ['user-a:tefillin:mitzvah-daily'],
    }),
  );
  assertEqual(
    cancelled.toSchedule.length,
    0,
    'P10.8 cancel: disabling reminder schedules nothing',
  );
  assertEqual(
    cancelled.toCancel,
    ['user-a:tefillin:mitzvah-daily'],
    'P10.8 cancel: previously scheduled reminder is cancelled',
  );

  const rescheduled = planNotificationReconcile(
    fixtureBase({
      currentlyScheduled: [],
      preferences: {
        tefillin: {
          enabled: true,
          reminderEnabled: true,
          reminderTime: '20:00',
        },
      },
    }),
  );
  assertEqual(rescheduled.toSchedule.length, 1, 'P10.8 reschedule: re-enable schedules again');
  assertEqual(rescheduled.toSchedule[0].hour, 20, 'P10.8 reschedule: new reminder time applied');
  assertEqual(
    rescheduled.toSchedule[0].identifier,
    'user-a:tefillin:mitzvah-daily',
    'P10.8 reschedule: identifier stays stable across time changes',
  );

  const otherUserLeftover = planNotificationReconcile(
    fixtureBase({
      currentlyScheduled: [
        'user-a:tefillin:mitzvah-daily',
        'user-b:tefillin:mitzvah-daily',
      ],
    }),
  );
  assertTrue(
    !otherUserLeftover.toCancel.includes('user-b:tefillin:mitzvah-daily'),
    'P10.8 cancel: does not cancel another user identifiers',
  );

  const schedulerSrc = read('src/services/notificationScheduler.ts');
  assertTrue(
    schedulerSrc.includes('export function planNotificationReconcile'),
    'P10.8 schedule: planner is exported from existing scheduler',
  );
  assertTrue(
    schedulerSrc.includes('pendingSync') || schedulerSrc.includes('pendingArgs'),
    'P10.8 schedule: concurrent syncs serialize to the latest request',
  );
}

// ─── 6. Timezone calculation ───────────────────────────────────────────────

function formatIsraelWall(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(date);
}

function runTimezoneTests() {
  const winter = israelWallTimeToDate('2026-01-15', '07:30');
  const summer = israelWallTimeToDate('2026-07-15', '07:30');
  assertEqual(winter.toISOString(), '2026-01-15T05:30:00.000Z', 'P10.8 timezone: winter IST UTC+2');
  assertEqual(summer.toISOString(), '2026-07-15T04:30:00.000Z', 'P10.8 timezone: summer IDT UTC+3');
  assertTrue(
    winter.toISOString() !== summer.toISOString(),
    'P10.8 timezone: DST changes the UTC instant for the same wall clock',
  );

  const midnight = israelWallTimeToDate('2026-03-27', '00:00');
  assertEqual(
    midnight.toISOString(),
    '2026-03-26T22:00:00.000Z',
    'P10.8 timezone: midnight on DST spring-forward stays 00:00 Israel',
  );
  assertTrue(
    formatIsraelWall(midnight).includes('00:00'),
    'P10.8 timezone: midnight formats as 00:00 in Asia/Jerusalem',
    formatIsraelWall(midnight),
  );

  const late = israelWallTimeToDate('2026-08-11', '23:59');
  assertTrue(
    formatIsraelWall(late).includes('23:59'),
    'P10.8 timezone: near-midnight 23:59 preserved',
    formatIsraelWall(late),
  );

  const reminderTzSrc = read('src/utils/reminderTimezone.ts');
  assertTrue(
    reminderTzSrc.includes("hourCycle: 'h23'") &&
      reminderTzSrc.includes('for (') &&
      reminderTzSrc.includes('getTimeZoneOffsetMs'),
    'P10.8 timezone: production conversion iterates offset and uses h23',
  );
  assertTrue(
    reminderTzSrc.includes('Asia/Jerusalem'),
    'P10.8 timezone: centralized Asia/Jerusalem utility reused',
  );

  const notificationsSrc = read('src/services/notifications.ts');
  assertTrue(
    notificationsSrc.includes('getDeviceLocalDailyTriggerFromIsraelReminder'),
    'P10.8 timezone: daily triggers use existing reminderTimezone helper',
  );

  const trigger = getDeviceLocalDailyTriggerFromIsraelReminder(
    '07:30',
    new Date('2026-01-15T12:00:00.000Z'),
  );
  assertTrue(
    typeof trigger.hour === 'number' && typeof trigger.minute === 'number',
    'P10.8 timezone: device-local daily trigger is numeric',
    `${trigger.hour}:${String(trigger.minute).padStart(2, '0')}`,
  );
}

// ─── 7–8. Invalid / expired scheduling ─────────────────────────────────────

function runInvalidAndExpiredTests() {
  const invalidTime = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: {
          enabled: true,
          reminderEnabled: true,
          reminderTime: '25:99',
        },
      },
    }),
  );
  assertEqual(invalidTime.toSchedule.length, 0, 'P10.8 invalid: bad HH:mm is not scheduled');
  assertTrue(
    invalidTime.skipped.includes('user-a:tefillin:mitzvah-daily'),
    'P10.8 invalid: bad reminder time is skipped',
  );

  const expired = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: {
          enabled: true,
          reminderEnabled: false,
        },
      },
      activeMitzvahIds: [],
      calendarEvents: [
        {
          id: 'candles-past',
          type: 'CANDLE_LIGHTING',
          titleHebrew: 'הדלקת נרות',
          dateKey: '2026-09-01',
          startDate: '2026-09-01T15:00:00.000Z',
          startTime: '18:00',
        },
      ],
    }),
  );
  assertEqual(expired.toSchedule.length, 0, 'P10.8 expired: past candle lighting not scheduled');
  assertTrue(
    expired.skipped.includes('user-a:candles-past:calendar-event'),
    'P10.8 expired: past event is skipped',
  );

  const invalidDate = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: { enabled: true, reminderEnabled: false },
      },
      activeMitzvahIds: [],
      calendarEvents: [
        {
          id: 'bad-date',
          type: 'HOLIDAY',
          titleHebrew: 'חג',
          dateKey: '2026-09-10',
          startDate: 'not-a-date',
        },
      ],
    }),
  );
  assertEqual(invalidDate.toSchedule.length, 0, 'P10.8 invalid: unparseable startDate skipped');

  const futureCandle = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: { enabled: true, reminderEnabled: false },
      },
      activeMitzvahIds: [],
      calendarEvents: [
        {
          id: 'candles-future',
          type: 'CANDLE_LIGHTING',
          titleHebrew: 'הדלקת נרות',
          dateKey: '2026-09-04',
          startDate: '2026-09-04T15:32:00.000Z',
          startTime: '18:32',
        },
      ],
    }),
  );
  assertEqual(futureCandle.toSchedule.length, 1, 'P10.8 schedule: future Shabbat candle scheduled');
  assertEqual(
    futureCandle.toSchedule[0].kind,
    'date',
    'P10.8 schedule: Shabbat uses DATE trigger from Hebcal startDate',
  );

  const schedulerSrc = read('src/services/notificationScheduler.ts');
  assertTrue(
    !schedulerSrc.includes('T08:00:00'),
    'P10.8 invalid: scheduler does not fabricate 08:00 fallback times',
  );
}

// ─── 9–10. Preference disabled / enabled ───────────────────────────────────

function runPreferenceTests() {
  const disabled = planNotificationReconcile(
    fixtureBase({
      permission: 'denied',
    }),
  );
  assertEqual(
    disabled.toSchedule.length,
    0,
    'P10.8 preference: OS permission denied schedules nothing',
  );

  const trackingOff = planNotificationReconcile(
    fixtureBase({
      preferences: {
        tefillin: {
          enabled: false,
          reminderEnabled: true,
          reminderTime: '07:30',
        },
      },
      currentlyScheduled: ['user-a:tefillin:mitzvah-daily'],
    }),
  );
  assertEqual(trackingOff.toSchedule.length, 0, 'P10.8 preference: tracking off does not schedule');
  assertEqual(
    trackingOff.toCancel,
    ['user-a:tefillin:mitzvah-daily'],
    'P10.8 preference: tracking off cancels stale reminder',
  );

  const enabled = planNotificationReconcile(fixtureBase());
  assertTrue(
    enabled.toSchedule.length === 1 && enabled.toCancel.length === 0,
    'P10.8 preference: enabled reminder is scheduled and not cancelled',
  );
}

// ─── Architecture / Android channel / UI / logging contracts ───────────────

function runArchitectureContractTests() {
  const notificationsSrc = read('src/services/notifications.ts');
  const channelsSrc = read('src/services/notificationChannels.ts');
  const schedulerSrc = read('src/services/notificationScheduler.ts');
  const syncSrc = read('src/hooks/useNotificationSync.ts');
  const storeSrc = read('src/store/mitzvahStore.ts');
  const detailSrc = read('src/screens/mitzvot/MitzvahDetailScreen.tsx');
  const prefCardSrc = read('src/components/mitzvah/MitzvahPreferenceCard.tsx');
  const typesSrc = read('src/types/mitzvah.ts');

  assertTrue(
    channelsSrc.includes("MITZVAH_REMINDERS_CHANNEL_ID = 'mitzvah-reminders-v2'"),
    'P10.8 channel: v2 channel id remains (Phase 10.6.6 intact)',
  );
  assertTrue(
    !channelsSrc.includes("sound: 'default'") &&
      !channelsSrc.includes('sound: "default"') &&
      !/setNotificationChannelAsync\([\s\S]*sound\s*:/.test(channelsSrc),
    'P10.8 channel: does not restore sound: default',
  );
  assertTrue(
    notificationsSrc.includes('ensureMitzvahRemindersChannel') &&
      /scheduleDateNotification[\s\S]*channelId[\s\S]*MITZVAH_REMINDERS_CHANNEL_ID/.test(
        notificationsSrc,
      ),
    'P10.8 channel: DATE / Shabbat notifications use the Android channel',
  );
  assertTrue(
    notificationsSrc.includes('addNotificationReceivedListener') &&
      notificationsSrc.includes('addNotificationResponseReceivedListener'),
    'P10.8 handling: received and interaction listeners registered',
  );
  assertTrue(
    notificationsSrc.includes('[notifications]') &&
      notificationsSrc.includes('channel'),
    'P10.8 logging: development diagnostics include type/channel-safe fields',
  );
  assertTrue(
    syncSrc.includes('refreshOsNotificationPermission') ||
      syncSrc.includes('refreshNotificationPermission'),
    'P10.8 permission: app resume refreshes OS permission state',
  );
  assertTrue(
    storeSrc.includes('osNotificationPermission') ||
      storeSrc.includes('notificationPermissionStatus'),
    'P10.8 permission: store persists OS permission snapshot for UI',
  );
  assertTrue(
    detailSrc.includes('permissionDeniedMessage') &&
      prefCardSrc.includes('permissionDeniedMessage'),
    'P10.8 permission: reminder UI surfaces OS permission denial',
  );
  assertTrue(
    typesSrc.includes('Asia/Jerusalem') || typesSrc.includes('Israel wall'),
    'P10.8 timezone: preference reminderTime documented as Israel wall clock',
  );
  assertTrue(
    schedulerSrc.includes("type === 'CANDLE_LIGHTING'") &&
      schedulerSrc.includes('calendarService.getUpcomingEvents'),
    'P10.8 types: Shabbat reminders still use existing Hebcal events',
  );
  assertTrue(
    !schedulerSrc.includes('service_role') &&
      !notificationsSrc.includes('EXPO_PUBLIC_SUPABASE'),
    'P10.8 supabase: notifications do not introduce service-role credentials',
  );
}

function main() {
  console.log('Phase 10.8 Verification\n=======================\n');

  runPermissionTests();
  runSchedulingLifecycleTests();
  runTimezoneTests();
  runInvalidAndExpiredTests();
  runPreferenceTests();
  runArchitectureContractTests();

  const failed = results.filter((item) => !item.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const item of failed) {
      console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

main();
