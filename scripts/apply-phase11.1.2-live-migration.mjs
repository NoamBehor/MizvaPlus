/**
 * Apply Phase 11.1.2 correction for list_active_minyan_reports (42804 fix).
 *
 * Run: npm run apply:phase11.1.2-live
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL in environment or .env (never commit).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveEnv } from './lib/supabase-live-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const migrationPath = join(
  root,
  'supabase/migrations/20260907100000_fix_list_active_minyan_reports.sql',
);
const migrationVersion = '20260907100000_fix_list_active_minyan_reports';

function fail(message) {
  console.error(`FAIL - ${message}`);
  process.exit(1);
}

function main() {
  if (!existsSync(migrationPath)) {
    fail(`Migration file not found: ${migrationPath}`);
  }

  const env = resolveEnv();
  const databaseUrl = env.databaseUrl;
  if (!databaseUrl) {
    fail(
      'DATABASE_URL or SUPABASE_DB_URL required. Set in .env for one-time apply (never commit).',
    );
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
