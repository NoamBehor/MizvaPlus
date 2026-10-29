/**
 * Content reachability verification — mitzvah detail, holiday guides, mappings.
 * Run: npm run verify:content-reachability
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function readSource(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const holidayDir = join(root, 'src/content/holidays');
const holidayFiles = readdirSync(holidayDir).filter(
  (file) => file.endsWith('.ts') && file !== 'shared.ts' && file !== 'index.ts',
);
const holidaySource = holidayFiles
  .map((file) => readSource(`src/content/holidays/${file}`))
  .join('\n');
const mitzvahDetail = readSource('src/screens/mitzvot/MitzvahDetailScreen.tsx');
const holidayPrep = readSource('src/components/home/HolidayPrepCard.tsx');
const eventDescriptors = readSource('src/constants/eventDescriptors.ts');
const holidayThemes = readSource('src/constants/holidayThemes.ts');
const mitzvotSeed = readSource('src/constants/mitzvot.ts');
const mitzvahContent = readSource('src/constants/mitzvahContent.ts');
const calendarMap = readSource('src/constants/calendarMitzvahMap.ts');

const REQUIRED_GUIDE_KEYS = [
  'rosh_hashanah',
  'yom_kippur',
  'sukkot',
  'shemini_atzeret',
  'simchat_torah',
  'pesach',
  'shavuot',
  'purim',
  'shushan_purim',
  'hanukkah',
  'tisha_bav',
  'taanit_gedalia',
  'asarah_btevet',
  'taanit_esther',
  'taanit_bechorot',
  'lag_baomer',
  'tu_bshvat',
];

record('17 holiday guides registered', REQUIRED_GUIDE_KEYS.length === 17);
for (const key of REQUIRED_GUIDE_KEYS) {
  record(`guide registered: ${key}`, holidaySource.includes(`holidayKey: '${key}'`));
}

record(
  'HolidayPrepCard renders practical tips list',
  holidayPrep.includes("renderTipList(") && holidayPrep.includes("'טיפים מעשיים'"),
);
record(
  'HolidayPrepCard renders family tips',
  holidayPrep.includes("'טיפים למשפחה'"),
);
record(
  'HolidayPrepCard renders common mistakes',
  holidayPrep.includes("'טעויות נפוצות'"),
);
const explanationView = readSource('src/utils/mitzvahExplanationView.ts');
const insightCard = readSource(
  'src/components/mitzvah/explanation/ExplanationInsightCard.tsx',
);
record(
  'MitzvahDetailScreen uses getMitzvahContentText',
  mitzvahDetail.includes('buildMitzvahExplanationView') &&
    explanationView.includes('getMitzvahContentText(mitzvah)'),
);
record(
  'MitzvahDetailScreen renders detailed section',
  mitzvahDetail.includes('ExplanationInsightCard') &&
    insightCard.includes('הסבר מפורט'),
);
record(
  'MitzvahDetailScreen links to holiday guide',
  mitzvahDetail.includes('navigateToHomeHolidayGuide'),
);
record(
  'MitzvahDetailScreen resolves fast context from calendar',
  mitzvahDetail.includes('resolveMitzvahFastContext'),
);
record(
  'eventDescriptors exports getHolidayKeyForMitzvahId',
  eventDescriptors.includes('export function getHolidayKeyForMitzvahId'),
);
record(
  'taanit bechorot calendar mapping exists',
  calendarMap.includes("'taanit bechorot'"),
);
record(
  'shushan purim reuses purim mitzvah',
  calendarMap.includes("'shushan purim': ['purim']"),
);
record(
  'shemini atzeret maps to dedicated holiday key',
  eventDescriptors.includes("'shmini-atzeret': 'shemini_atzeret'"),
);

const themeKeys = [
  'hanukkah',
  'purim',
  'shushan_purim',
  'lag_baomer',
  'tu_bshvat',
  'simchat_torah',
  'shemini_atzeret',
];

for (const key of themeKeys) {
  record(`holiday theme defined: ${key}`, holidayThemes.includes(`${key}:`));
}

const mitzvahIds = [...mitzvotSeed.matchAll(/id: '([^']+)'/g)].map((match) => match[1]);
record('21 mitzvot seeded', mitzvahIds.length === 21, `count=${mitzvahIds.length}`);

const contentGaps = [];
for (const mitzvahId of mitzvahIds) {
  const hasFullContent = mitzvahContent.includes(`${mitzvahId}:`) ||
    mitzvahContent.includes(`'${mitzvahId}'`);
  if (!hasFullContent) {
    contentGaps.push(mitzvahId);
  }
}

record(
  'all mitzvot have MITZVAH_CONTENT entries',
  contentGaps.length === 0,
  contentGaps.length > 0 ? `missing=${contentGaps.join(',')}` : '',
);

const failed = results.filter((entry) => !entry.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
