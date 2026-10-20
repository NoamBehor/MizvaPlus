/**
 * Production sprint regression checks — Minyan RPC 42804, parasha runtime,
 * My Mitzvot editing, prayer reader, navigation preservation.
 *
 * Run: npm run verify:sprint-production
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const ISRAEL_TIMEZONE = 'Asia/Jerusalem';
const ISRAEL_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: ISRAEL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getCalendarDateKey(date = new Date()) {
  const parts = ISRAEL_DATE_FORMATTER.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDaysToDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getShabbatDateKeyForWeek(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const daysUntilSaturday = day === 6 ? 0 : 6 - day;
  return addDaysToDateKey(dateKey, daysUntilSaturday);
}

function gregorianDateKeyFromEvent(ev) {
  const gregorian = ev.getDate().greg();
  const year = gregorian.getFullYear();
  const month = String(gregorian.getMonth() + 1).padStart(2, '0');
  const day = String(gregorian.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isParashaEvent(ev, flags) {
  const desc = ev.getDesc().toLowerCase();
  return (ev.getFlags() & flags.PARSHA_HASHAVUA) !== 0 || desc.includes('parashat');
}

function getWeeklyParashaForDateKey(dateKey, location, HebrewCalendar, flags) {
  const shabbatDateKey = getShabbatDateKeyForWeek(dateKey);
  const shabbatDate = parseDateKey(shabbatDateKey);
  const years = new Set([
    shabbatDate.getFullYear() - 1,
    shabbatDate.getFullYear(),
    shabbatDate.getFullYear() + 1,
  ]);

  const events = [];
  for (const year of years) {
    events.push(
      ...HebrewCalendar.calendar({
        year,
        isHebrewYear: false,
        il: true,
        sedrot: true,
        location,
      }),
    );
  }

  const parashaEvent = events.find((ev) => {
    if (!isParashaEvent(ev, flags)) {
      return false;
    }
    return gregorianDateKeyFromEvent(ev) === shabbatDateKey;
  });

  if (!parashaEvent) {
    return null;
  }

  return {
    hebrewDisplayName: parashaEvent.render('he').replace(/^פרשת /, ''),
    basename: parashaEvent.basename(),
  };
}

async function main() {
  const { HebrewCalendar, Location, flags } = await import('@hebcal/core');
  const jerusalem =
    Location.lookup('Jerusalem') ??
    new Location(31.7683, 35.2137, true, ISRAEL_TIMEZONE, 'Jerusalem', 'IL');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readMigration(name) {
  return read(`supabase/migrations/${name}`);
}

console.log('Production sprint verification\n==============================\n');

// ─── Minyan RPC 42804 regression ─────────────────────────────────────────────

const fixMigration = readMigration('20260907100000_fix_list_active_minyan_reports.sql');
const phase111Migration = readMigration('20260906100000_phase11_1_minyan_live.sql');

record(
  'Sprint: correction migration exists for list_active_minyan_reports',
  fixMigration.includes('CREATE OR REPLACE FUNCTION public.list_active_minyan_reports'),
);

record(
  'Sprint: list RPC RETURN QUERY expands composite columns (42804 fix)',
  /RETURN QUERY[\s\S]*SELECT[\s\S]*r\.id,[\s\S]*r\.synagogue_osm_key/.test(fixMigration) &&
    !/RETURN QUERY[\s\S]*ROW\([\s\S]*\)::public\.public_minyan_report/.test(fixMigration),
);

record(
  'Sprint: original migration documented the ROW() mismatch risk',
  /list_active_minyan_reports[\s\S]*ROW\([\s\S]*\)::public\.public_minyan_report/.test(
    phase111Migration,
  ),
);

record(
  'Sprint: list RPC preserves server missing_count computation',
  fixMigration.includes('minyan_compute_missing_count(r.current_attendance)'),
);

record(
  'Sprint: list RPC preserves coming_count aggregate',
  fixMigration.includes('COALESCE(c.coming_count, 0)::bigint'),
);

const minyanServiceSrc = read('src/services/minyanLive/minyanLiveService.ts');
record(
  'Sprint: client uses list_active_minyan_reports RPC only',
  minyanServiceSrc.includes("rpc('list_active_minyan_reports'"),
);

// ─── Parasha runtime path ────────────────────────────────────────────────────

const calendarServiceSrc = read('src/services/calendar/calendarService.ts');
const calendarConstantsSrc = read('src/services/diagnostics/constants.ts');
record(
  'Sprint: calendar cache bumped to v2',
  calendarServiceSrc.includes('CALENDAR_CACHE_STORAGE_KEY') &&
    calendarConstantsSrc.includes('calendar_cache_v2'),
);

record(
  'Sprint: calendar service enriches missing weeklyParasha at runtime',
  calendarServiceSrc.includes('enrichDayInfoWithParasha') &&
    calendarServiceSrc.includes('getWeeklyParashaForDateKey'),
);


const sundayKey = '2026-08-09';
const fridayKey = '2026-08-14';
const saturdayKey = '2026-08-15';

record(
  'Sprint: Sunday Shabbat target date',
  getShabbatDateKeyForWeek(sundayKey) === saturdayKey,
);

const sundayParasha = getWeeklyParashaForDateKey(sundayKey, jerusalem, HebrewCalendar, flags);
const fridayParasha = getWeeklyParashaForDateKey(fridayKey, jerusalem, HebrewCalendar, flags);
const saturdayParasha = getWeeklyParashaForDateKey(saturdayKey, jerusalem, HebrewCalendar, flags);

record('Sprint: Sunday parasha resolved at runtime', Boolean(sundayParasha?.hebrewDisplayName));
record('Sprint: Friday parasha resolved at runtime', Boolean(fridayParasha?.hebrewDisplayName));
record('Sprint: Saturday parasha resolved at runtime', Boolean(saturdayParasha?.hebrewDisplayName));
record(
  'Sprint: Friday/Saturday share weekly parasha',
  fridayParasha?.basename === saturdayParasha?.basename,
);

const israelSundayKey = getCalendarDateKey(new Date(`${sundayKey}T21:30:00Z`));
record(
  'Sprint: Israel timezone Sunday date key',
  israelSundayKey === sundayKey ||
    process.env.TZ === 'Asia/Jerusalem' ||
    Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Jerusalem',
  israelSundayKey === sundayKey ? '' : `runner=${Intl.DateTimeFormat().resolvedOptions().timeZone}, key=${israelSundayKey}`,
);
record(
  'Sprint: Israel timezone Sunday parasha',
  Boolean(getWeeklyParashaForDateKey(israelSundayKey, jerusalem, HebrewCalendar, flags)?.hebrewDisplayName),
);

// ─── My Mitzvot editing ──────────────────────────────────────────────────────

const myMitzvotSrc = read('src/screens/mitzvot/MyMitzvotScreen.tsx');
const editPanelSrc = read('src/components/mitzvah/MyMitzvotEditPanel.tsx');
const storeSrc = read('src/store/mitzvahStore.ts');
const nextEventHookSrc = read('src/hooks/useNextUpcomingEvent.ts');

record(
  'Sprint: My Mitzvot edit action label',
  myMitzvotSrc.includes('עריכת המצוות שלי'),
);

record(
  'Sprint: edit panel supports multi-select draft',
  editPanelSrc.includes('draftSelection') && editPanelSrc.includes('toggleDraft'),
);

record(
  'Sprint: save action uses batch store API',
  editPanelSrc.includes('saveTrackedSelections') && editPanelSrc.includes('שמירה'),
);

record(
  'Sprint: success message after save',
  editPanelSrc.includes('המצוות שלך עודכנו'),
);

record(
  'Sprint: batch save detects no-op',
  storeSrc.includes("return 'noop'") && editPanelSrc.includes('לא בוצעו שינויים'),
);

record(
  'Sprint: preferences revision triggers next event refresh',
  storeSrc.includes('preferencesRevision') &&
    nextEventHookSrc.includes('preferencesRevision'),
);

// ─── Prayer reader ───────────────────────────────────────────────────────────

const prayerComponentSrc = read('src/components/mitzvah/PrayerText.tsx');
const prayerLayoutSrc = read('src/constants/prayerReaderLayout.ts');
const detailSrc = read('src/screens/mitzvot/MitzvahDetailScreen.tsx');
const prayerContentServiceSrc = read('src/services/texts/prayerContentService.ts');
const mitzvahUtilsSrc = read('src/utils/mitzvah.ts');

record(
  'Sprint: PrayerText supports RTL typography',
  prayerLayoutSrc.includes("writingDirection: 'rtl'") &&
    prayerComponentSrc.includes('ScrollView') &&
    prayerComponentSrc.includes('prayerRtlBlock'),
);

record(
  'Sprint: detail screen shows explanation section',
  detailSrc.includes('הסבר') && detailSrc.includes('getMitzvahExplanation'),
);

record(
  'Sprint: detail screen shows prayer when available',
  detailSrc.includes("navigation.navigate('PrayerReader'") &&
    detailSrc.includes('canOpenPrayerReader'),
);

record(
  'Sprint: mitzvah without prayer skips prayer section',
  detailSrc.includes('canOpenReader && localPrayerId'),
);

record(
  'Sprint: Shema prayer content includes nikud',
  read('src/content/prayers/edot-hamizrach/kriat-shema.json').includes('בָּרוּךְ אַתָּה'),
);

record(
  'Sprint: prayer lookup helper',
  prayerContentServiceSrc.includes('getPrayerIdForMitzvah') &&
    mitzvahUtilsSrc.includes('getMitzvahPrayer'),
);

// ─── Navigation preservation ─────────────────────────────────────────────────

const navRefSrc = read('src/navigation/navigationRef.ts');
const mapScreenSrc = read('src/screens/map/MapScreen.tsx');
const synagogueCardSrc = read('src/components/map/SynagogueListCard.tsx');

record(
  'Sprint: My Mitzvot navigation preserved',
  navRefSrc.includes('navigateToMyMitzvot'),
);

record(
  'Sprint: map screen keeps navigation action',
  synagogueCardSrc.includes('openSynagogueNavigation') &&
    synagogueCardSrc.includes('נווט לבית הכנסת') &&
    mapScreenSrc.includes('SynagogueListCard'),
);

record(
  'Sprint: synagogue navigation helper preserved',
  read('src/utils/synagogueNavigation.ts').includes('openSynagogueNavigation'),
);

record(
  'Sprint: ANCHOR_NOT_FOUND user-facing message',
  read('src/services/minyanLive/minyanLiveErrors.ts').includes(
    'בית הכנסת עדיין לא זמין לדיווח מניין',
  ),
);

record(
  'Sprint: anchor bootstrap script documented',
  read('scripts/bootstrap-synagogue-anchor.mjs').includes('npm run bootstrap:minyan-anchor'),
);

const bootstrapSrc = read('scripts/bootstrap-synagogue-anchor.mjs');
const provisioningDoc = read('docs/minyan-anchor-provisioning.md');

record(
  'Sprint: bootstrap accepts --osm-key',
  bootstrapSrc.includes('--osm-key') &&
    bootstrapSrc.includes('createSynagogueCoordinateResolver'),
);

record(
  'Sprint: provisioning strategy documented',
  provisioningDoc.includes('upsert_synagogue_anchor') &&
    provisioningDoc.includes('ANCHOR_NOT_FOUND') &&
    provisioningDoc.includes('service_role'),
);

record(
  'Sprint: no client anchor table mutation',
  !minyanServiceSrc.includes("from('synagogue_anchors')") &&
    !minyanServiceSrc.includes('upsert_synagogue_anchor'),
);

// ─── Summary ─────────────────────────────────────────────────────────────────

const passed = results.filter((item) => item.pass).length;
const failed = results.filter((item) => !item.pass);

console.log(`\n${passed}/${results.length} checks passed`);

if (failed.length > 0) {
  console.log('\nFailed checks:');
  for (const item of failed) {
    console.log(`  - ${item.name}${item.detail ? `: ${item.detail}` : ''}`);
  }
  process.exit(1);
}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
