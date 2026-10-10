/**
 * Phase 10.6.6 — UUID validity, local ID migration, and sync payload checks.
 * Run: npm run verify:uuid
 *
 * Runtime tests import src/utils/uuid.ts (Node 24 type stripping).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const RFC_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_CLIENT_ID = /^\d+-[a-z0-9]+$/i;

console.log('UUID / local ID migration verification\n======================================\n');

const uuidPath = 'src/utils/uuid.ts';
const migrationPath = 'src/services/cloud/localUuidMigration.ts';
record('uuid helper module exists', existsSync(join(root, uuidPath)));
record('local UUID migration module exists', existsSync(join(root, migrationPath)));

const dateSrc = existsSync(join(root, 'src/utils/date.ts')) ? read('src/utils/date.ts') : '';
const mitzvotSrc = read('src/services/mitzvot.ts');
const quizSrc = read('src/services/quiz.ts');
const syncSrc = read('src/services/cloud/syncService.ts');
const reconciliationSrc = read('src/services/cloud/reconciliation.ts');
const mitzvahRepoSrc = read('src/services/cloud/mitzvahRepository.ts');
const quizRepoSrc = read('src/services/cloud/quizRepository.ts');
const mitzvahStoreSrc = read('src/store/mitzvahStore.ts');
const gamificationStoreSrc = read('src/store/gamificationStore.ts');
const uuidSrc = existsSync(join(root, uuidPath)) ? read(uuidPath) : '';
const migrationSrc = existsSync(join(root, migrationPath)) ? read(migrationPath) : '';

record(
  'generateId() remains in date.ts (not globally replaced)',
  dateSrc.includes('export function generateId()'),
);

record(
  'MitzvahCompletion does not use generateId()',
  !mitzvotSrc.includes("import { generateId } from '@/utils/date'") &&
    !mitzvotSrc.includes('id: generateId()'),
);

record(
  'DailyQuizAttempt does not use generateId()',
  !quizSrc.includes("import { generateId } from '@/utils/date'") &&
    !quizSrc.includes('id: generateId()'),
);

record(
  'completeMitzvah assigns generateUuidV4()',
  mitzvotSrc.includes('generateUuidV4') && mitzvotSrc.includes('id: generateUuidV4()'),
);

record(
  'submitDailyQuizAnswer assigns generateUuidV4()',
  quizSrc.includes('generateUuidV4') && quizSrc.includes('id: generateUuidV4()'),
);

record(
  'UUID generator does not assume crypto.randomUUID() alone',
  uuidSrc.includes('generateUuidV4') &&
    (uuidSrc.includes('getRandomValues') || uuidSrc.includes('Math.random')) &&
    uuidSrc.includes('randomUUID'),
);

record(
  'legacy client ID pattern is Date.now()-random',
  uuidSrc.includes('isLegacyClientId') &&
    (uuidSrc.includes('^\\d+-[a-z0-9]+') || uuidSrc.includes('^\\d+-')),
);

record(
  'migration runs before first cloud sync',
  /export async function synchronizeUserData[\s\S]*migratePersistedUuidRecords[\s\S]*pullCloudSnapshot/.test(
    syncSrc,
  ),
);

record(
  'mitzvahStore migrates completions on initialize',
  mitzvahStoreSrc.includes('migrateCompletions'),
);

record(
  'gamificationStore migrates quiz attempts on initialize',
  gamificationStoreSrc.includes('migrateQuizAttempts'),
);

record(
  'localCompletionToCloud copies completion.id',
  /export function localCompletionToCloud[\s\S]*id:\s*completion\.id/.test(
    reconciliationSrc,
  ),
);

record(
  'localQuizToCloud copies attempt.id',
  /export function localQuizToCloud[\s\S]*id:\s*attempt\.id/.test(reconciliationSrc),
);

record(
  'pushLocalState maps completions through localCompletionToCloud',
  syncSrc.includes('localCompletionToCloud(completion)'),
);

record(
  'pushLocalState maps quiz attempts through localQuizToCloud',
  syncSrc.includes('localQuizToCloud(attempt)'),
);

record(
  'upsertCompletions sends payload.id and validates UUID',
  mitzvahRepoSrc.includes('id: row.id') &&
    mitzvahRepoSrc.includes('assertCloudUuid') &&
    mitzvahRepoSrc.includes("assertCloudUuid(row.id"),
);

record(
  'upsertQuizAttempts sends payload.id and validates UUID',
  quizRepoSrc.includes('id: row.id') &&
    quizRepoSrc.includes('assertCloudUuid') &&
    quizRepoSrc.includes("assertCloudUuid(row.id"),
);

record(
  'migration module persists AsyncStorage records',
  migrationSrc.includes('completionsStorageKey') &&
    migrationSrc.includes('quizAttemptsStorageKey') &&
    migrationSrc.includes('setJson'),
);

let uuidMod = null;
try {
  uuidMod = await import(pathToFileURL(join(root, uuidPath)).href);
  record('uuid module loads in Node', true);
} catch (error) {
  record('uuid module loads in Node', false, String(error?.message ?? error));
}

if (uuidMod) {
  const {
    generateUuidV4,
    isRfcUuid,
    isLegacyClientId,
    migrateCompletions,
    migrateQuizAttempts,
    assertCloudUuid,
  } = uuidMod;

  const ids = new Set(Array.from({ length: 50 }, () => generateUuidV4()));
  record(
    'generateUuidV4 returns RFC UUID v4',
    ids.size === 50 && [...ids].every((id) => UUID_V4.test(id)),
  );
  record(
    'isRfcUuid accepts generated UUIDs',
    [...ids].every((id) => isRfcUuid(id)),
  );

  const legacyId = '1787489824820-3bex9ay';
  record('legacy example matches old generateId format', LEGACY_CLIENT_ID.test(legacyId));
  record('isLegacyClientId detects Date.now()-random', isLegacyClientId(legacyId));
  record('isRfcUuid rejects legacy client IDs', !isRfcUuid(legacyId));
  record('isRfcUuid rejects empty string', !isRfcUuid(''));

  const completion = {
    id: legacyId,
    userId: 'user-1',
    mitzvahId: 'netilat-yadayim',
    completedAt: '2026-08-23T10:00:00.000Z',
    completionDate: '2026-08-23',
    xpAwarded: 10,
  };

  const first = migrateCompletions([completion]);
  record('migration replaces legacy completion id with UUID', isRfcUuid(first.records[0].id));
  record('migration reports changed for legacy completion', first.changed === true);
  record(
    'migration preserves completion business fields',
    first.records[0].userId === completion.userId &&
      first.records[0].mitzvahId === completion.mitzvahId &&
      first.records[0].completedAt === completion.completedAt &&
      first.records[0].completionDate === completion.completionDate &&
      first.records[0].xpAwarded === completion.xpAwarded,
  );

  const second = migrateCompletions(first.records);
  record('migration is idempotent (second run unchanged)', second.changed === false);
  record(
    'migration keeps the same UUID on rerun',
    second.records[0].id === first.records[0].id,
  );

  const alreadyUuid = {
    ...completion,
    id: '550e8400-e29b-41d4-a716-446655440000',
  };
  const uuidPass = migrateCompletions([alreadyUuid]);
  record(
    'migration leaves valid UUID completions untouched',
    uuidPass.changed === false && uuidPass.records[0].id === alreadyUuid.id,
  );

  const duplicateLegacy = migrateCompletions([
    completion,
    { ...completion, id: '1787489824821-abc1234', xpAwarded: 10 },
  ]);
  record(
    'migration does not create duplicate logical completions',
    duplicateLegacy.records.length === 1 &&
      duplicateLegacy.records[0].mitzvahId === 'netilat-yadayim' &&
      duplicateLegacy.records[0].completionDate === '2026-08-23',
  );

  const quizLegacy = {
    id: '1787489824999-xyz9876',
    userId: 'user-1',
    questionId: 'q-1',
    dateKey: '2026-08-23',
    selectedOptionId: 'opt-a',
    isCorrect: true,
    xpAwarded: 5,
    completedAt: '2026-08-23T11:00:00.000Z',
  };
  const quizMigrated = migrateQuizAttempts([quizLegacy]);
  record('migration replaces legacy quiz id with UUID', isRfcUuid(quizMigrated.records[0].id));
  record(
    'migration preserves quiz business fields',
    quizMigrated.records[0].questionId === quizLegacy.questionId &&
      quizMigrated.records[0].dateKey === quizLegacy.dateKey &&
      quizMigrated.records[0].selectedOptionId === quizLegacy.selectedOptionId &&
      quizMigrated.records[0].isCorrect === quizLegacy.isCorrect &&
      quizMigrated.records[0].xpAwarded === quizLegacy.xpAwarded,
  );

  const quizAgain = migrateQuizAttempts(quizMigrated.records);
  record('quiz migration is idempotent', quizAgain.changed === false);

  const duplicateQuiz = migrateQuizAttempts([
    quizLegacy,
    { ...quizLegacy, id: '1787489825000-dupdup1' },
  ]);
  record(
    'migration does not create duplicate logical quiz attempts',
    duplicateQuiz.records.length === 1,
  );

  function localCompletionToCloud(row) {
    return { id: row.id, user_id: row.userId, mitzvah_id: row.mitzvahId };
  }
  function localQuizToCloud(row) {
    return { id: row.id, user_id: row.userId, question_id: row.questionId };
  }

  const completionPayload = localCompletionToCloud(first.records[0]);
  const quizPayload = localQuizToCloud(quizMigrated.records[0]);
  record(
    'sync payload MitzvahCompletion.id is UUID',
    RFC_UUID.test(completionPayload.id) && isRfcUuid(completionPayload.id),
  );
  record(
    'sync payload DailyQuizAttempt.id is UUID',
    RFC_UUID.test(quizPayload.id) && isRfcUuid(quizPayload.id),
  );

  let threw = false;
  try {
    assertCloudUuid(legacyId, 'mitzvah_completions.id');
  } catch {
    threw = true;
  }
  record('assertCloudUuid rejects non-UUID ids', threw);

  let uuidOk = true;
  try {
    assertCloudUuid(first.records[0].id, 'mitzvah_completions.id');
  } catch {
    uuidOk = false;
  }
  record('assertCloudUuid accepts RFC UUIDs', uuidOk);
}

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
console.log(`\nUUID verification: ${passed}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
