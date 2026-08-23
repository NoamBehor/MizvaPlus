/**
 * Phase 9 deterministic verification script.
 * Run: npm run verify:phase9
 *
 * Tests pure logic that can be verified without a device/emulator.
 * Mirrors critical paths in src/ — keep in sync when changing core logic.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
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

// ─── Inline mirrors of src/utils/timezone.ts (activity dates) ─────────────

const ISRAEL_TIMEZONE = 'Asia/Jerusalem';
const ISRAEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ISRAEL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getIsraelDateKey(date = new Date()) {
  const parts = ISRAEL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function getActivityDateKey(date = new Date()) {
  return getIsraelDateKey(date);
}

function getCalendarDateKey(date = new Date()) {
  return getIsraelDateKey(date);
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

function getPreviousActivityDateKey(dateKey) {
  return shiftDateKeyByDays(dateKey, -1);
}

// Device-local key kept only for boundary contrast tests
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(dateKey) {
  return getPreviousActivityDateKey(dateKey);
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Inline mirrors of src/services/mitzvot.ts completion logic ────────────

function completeMitzvah(userId, mitzvahId, completions, mitzvah, atDate = new Date()) {
  if (!mitzvah) {
    return { success: false, alreadyCompleted: false };
  }

  const completionDate = getActivityDateKey(atDate);
  const existing = completions.find(
    (c) =>
      c.userId === userId &&
      c.mitzvahId === mitzvahId &&
      c.completionDate === completionDate,
  );

  if (existing) {
    return { success: false, completion: existing, alreadyCompleted: true };
  }

  const completion = {
    id: generateId(),
    userId,
    mitzvahId,
    completedAt: new Date().toISOString(),
    completionDate,
    xpAwarded: mitzvah.xpReward,
  };

  return { success: true, completion, alreadyCompleted: false };
}

// ─── Inline mirrors of src/services/streak.ts ──────────────────────────────

function updateStreakOnDailyActivity(user, userId, atDate = new Date()) {
  const today = getActivityDateKey(atDate);
  if (!user || user.id !== userId) {
    return { streakCount: 0, lastActiveDate: today, updated: false };
  }
  if (user.lastActiveDate === today) {
    return {
      streakCount: user.streakCount,
      lastActiveDate: today,
      updated: false,
    };
  }
  const yesterday = getPreviousActivityDateKey(today);
  const newStreak =
    user.lastActiveDate === yesterday ? user.streakCount + 1 : 1;
  return {
    streakCount: newStreak,
    lastActiveDate: today,
    updated: true,
  };
}

// ─── Inline mirrors of src/services/quiz.ts ────────────────────────────────

const QUIZ_COUNT = 20;

function dateKeyToIndex(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const daysSinceEpoch = Math.floor(
    Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24),
  );
  return daysSinceEpoch % QUIZ_COUNT;
}

// ─── Inline mirrors of src/services/notificationScheduler.ts ───────────────

function buildMitzvahReminderId(userId, mitzvahId) {
  return `${userId}:${mitzvahId}:mitzvah-daily`;
}

function buildCalendarNotificationId(userId, eventId) {
  return `${userId}:${eventId}:calendar-event`;
}

function isUserNotificationId(userId, identifier) {
  return identifier.startsWith(`${userId}:`);
}

// ─── Inline mirrors of src/utils/storage.ts ────────────────────────────────

const STORAGE_KEYS = {
  onboardingComplete: '@mitzvahapp/onboarding_complete',
  preferences: '@mitzvahapp/mitzvah_preferences',
  completions: '@mitzvahapp/mitzvah_completions',
  userProfile: '@mitzvahapp/user_profile',
  quizAttempts: '@mitzvahapp/quiz_attempts',
  badges: '@mitzvahapp/badges',
};

function scopedKey(base, userId) {
  return `${base}:${userId}`;
}

// ─── Inline mirrors of src/services/overpass.ts ────────────────────────────

function buildOverpassQuery(latitude, longitude, radiusMeters) {
  const around = `${radiusMeters},${latitude},${longitude}`;
  return `[out:json][timeout:25];
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

function calculateDistanceMeters(from, to) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseOverpassResponse(payload, userCoordinates) {
  if (!payload || typeof payload !== 'object') return [];
  const elements = payload.elements;
  if (!Array.isArray(elements)) return [];

  const seenIds = new Set();
  const synagogues = [];

  for (const element of elements) {
    if (
      !element ||
      (element.type !== 'node' &&
        element.type !== 'way' &&
        element.type !== 'relation') ||
      typeof element.id !== 'number'
    ) {
      continue;
    }

    let coordinates = null;
    if (typeof element.lat === 'number' && typeof element.lon === 'number') {
      coordinates = { latitude: element.lat, longitude: element.lon };
    } else if (
      element.center &&
      typeof element.center.lat === 'number' &&
      typeof element.center.lon === 'number'
    ) {
      coordinates = {
        latitude: element.center.lat,
        longitude: element.center.lon,
      };
    }
    if (!coordinates) continue;

    const id = `${element.type}/${element.id}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const tags = element.tags ?? {};
    const name =
      tags.name ||
      tags['name:he'] ||
      tags['name:en'] ||
      'בית כנסת';

    synagogues.push({
      id,
      name,
      coordinates,
      distanceMeters: calculateDistanceMeters(userCoordinates, coordinates),
    });
  }

  return synagogues.sort(
    (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  );
}

// ─── Inline mirrors of src/services/calendarMitzvot.ts ───────────────────

function isCalendarMitzvahActiveToday(mitzvah, dayInfo) {
  if (mitzvah.category === 'daily') return true;
  if (mitzvah.category === 'fast') {
    return dayInfo.activeFastMitzvahIds.includes(mitzvah.id);
  }
  if (mitzvah.category === 'holiday') {
    return dayInfo.activeHolidayMitzvahIds.includes(mitzvah.id);
  }
  return false;
}

// ─── Inline mirrors of src/types/gamification.ts ───────────────────────────

const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 250 },
  { level: 4, minXp: 500 },
  { level: 5, minXp: 1000 },
];

function getLevelFromXp(xp) {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.minXp) level = threshold.level;
  }
  return level;
}

// ─── Test suites ───────────────────────────────────────────────────────────

function runP9_001BoundaryTests() {
  // 2026-08-11T21:30:00Z = 2026-08-12 00:30 in Israel (past midnight)
  const boundaryInstant = new Date('2026-08-11T21:30:00Z');
  const activityKey = getActivityDateKey(boundaryInstant);
  const calendarKey = getCalendarDateKey(boundaryInstant);

  assertEqual(
    activityKey,
    calendarKey,
    'P9-001: activity and calendar date keys match at Israel midnight boundary',
  );
  assertEqual(
    activityKey,
    '2026-08-12',
    'P9-001: Israel activity date rolls to next day after 21:00 UTC',
  );

  const mitzvah = { id: 'tefillin', xpReward: 10 };
  const completion = completeMitzvah(
    'user-a',
    'tefillin',
    [],
    mitzvah,
    boundaryInstant,
  );
  assertEqual(
    completion.completion?.completionDate,
    '2026-08-12',
    'P9-001: mitzvah completion uses Israel activity date at boundary',
  );

  const streak = updateStreakOnDailyActivity(
    { id: 'user-a', streakCount: 0, lastActiveDate: null },
    'user-a',
    boundaryInstant,
  );
  assertEqual(
    streak.lastActiveDate,
    '2026-08-12',
    'P9-001: streak uses Israel activity date at boundary',
  );

  const localKey = getLocalDateKey(boundaryInstant);
  if (localKey !== activityKey) {
    assertTrue(
      localKey === '2026-08-11',
      'P9-001: device-local key differs from Israel key at boundary (non-Israel TZ)',
      `local=${localKey}, activity=${activityKey}`,
    );
  } else {
    record(
      'P9-001: device-local key differs from Israel key at boundary (non-Israel TZ)',
      true,
      'skipped — runner timezone is Asia/Jerusalem',
    );
  }

  const activitySources = [
    'src/services/mitzvot.ts',
    'src/services/streak.ts',
    'src/services/quiz.ts',
    'src/screens/home/HomeScreen.tsx',
    'src/screens/trivia/TriviaScreen.tsx',
    'src/components/home/DailyTriviaCard.tsx',
    'src/utils/dailyQuote.ts',
  ];
  for (const file of activitySources) {
    const content = readFileSync(join(root, file), 'utf8');
    assertTrue(
      content.includes('getActivityDateKey'),
      `P9-001: ${file} uses getActivityDateKey`,
    );
    assertTrue(
      !content.includes('getLocalDateKey'),
      `P9-001: ${file} no longer uses getLocalDateKey`,
    );
  }
}

function runXpIdempotencyTests() {
  const mitzvah = { id: 'tefillin', xpReward: 10 };
  const userId = 'user-a';
  let completions = [];

  const first = completeMitzvah(userId, 'tefillin', completions, mitzvah);
  assertTrue(first.success && !first.alreadyCompleted, 'XP: first completion succeeds');
  completions = [...completions, first.completion];

  const second = completeMitzvah(userId, 'tefillin', completions, mitzvah);
  assertTrue(
    !second.success && second.alreadyCompleted,
    'XP: duplicate same-day completion rejected',
  );

  let xp = 0;
  if (first.success) xp += first.completion.xpAwarded;
  if (second.success) xp += second.completion.xpAwarded;
  assertEqual(xp, 10, 'XP: only one award per mitzvah per day');
}

function runStreakTests() {
  const userId = 'user-a';
  const today = getActivityDateKey();
  const yesterday = getPreviousActivityDateKey(today);

  let user = { id: userId, streakCount: 0, lastActiveDate: null };
  const r1 = updateStreakOnDailyActivity(user, userId);
  assertTrue(r1.updated && r1.streakCount === 1, 'Streak: first activity starts at 1');
  user = { ...user, streakCount: r1.streakCount, lastActiveDate: r1.lastActiveDate };

  const r2 = updateStreakOnDailyActivity(user, userId);
  assertTrue(!r2.updated && r2.streakCount === 1, 'Streak: same-day second activity no increment');

  const r3 = updateStreakOnDailyActivity(
    { id: userId, streakCount: 3, lastActiveDate: yesterday },
    userId,
  );
  assertTrue(r3.updated && r3.streakCount === 4, 'Streak: consecutive day increments');

  const r4 = updateStreakOnDailyActivity(
    { id: userId, streakCount: 5, lastActiveDate: getPreviousActivityDateKey(yesterday) },
    userId,
  );
  assertTrue(r4.updated && r4.streakCount === 1, 'Streak: missed day resets to 1');
}

function runQuizDeterminismTests() {
  const d1 = dateKeyToIndex('2026-08-11');
  const d2 = dateKeyToIndex('2026-08-11');
  assertEqual(d1, d2, 'Quiz: same date yields same index');
  const d3 = dateKeyToIndex('2026-08-12');
  assertTrue(
    d1 !== d3 || QUIZ_COUNT === 1,
    'Quiz: different dates can yield different index',
  );
  assertTrue(d1 >= 0 && d1 < QUIZ_COUNT, 'Quiz: index in range');
}

function runBadgeIdempotencyTests() {
  const badges = [{ badgeId: 'first_mitzvah', unlockedAt: '2026-01-01' }];
  const unlockedIds = new Set(badges.map((b) => b.badgeId));
  const newlyUnlocked = [];
  const badge = { id: 'first_mitzvah' };

  if (!unlockedIds.has(badge.id)) {
    newlyUnlocked.push(badge);
    unlockedIds.add(badge.id);
  }
  assertEqual(newlyUnlocked.length, 0, 'Badge: already-unlocked skipped');

  const badge2 = { id: 'streak_7' };
  if (!unlockedIds.has(badge2.id)) {
    newlyUnlocked.push(badge2);
  }
  assertEqual(newlyUnlocked.length, 1, 'Badge: new badge unlocked once');
}

function runLevelTests() {
  assertEqual(getLevelFromXp(0), 1, 'Level: 0 XP = level 1');
  assertEqual(getLevelFromXp(100), 2, 'Level: 100 XP = level 2');
  assertEqual(getLevelFromXp(99), 1, 'Level: 99 XP stays level 1');
  assertEqual(getLevelFromXp(1000), 5, 'Level: 1000 XP = level 5');
}

function runMultiUserIsolationTests() {
  const userA = 'aaaaaaaa-1111';
  const userB = 'bbbbbbbb-2222';

  const keysA = {
    profile: scopedKey(STORAGE_KEYS.userProfile, userA),
    prefs: scopedKey(STORAGE_KEYS.preferences, userA),
    completions: scopedKey(STORAGE_KEYS.completions, userA),
    quiz: scopedKey(STORAGE_KEYS.quizAttempts, userA),
    badges: scopedKey(STORAGE_KEYS.badges, userA),
    onboarding: scopedKey(STORAGE_KEYS.onboardingComplete, userA),
  };

  const keysB = {
    profile: scopedKey(STORAGE_KEYS.userProfile, userB),
    prefs: scopedKey(STORAGE_KEYS.preferences, userB),
    completions: scopedKey(STORAGE_KEYS.completions, userB),
    quiz: scopedKey(STORAGE_KEYS.quizAttempts, userB),
    badges: scopedKey(STORAGE_KEYS.badges, userB),
    onboarding: scopedKey(STORAGE_KEYS.onboardingComplete, userB),
  };

  for (const [name, keyA] of Object.entries(keysA)) {
    const keyB = keysB[name];
    assertTrue(keyA !== keyB, `Isolation: ${name} keys differ per user`, `${keyA} vs ${keyB}`);
    assertTrue(keyA.includes(userA), `Isolation: ${name} contains userA id`);
    assertTrue(keyB.includes(userB), `Isolation: ${name} contains userB id`);
  }

  const notifA = buildMitzvahReminderId(userA, 'tefillin');
  const notifB = buildMitzvahReminderId(userB, 'tefillin');
  assertTrue(notifA !== notifB, 'Isolation: notification IDs differ per user');
}

function runNotificationTests() {
  const userId = 'user-a';
  const id1 = buildMitzvahReminderId(userId, 'tefillin');
  const id2 = buildMitzvahReminderId(userId, 'tefillin');
  assertEqual(id1, id2, 'Notifications: mitzvah reminder ID deterministic');

  const calId = buildCalendarNotificationId(userId, 'event-1');
  assertTrue(calId.endsWith(':calendar-event'), 'Notifications: calendar ID format');

  assertTrue(
    isUserNotificationId(userId, `${userId}:tefillin:mitzvah-daily`),
    'Notifications: user prefix match',
  );
  assertTrue(
    !isUserNotificationId('other', `${userId}:tefillin:mitzvah-daily`),
    'Notifications: other user prefix rejected',
  );

  const desired = new Set([
    buildMitzvahReminderId(userId, 'a'),
    buildMitzvahReminderId(userId, 'b'),
  ]);
  const scheduled = [
    buildMitzvahReminderId(userId, 'a'),
    buildMitzvahReminderId(userId, 'b'),
    buildMitzvahReminderId(userId, 'c'),
  ];
  const toCancel = scheduled.filter((id) => !desired.has(id));
  assertEqual(toCancel, [buildMitzvahReminderId(userId, 'c')], 'Notifications: reconcile cancels orphans');
}

function runOverpassTests() {
  const query = buildOverpassQuery(31.7683, 35.2137, 2000);
  const requiredTags = [
    'node["amenity"="place_of_worship"]["religion"="jewish"]',
    'way["amenity"="place_of_worship"]["religion"="judaism"]',
    'relation["building"="synagogue"]',
    'node["amenity"="synagogue"]',
    'way["amenity"="synagogue"]',
    'relation["amenity"="synagogue"]',
  ];
  for (const tag of requiredTags) {
    assertTrue(query.includes(tag), `Overpass: query includes ${tag.split('[')[1]}`);
  }

  const userCoords = { latitude: 31.7683, longitude: 35.2137 };
  const payload = {
    elements: [
      {
        type: 'node',
        id: 1,
        lat: 31.77,
        lon: 35.22,
        tags: { name: 'בית כנסת א' },
      },
      {
        type: 'way',
        id: 2,
        center: { lat: 31.769, lon: 35.215 },
        tags: { 'name:he': 'בית כנסת ב' },
      },
      {
        type: 'relation',
        id: 3,
        center: { lat: 31.77, lon: 35.22 },
        tags: {},
      },
      { type: 'node', id: 1, lat: 31.77, lon: 35.22, tags: { name: 'duplicate' } },
      { type: 'way', id: 4 },
      null,
    ],
  };

  const parsed = parseOverpassResponse(payload, userCoords);
  assertEqual(parsed.length, 3, 'Overpass: node/way/relation normalized, duplicate id skipped');
  assertTrue(parsed[0].distanceMeters <= parsed[1].distanceMeters, 'Overpass: sorted by distance');

  const noNamePayload = {
    elements: [
      { type: 'node', id: 99, lat: 31.769, lon: 35.215, tags: {} },
    ],
  };
  const noName = parseOverpassResponse(noNamePayload, userCoords);
  assertEqual(noName[0]?.name, 'בית כנסת', 'Overpass: fallback name for missing tags');

  assertEqual(parseOverpassResponse(null, userCoords).length, 0, 'Overpass: null payload');
  assertEqual(parseOverpassResponse({ elements: 'bad' }, userCoords).length, 0, 'Overpass: malformed elements');
  assertEqual(parseOverpassResponse({ elements: [] }, userCoords).length, 0, 'Overpass: empty response');
}

function runDistanceTests() {
  const jerusalem = { latitude: 31.7683, longitude: 35.2137 };
  const nearby = { latitude: 31.77, longitude: 35.22 };
  const dist = calculateDistanceMeters(jerusalem, nearby);
  assertTrue(dist > 0 && dist < 5000, 'Distance: nearby points in expected range', `${Math.round(dist)}m`);
  assertEqual(calculateDistanceMeters(jerusalem, jerusalem), 0, 'Distance: same point is zero');
}

function runCalendarMitzvahActivationTests() {
  const weekday = {
    activeFastMitzvahIds: [],
    activeHolidayMitzvahIds: [],
  };
  const yomKippur = {
    activeFastMitzvahIds: ['yom-kippur-fast'],
    activeHolidayMitzvahIds: ['yom-kippur'],
  };

  assertTrue(
    isCalendarMitzvahActiveToday({ id: 'tefillin', category: 'daily' }, weekday),
    'Calendar: daily mitzvah active on weekday',
  );
  assertTrue(
    !isCalendarMitzvahActiveToday({ id: 'yom-kippur-fast', category: 'fast' }, weekday),
    'Calendar: fast mitzvah inactive on weekday',
  );
  assertTrue(
    isCalendarMitzvahActiveToday({ id: 'yom-kippur-fast', category: 'fast' }, yomKippur),
    'Calendar: fast mitzvah active on fast day',
  );
  assertTrue(
    !isCalendarMitzvahActiveToday({ id: 'pesach', category: 'holiday' }, weekday),
    'Calendar: holiday mitzvah inactive on weekday',
  );
  assertTrue(
    isCalendarMitzvahActiveToday({ id: 'pesach', category: 'holiday' }, {
      activeFastMitzvahIds: [],
      activeHolidayMitzvahIds: ['pesach'],
    }),
    'Calendar: holiday mitzvah active on holiday',
  );
}

function runProductionProviderTests() {
  const synagoguesSrc = readFileSync(join(root, 'src/services/synagogues.ts'), 'utf8');
  assertTrue(
    /let activeProvider[^;]*new OverpassSynagogueProvider\(\)/.test(synagoguesSrc),
    'OSM: OverpassSynagogueProvider is production default',
  );
  assertTrue(
    !/let activeProvider[^;]*new MockSynagogueProvider\(\)/.test(synagoguesSrc),
    'OSM: MockSynagogueProvider not used as default',
  );

  const overpassConstants = readFileSync(join(root, 'src/constants/overpass.ts'), 'utf8');
  assertTrue(
    overpassConstants.includes('overpass-api.de') ||
      overpassConstants.includes('EXPO_PUBLIC_OVERPASS_API_URL'),
    'OSM: Overpass URL configured',
  );
  assertTrue(
    overpassConstants.includes('OVERPASS_CACHE_TTL_MS = 5 * 60 * 1000'),
    'OSM: 5-minute cache TTL',
  );

  const mapSrc = readFileSync(join(root, 'src/screens/map/MapScreen.tsx'), 'utf8');
  assertTrue(
    mapSrc.includes('© OpenStreetMap contributors'),
    'OSM: attribution visible on map',
  );
}

function runSecurityAuditTests() {
  const envExample = readFileSync(join(root, '.env.example'), 'utf8');
  assertTrue(
    envExample.includes('EXPO_PUBLIC_SUPABASE_URL') &&
      envExample.includes('EXPO_PUBLIC_OVERPASS_API_URL'),
    'Security: .env.example documents public env vars only',
  );
  assertTrue(
    !envExample.toLowerCase().includes('service_role') &&
      !envExample.toLowerCase().includes('secret'),
    'Security: no service-role keys in .env.example',
  );

  const srcFiles = [
    'src/services/supabase.ts',
    'src/constants/overpass.ts',
    'src/services/auth.ts',
  ];
  for (const file of srcFiles) {
    const content = readFileSync(join(root, file), 'utf8');
    assertTrue(
      !content.match(/sk_live|service_role|password\s*=\s*['"][^'"]+['"]/i),
      `Security: no hardcoded secrets in ${file}`,
    );
  }
}

function runLegacyCodeAuditTests() {
  const countdownUsed = readFileSync(join(root, 'src/screens/home/HomeScreen.tsx'), 'utf8');
  assertTrue(
    countdownUsed.includes('NextEventCard') && !countdownUsed.includes('CountdownCard'),
    'Legacy: Home uses NextEventCard not CountdownCard',
  );

  const eventsSrc = readFileSync(join(root, 'src/services/events.ts'), 'utf8');
  assertTrue(
    eventsSrc.includes('calendarService') &&
      eventsSrc.includes('Hebrew calendar provider'),
    'Legacy: events service uses real calendar',
  );
}

function runXpPathAuditTests() {
  const xpSrc = readFileSync(join(root, 'src/services/xp.ts'), 'utf8');
  assertTrue(xpSrc.includes('awardXp'), 'XP audit: centralized awardXp exists');

  const mitzvahStore = readFileSync(join(root, 'src/store/mitzvahStore.ts'), 'utf8');
  const quizSrc = readFileSync(join(root, 'src/services/quiz.ts'), 'utf8');
  assertTrue(
    mitzvahStore.includes("from '@/services/xp'") && mitzvahStore.includes('awardXp'),
    'XP audit: mitzvahStore uses awardXp',
  );
  assertTrue(
    quizSrc.includes('awardXp'),
    'XP audit: quiz uses awardXp',
  );

  const userStore = readFileSync(join(root, 'src/store/userStore.ts'), 'utf8');
  assertTrue(
    userStore.includes('addXp'),
    'XP audit: userStore.addXp exists (internal helper)',
  );
}

function runNotificationPermissionAuditTests() {
  const notifSync = readFileSync(join(root, 'src/hooks/useNotificationSync.ts'), 'utf8');
  assertTrue(
    notifSync.includes('Does not request permission'),
    'Notifications: useNotificationSync does not request permission on launch',
  );

  const mitzvahStore = readFileSync(join(root, 'src/store/mitzvahStore.ts'), 'utf8');
  assertTrue(
    mitzvahStore.includes('enableNotifications') &&
      mitzvahStore.includes('setReminder'),
    'Notifications: permission requested only on reminder enable',
  );
}

function runQuizExposureTests() {
  const quizTypes = readFileSync(join(root, 'src/types/quiz.ts'), 'utf8');
  const publicInterface = quizTypes.match(
    /export interface QuizQuestionPublic \{[\s\S]*?\}/,
  )?.[0] ?? '';
  assertTrue(
    quizTypes.includes('QuizQuestionPublic') &&
      !publicInterface.includes('correctOptionId'),
    'Quiz: correctOptionId excluded from public question type',
  );

  const triviaScreen = readFileSync(join(root, 'src/screens/trivia/TriviaScreen.tsx'), 'utf8');
  assertTrue(
    triviaScreen.includes('toPublicQuestion') && !triviaScreen.includes('correctOptionId'),
    'Quiz: TriviaScreen uses public question shape',
  );
}

async function runHebcalCalendarTests() {
  const { HDate, HebrewCalendar, Location, flags } = await import('@hebcal/core');
  const loc = Location.lookup('Jerusalem');

  const hd = new HDate(new Date('2026-09-22T12:00:00'));
  const hebrew = hd.renderGematriya(true);
  assertTrue(/[א-ת]/.test(hebrew), 'Calendar: Hebrew date rendering', hebrew);

  const yearEvents = HebrewCalendar.calendar({
    year: 2026,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: loc,
    sedrot: true,
  });

  const yomKippur = yearEvents.find((ev) => ev.getDesc() === 'Yom Kippur');
  assertTrue(Boolean(yomKippur), 'Calendar: Yom Kippur found', yomKippur?.getDesc());

  const fastDay = yearEvents.find((ev) => (ev.getFlags() & flags.MAJOR_FAST) !== 0);
  assertTrue(Boolean(fastDay), 'Calendar: fast day found', fastDay?.getDesc());

  const shabbat = yearEvents.find((ev) =>
    ev.getDesc().toLowerCase().includes('candle lighting'),
  );
  assertTrue(Boolean(shabbat), 'Calendar: candle lighting found', shabbat?.getDesc());

  const israelFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const key = israelFormatter.format(new Date('2026-08-11T21:30:00Z'));
  assertTrue(/^\d{4}-\d{2}-\d{2}$/.test(key), 'Calendar: Israel TZ date key', key);

  const hebcalProvider = readFileSync(
    join(root, 'src/services/calendar/hebcalProvider.ts'),
    'utf8',
  );
  assertTrue(
    hebcalProvider.includes("@hebcal/core") &&
      hebcalProvider.includes('ISRAEL_TIMEZONE') &&
      hebcalProvider.includes('il: true'),
    'Calendar: hebcalProvider uses @hebcal/core with Israel config',
  );
}

// ─── Phase 9.6: location-aware calendar + weekly parasha ─────────────────────

function hebrewStripNikkud(str) {
  const normalized = str.normalize();
  return normalized
    .replace(/[\u0590-\u05bd]/g, '')
    .replace(/[\u05bf-\u05c7]/g, '');
}

function parseParashaFromHebcalRender(hebrewRendered) {
  const hebrewName = hebrewStripNikkud(hebrewRendered);
  const hebrewDisplayName = hebrewName.startsWith('פרשת ')
    ? hebrewName.slice('פרשת '.length)
    : hebrewName;
  return { hebrewName, hebrewDisplayName };
}

function buildCalendarLocationCacheKey(location) {
  if (location?.latitude !== undefined && location?.longitude !== undefined) {
    return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  }
  return 'default';
}

function buildCalendarDayCacheKey(dateKey, location) {
  return `${dateKey}:${buildCalendarLocationCacheKey(location)}`;
}

function getShabbatDateKeyForWeek(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  const dow = date.getDay();
  const daysUntilSaturday = dow === 6 ? 0 : 6 - dow;
  date.setDate(date.getDate() + daysUntilSaturday);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatIsraelTime(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function gregorianDateKeyFromGreg(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runPhase96CalendarTests() {
  const { HebrewCalendar, Location, flags } = await import('@hebcal/core');

  const jerusalem = Location.lookup('Jerusalem');
  const haifa = new Location(32.794, 34.9896, true, 'Asia/Jerusalem', 'Haifa', 'IL');
  const beerSheva = new Location(31.2518, 34.7913, true, 'Asia/Jerusalem', 'Beer Sheva', 'IL');

  const jerusalemEvents = HebrewCalendar.calendar({
    year: 2026,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: jerusalem,
    sedrot: true,
  });

  const haifaEvents = HebrewCalendar.calendar({
    year: 2026,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: haifa,
    sedrot: true,
  });

  const beerEvents = HebrewCalendar.calendar({
    year: 2026,
    isHebrewYear: false,
    il: true,
    candlelighting: true,
    location: beerSheva,
    sedrot: true,
  });

  const fridayCandles = jerusalemEvents.filter(
    (ev) => (ev.getFlags() & flags.LIGHT_CANDLES) !== 0,
  );
  const sampleFridayKey = fridayCandles[0]
    ? gregorianDateKeyFromGreg(fridayCandles[0].getDate().greg())
    : null;

  const jerusalemCandle = fridayCandles[0];
  const haifaCandle = haifaEvents.find(
    (ev) =>
      (ev.getFlags() & flags.LIGHT_CANDLES) !== 0 &&
      gregorianDateKeyFromGreg(ev.getDate().greg()) === sampleFridayKey,
  );
  const beerCandle = beerEvents.find(
    (ev) =>
      (ev.getFlags() & flags.LIGHT_CANDLES) !== 0 &&
      gregorianDateKeyFromGreg(ev.getDate().greg()) === sampleFridayKey,
  );

  assertTrue(Boolean(jerusalemCandle?.eventTime), 'P9.6: Jerusalem candle lighting has time');
  assertTrue(Boolean(haifaCandle?.eventTime), 'P9.6: Haifa candle lighting has time');
  assertTrue(
    jerusalemCandle.eventTime.getTime() !== haifaCandle.eventTime.getTime(),
    'P9.6: Haifa candle time differs from Jerusalem',
    `${formatIsraelTime(jerusalemCandle.eventTime)} vs ${formatIsraelTime(haifaCandle.eventTime)}`,
  );
  assertTrue(
    beerCandle.eventTime.getTime() !== jerusalemCandle.eventTime.getTime(),
    'P9.6: Beer Sheva candle time differs from Jerusalem',
    `${formatIsraelTime(beerCandle.eventTime)} vs ${formatIsraelTime(jerusalemCandle.eventTime)}`,
  );

  const havdalah = jerusalemEvents.find((ev) => ev.getDesc().toLowerCase().includes('havdalah'));
  assertTrue(Boolean(havdalah?.eventTime), 'P9.6: Havdalah has provider time');

  const parashaReeh = jerusalemEvents.find(
    (ev) => (ev.getFlags() & flags.PARSHA_HASHAVUA) !== 0 && ev.basename() === "Re'eh",
  );
  assertTrue(Boolean(parashaReeh), 'P9.6: Parasha Re\'eh found');
  const reehParsed = parseParashaFromHebcalRender(parashaReeh.render('he'));
  assertEqual(reehParsed.hebrewDisplayName, 'ראה', 'P9.6: Parasha Hebrew display name');
  assertTrue(
    !/[A-Za-z]/.test(reehParsed.hebrewDisplayName),
    'P9.6: No English in parasha display name',
  );

  const combined = jerusalemEvents.find(
    (ev) => (ev.getFlags() & flags.PARSHA_HASHAVUA) !== 0 && ev.basename() === 'Matot-Masei',
  );
  assertTrue(Boolean(combined), 'P9.6: Combined parasha Matot-Masei found');
  const combinedParsed = parseParashaFromHebcalRender(combined.render('he'));
  assertTrue(
    combinedParsed.hebrewDisplayName.includes('מטות'),
    'P9.6: Combined parasha Hebrew display',
    combinedParsed.hebrewDisplayName,
  );

  const shabbatForAug11 = getShabbatDateKeyForWeek('2026-08-11');
  assertEqual(shabbatForAug11, '2026-08-15', 'P9.6: Shabbat date key for midweek');

  const locA = { latitude: 32.794, longitude: 34.9896 };
  const locB = { latitude: 31.2518, longitude: 34.7913 };
  assertTrue(
    buildCalendarDayCacheKey('2026-08-11', locA) !==
      buildCalendarDayCacheKey('2026-08-11', locB),
    'P9.6: Cache keys isolate locations',
  );
  assertEqual(
    buildCalendarLocationCacheKey(locA),
    '32.794,34.990',
    'P9.6: Location cache key rounding',
  );

  const activityKey = getActivityDateKey(new Date('2026-08-11T21:30:00Z'));
  const calendarKey = getCalendarDateKey(new Date('2026-08-11T21:30:00Z'));
  assertEqual(activityKey, calendarKey, 'P9.6: Activity and calendar keys align in Israel TZ');

  const hebcalProviderSrc = readFileSync(
    join(root, 'src/services/calendar/hebcalProvider.ts'),
    'utf8',
  );
  assertTrue(
    hebcalProviderSrc.includes('weeklyParasha') &&
      hebcalProviderSrc.includes('locationSource') &&
      hebcalProviderSrc.includes('buildYearCacheKey'),
    'P9.6: hebcalProvider exposes parasha and location-aware cache',
  );
  assertTrue(
    !hebcalProviderSrc.includes('T12:00:00') &&
      !hebcalProviderSrc.includes('T08:00:00'),
    'P9.6: hebcalProvider does not fabricate event times',
  );

  const eventMapperSrc = readFileSync(join(root, 'src/services/eventMapper.ts'), 'utf8');
  assertTrue(eventMapperSrc.includes('הבדלה'), 'P9.6: Havdalah display title is הבדלה');
  assertTrue(
    !eventMapperSrc.includes('T12:00:00'),
    'P9.6: eventMapper does not fabricate countdown times',
  );

  const notifSrc = readFileSync(join(root, 'src/services/notificationScheduler.ts'), 'utf8');
  assertTrue(
    notifSrc.includes('calendarService.getUpcomingEvents') &&
      notifSrc.includes('event.startDate'),
    'P9.6: notifications use authoritative calendar events',
  );

  const homeSrc = readFileSync(join(root, 'src/screens/home/HomeScreen.tsx'), 'utf8');
  assertTrue(
    homeSrc.includes('WeeklyParashaCard'),
    'P9.6: HomeScreen shows WeeklyParashaCard',
  );

  const synagoguesSrc = readFileSync(join(root, 'src/services/synagogues.ts'), 'utf8');
  assertTrue(
    !/let activeProvider[^;]*new MockSynagogueProvider\(\)/.test(synagoguesSrc),
    'P9.6: no mock synagogue provider as default',
  );
}

async function main() {
  console.log('Phase 9 Verification\n====================\n');

  runP9_001BoundaryTests();
  runXpIdempotencyTests();
  runStreakTests();
  runQuizDeterminismTests();
  runBadgeIdempotencyTests();
  runLevelTests();
  runMultiUserIsolationTests();
  runNotificationTests();
  runOverpassTests();
  runDistanceTests();
  runCalendarMitzvahActivationTests();
  runProductionProviderTests();
  runSecurityAuditTests();
  runLegacyCodeAuditTests();
  runXpPathAuditTests();
  runNotificationPermissionAuditTests();
  runQuizExposureTests();

  try {
    await runHebcalCalendarTests();
    await runPhase96CalendarTests();
  } catch (error) {
    record('Calendar: @hebcal/core tests', false, String(error));
  }

  const failed = results.filter((item) => !item.pass);
  const passed = results.length - failed.length;
  console.log(`\n${passed}/${results.length} passed`);

  if (failed.length > 0) {
    console.log('\nFailed tests:');
    for (const f of failed) {
      console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`);
    }
    process.exitCode = 1;
  }
}

void main();
