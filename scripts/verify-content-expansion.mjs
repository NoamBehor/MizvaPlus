/**
 * Content expansion verification — holiday guides, daily learning, quiz bank.
 * Run: node scripts/verify-content-expansion.mjs
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

// ─── Holiday guides ─────────────────────────────────────────────────────────

const holidayDir = join(root, 'src/content/holidays');
const holidayFiles = readdirSync(holidayDir).filter(
  (file) => file.endsWith('.ts') && file !== 'shared.ts' && file !== 'index.ts',
);
record('holiday guide modules exist', holidayFiles.length >= 12, `count=${holidayFiles.length}`);

const holidaySource = holidayFiles
  .map((file) => readSource(`src/content/holidays/${file}`))
  .join('\n');

const requiredHolidayKeys = [
  'rosh_hashanah',
  'yom_kippur',
  'sukkot',
  'shemini_atzeret',
  'simchat_torah',
  'pesach',
  'shavuot',
  'purim',
  'hanukkah',
  'tisha_bav',
  'taanit_gedalia',
  'lag_baomer',
  'tu_bshvat',
];

for (const key of requiredHolidayKeys) {
  record(
    `holiday guide registered: ${key}`,
    holidaySource.includes(`holidayKey: '${key}'`),
  );
}

// ─── Daily learning ─────────────────────────────────────────────────────────

const cycleSource = readSource('src/content/dailyLearning/cycle30.ts');
const lessonMatches = cycleSource.match(/^\s*lesson\(/gm) ?? [];
record('daily learning 30-day cycle', lessonMatches.length === 30, `count=${lessonMatches.length}`);
record(
  'daily learning module id',
  cycleSource.includes("MODULE_ID = 'cycle-30-v1'"),
);
record(
  'daily learning content pack day 1',
  cycleSource.includes('למה מתחילים בבריאת העולם?'),
);
record(
  'daily learning content pack day 30',
  cycleSource.includes('סיום מסלול: איזה אדם אני רוצה להיות?'),
);

// ─── Quiz bank ──────────────────────────────────────────────────────────────

const difficulties = ['easy', 'medium', 'hard', 'veryHard'];
const categories = [
  'TORAH',
  'TANAKH',
  'MITZVOT',
  'SHABBAT',
  'HOLIDAYS',
  'TEFILLAH',
  'JEWISH_HISTORY',
  'HEBREW_TERMINOLOGY',
  'JEWISH_THOUGHT',
  'PARASHA',
];

let totalQuestions = 0;
const questionIds = new Set();

for (const difficulty of difficulties) {
  const source = readSource(`src/content/quiz/${difficulty}.ts`);
  const idMatches = source.match(/id: '/g) ?? [];
  totalQuestions += idMatches.length;
  record(`quiz ${difficulty} count`, idMatches.length === 50, `count=${idMatches.length}`);

  for (const category of categories) {
    const pattern = new RegExp(`category: '${category}'`, 'g');
    const count = source.match(pattern)?.length ?? 0;
    record(`quiz ${difficulty} ${category}`, count === 5, `count=${count}`);
  }

  for (const match of source.matchAll(/id: '([^']+)'/g)) {
    questionIds.add(match[1]);
  }
}

record('quiz bank total 200', totalQuestions === 200, `count=${totalQuestions}`);
record('quiz question ids unique', questionIds.size === totalQuestions, `unique=${questionIds.size}`);

// ─── Architecture files ─────────────────────────────────────────────────────

const archFiles = [
  'src/types/content.ts',
  'src/types/holidayGuide.ts',
  'src/services/holidayGuideService.ts',
  'src/hooks/useDailyLearning.ts',
  'src/store/dailyLearningStore.ts',
];

for (const file of archFiles) {
  try {
    readSource(file);
    record(`architecture file: ${file}`, true);
  } catch {
    record(`architecture file: ${file}`, false, 'missing');
  }
}

const failed = results.filter((entry) => !entry.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) {
  process.exit(1);
}
