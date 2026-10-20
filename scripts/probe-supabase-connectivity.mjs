/**
 * One-off connectivity probe (no secrets printed).
 * Run: node scripts/probe-supabase-connectivity.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from 'node:dns/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile();
const supabaseUrl = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  fileEnv.EXPO_PUBLIC_SUPABASE_URL ??
  ''
).replace(/\/$/, '');

if (!supabaseUrl) {
  console.log('RESULT missing_url');
  process.exit(2);
}

let hostname = '';
try {
  hostname = new URL(supabaseUrl).hostname;
} catch {
  console.log('RESULT invalid_url');
  process.exit(2);
}

console.log(`hostname ${hostname}`);

try {
  const records = await lookup(hostname);
  console.log(`dns_ok address=${records.address}`);
} catch (error) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : 'UNKNOWN';
  console.log(`dns_fail code=${code}`);
}

try {
  const health = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: 'connectivity-probe' },
  });
  console.log(`fetch_health status=${health.status}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : error instanceof Error && error.cause
        ? String(error.cause)
        : '';
  console.log(`fetch_fail message=${message}${cause ? ` cause=${cause}` : ''}`);
}
