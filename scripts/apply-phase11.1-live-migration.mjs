/**
 * Apply Phase 11.1 Minyan Live migration to the linked live Supabase database.
 *
 * Run: npm run apply:phase11.1-live
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL in environment or .env (never commit).
 * Does NOT reset or destroy existing data — migration uses IF NOT EXISTS / OR REPLACE.
 *
 * Before applying, verifies the migration SQL does not modify Phase 10 tables.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readProjectFile, resolveEnv } from './lib/supabase-live-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationPath = join(root, 'supabase/migrations/20260906100000_phase11_1_minyan_live.sql');
const migrationVersion = '20260906100000_phase11_1_minyan_live';

const PHASE10_TABLES = [
  'profiles',
  'mitzvah_preferences',
  'mitzvah_completions',
  'quiz_attempts',
  'user_badges',
  'onboarding_state',
];

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function main() {
  if (!existsSync(migrationPath)) {
    fail(`Migration file not found: ${migrationPath}`);
  }

  const migration = readProjectFile('supabase/migrations/20260906100000_phase11_1_minyan_live.sql');
  for (const table of PHASE10_TABLES) {
    const pattern = new RegExp(`\\b(ALTER|DROP|DELETE\\s+FROM|TRUNCATE)\\s+.*\\b${table}\\b`, 'i');
    if (pattern.test(migration)) {
      fail(`Migration appears to modify Phase 10 table: ${table}`);
    }
  }
  console.log('PASS - Phase 10 tables untouched in migration SQL');

  const env = resolveEnv();
  const databaseUrl = env.databaseUrl;
  if (!databaseUrl) {
    fail(
      'DATABASE_URL or SUPABASE_DB_URL required. Set in .env for one-time apply (never commit).',
    );
  }

  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    fail('DATABASE_URL must be a PostgreSQL connection string');
  }

  console.log(`INFO - Applying migration ${migrationVersion}`);
  const result = spawnSync(
    'npx',
    ['supabase', 'db', 'execute', '--file', migrationPath, '--db-url', databaseUrl],
    { cwd: root, stdio: 'inherit', shell: true },
  );

  if (result.status !== 0) {
    fail(`supabase db execute exited with code ${result.status ?? 'unknown'}`);
  }

  console.log(`PASS - Migration ${migrationVersion} applied`);
}

main();
