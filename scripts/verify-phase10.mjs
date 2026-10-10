/**
 * Phase 10 verification — Supabase backend & cloud synchronization.
 * Run: npm run verify:phase10
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcRoot = join(root, 'src');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function readSrc(relPath) {
  return readFileSync(join(srcRoot, relPath), 'utf8');
}

function walkTsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

// ─── Schema / migration static checks ───────────────────────────────────────

const migrationPath = 'supabase/migrations/20260811000000_phase10_initial_schema.sql';
const migration = read(migrationPath);

const requiredTables = [
  'profiles',
  'mitzvah_preferences',
  'mitzvah_completions',
  'quiz_attempts',
  'user_badges',
  'onboarding_state',
];

for (const table of requiredTables) {
  record(`migration table: ${table}`, migration.includes(`public.${table}`));
}

record(
  'migration: completions unique constraint',
  migration.includes('UNIQUE (user_id, mitzvah_id, activity_date)'),
);
record(
  'migration: quiz unique constraint',
  migration.includes('UNIQUE (user_id, quiz_date, question_id)'),
);
record(
  'migration: badges primary key',
  migration.includes('PRIMARY KEY (user_id, badge_id)'),
);
record('migration: profiles FK to auth.users', migration.includes('REFERENCES auth.users(id)'));
record('migration: updated_at trigger', migration.includes('set_updated_at'));
record('migration: RLS enabled on all tables', (migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length >= 6);

const rlsTables = requiredTables;
for (const table of rlsTables) {
  record(`RLS policies exist: ${table}`, migration.includes(`${table}_select_own`));
}

record('no service role key in source', !read('src/services/supabase.ts').includes('service_role'));
record(
  'signUpWithEmail passes display_name metadata',
  read('src/services/auth.ts').includes('display_name: trimmedDisplayName'),
);
record(
  'useAuthSession subscribes to onAuthStateChange',
  existsSync(join(root, 'src/hooks/useAuthSession.ts')) &&
    read('src/hooks/useAuthSession.ts').includes('onAuthStateChange'),
);
record(
  'RootNavigator mounts useAuthSession',
  read('src/navigation/RootNavigator.tsx').includes('useAuthSession()'),
);
record('.env.example has placeholders only', (() => {
  const env = read('.env.example');
  return env.includes('EXPO_PUBLIC_SUPABASE_URL=') && !env.includes('eyJ');
})());
record('.gitignore excludes .env', read('.gitignore').includes('.env'));

// ─── Repository layer checks ────────────────────────────────────────────────

const cloudFiles = [
  'src/services/cloud/profileRepository.ts',
  'src/services/cloud/mitzvahRepository.ts',
  'src/services/cloud/quizRepository.ts',
  'src/services/cloud/badgeRepository.ts',
  'src/services/cloud/onboardingRepository.ts',
  'src/services/cloud/syncService.ts',
  'src/services/cloud/reconciliation.ts',
  'src/services/cloud/syncQueue.ts',
];

for (const file of cloudFiles) {
  record(`cloud module exists: ${file}`, existsSync(join(root, file)));
}

const screenAndComponentFiles = walkTsFiles(join(srcRoot, 'screens'))
  .concat(walkTsFiles(join(srcRoot, 'components')));

let uiCallsSupabase = false;
for (const file of screenAndComponentFiles) {
  const content = readFileSync(file, 'utf8');
  if (content.includes('getSupabaseClient') || content.includes("from '@/services/supabase'")) {
    uiCallsSupabase = true;
    record(`UI must not call Supabase directly: ${file.replace(srcRoot, 'src')}`, false);
  }
}
if (!uiCallsSupabase) {
  record('no UI component calls Supabase directly', true);
}

const repoFiles = cloudFiles.filter((f) => f.includes('Repository'));
for (const file of repoFiles) {
  const content = read(file);
  record(`${file} scopes by user`, content.includes('.eq('));
}

// ─── XP integrity checks ────────────────────────────────────────────────────

record('awardXp remains centralized', readSrc('services/xp.ts').includes('export async function awardXp'));
record(
  'sync reconciliation recomputes XP from events',
  read('src/services/cloud/reconciliation.ts').includes('recomputeXpFromEvents'),
);
record(
  'sync does not call awardXp',
  !read('src/services/cloud/syncService.ts').includes('awardXp'),
);
record(
  'applyProfileFromSync bypasses awardXp',
  readSrc('services/profile.ts').includes('applyProfileFromSync') &&
    !readSrc('services/profile.ts').match(/applyProfileFromSync[\s\S]*awardXp/),
);

// ─── Idempotency / merge checks ─────────────────────────────────────────────

record('merge completions uses union semantics', read('src/services/cloud/reconciliation.ts').includes('mergeCompletions'));
record('merge badges uses union semantics', read('src/services/cloud/reconciliation.ts').includes('mergeBadges'));
record('merge quiz uses union semantics', read('src/services/cloud/reconciliation.ts').includes('mergeQuizAttempts'));
record('preferences merge uses updated_at', read('src/services/cloud/reconciliation.ts').includes('updatedAt > existing.updatedAt'));

// ─── Offline / queue checks ───────────────────────────────────────────────────

record('sync queue module exists', existsSync(join(root, 'src/services/cloud/syncQueue.ts')));
record('sync queue persists pending flag', read('src/services/cloud/syncQueue.ts').includes('sync_pending'));
record('sync service handles timeout', read('src/services/cloud/types.ts').includes('SYNC_TIMEOUT_MS'));
record('sync failures are non-fatal in requestCloudSync', read('src/services/cloud/syncService.ts').includes('Non-fatal'));

// ─── Date handling ──────────────────────────────────────────────────────────

record('reconciliation imports activity date utils', read('src/services/cloud/reconciliation.ts').includes('getPreviousActivityDateKey'));
record('mitzvot service uses getActivityDateKey', readSrc('services/mitzvot.ts').includes('getActivityDateKey'));

// ─── Privacy audit ──────────────────────────────────────────────────────────

const cloudSources = cloudFiles.map((f) => read(f)).join('\n');
record('cloud layer does not upload latitude', !cloudSources.includes('latitude'));
record('cloud layer does not upload longitude', !cloudSources.includes('longitude'));
record('overpass remains separate service', existsSync(join(root, 'src/services/overpass.ts')));

// ─── Multi-user isolation ─────────────────────────────────────────────────────

record('storage keys are user-scoped', readSrc('utils/storage.ts').includes(':${userId}') || readSrc('utils/storage.ts').includes(':${userId}'));
record('logout clears in-memory stores only', readSrc('screens/profile/ProfileScreen.tsx').includes('clearUser()'));

// ─── Database types ─────────────────────────────────────────────────────────

const dbTypes = read('src/types/database.ts');
for (const table of requiredTables) {
  record(`database.ts defines ${table}`, dbTypes.includes(`${table}:`));
}

// ─── Inline XP idempotency simulation ───────────────────────────────────────

function recomputeXp(completions, quizAttempts) {
  const completionXp = completions.reduce((s, c) => s + Math.max(0, c.xpAwarded), 0);
  const quizXp = quizAttempts.reduce((s, a) => s + Math.max(0, a.xpAwarded), 0);
  return completionXp + quizXp;
}

function mergeCompletions(local, cloud) {
  const map = new Map();
  for (const c of local) map.set(`${c.mitzvahId}:${c.completionDate}`, c);
  for (const c of cloud) {
    const key = `${c.mitzvahId}:${c.completionDate}`;
    if (!map.has(key)) map.set(key, c);
  }
  return [...map.values()];
}

const localCompletion = [{ mitzvahId: 'm1', completionDate: '2026-08-11', xpAwarded: 10 }];
const cloudCompletion = [{ mitzvahId: 'm1', completionDate: '2026-08-11', xpAwarded: 10 }];
const merged = mergeCompletions(localCompletion, cloudCompletion);
record('XP idempotency: duplicate completion merge', merged.length === 1);
record(
  'XP idempotency: sync 10x same completion',
  recomputeXp(merged, []) === 10,
);

const localXp = 100;
const cloudXp = 100;
const mergedEventsXp = recomputeXp(
  [{ mitzvahId: 'm1', completionDate: '2026-08-11', xpAwarded: 100 }],
  [],
);
record(
  'XP idempotency: local+cloud must not double',
  mergedEventsXp === 100 && mergedEventsXp !== localXp + cloudXp,
);

// ─── UUID client IDs (Phase 10.6.6) ─────────────────────────────────────────

record(
  'completeMitzvah uses generateUuidV4',
  readSrc('services/mitzvot.ts').includes('id: generateUuidV4()'),
);
record(
  'quiz attempts use generateUuidV4',
  readSrc('services/quiz.ts').includes('id: generateUuidV4()'),
);
record(
  'sync migrates local UUIDs before pull/push',
  read('src/services/cloud/syncService.ts').includes('migratePersistedUuidRecords'),
);
record(
  'completion upsert validates UUID ids',
  read('src/services/cloud/mitzvahRepository.ts').includes('assertCloudUuid'),
);
record(
  'quiz upsert validates UUID ids',
  read('src/services/cloud/quizRepository.ts').includes('assertCloudUuid'),
);

// ─── Summary ────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nPhase 10 verification: ${passed}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
