/**
 * Phase 10.7 verification — JWT / PGRST303 forensic audit gate.
 * Run: npm run verify:phase10.7
 *
 * Static + live JWT timing checks. Device runtime matrix is BLOCKED without adb.
 * Never prints secret values or JWT strings.
 */
import { createClient } from '@supabase/supabase-js';
import { execFile as execFileCb } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const execFile = promisify(execFileCb);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];
let blockedReason = null;

function record(name, pass, detail = '') {
  const status = pass ? 'PASS' : blockedReason ? 'BLOCKED' : 'FAIL';
  results.push({ name, status, detail });
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function recordStatus(name, status, detail = '') {
  results.push({ name, status, detail });
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function loadEnvFile() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) {
    return {};
  }

  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }

  return env;
}

function normalizeSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  }
}

function decodeJwtTimingClaims(accessToken) {
  const parts = accessToken.split('.');
  if (parts.length < 2) {
    return null;
  }

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const json = Buffer.from(padded, 'base64').toString('utf8');
  const parsed = JSON.parse(json);

  return {
    iat: typeof parsed.iat === 'number' ? parsed.iat : null,
    nbf: typeof parsed.nbf === 'number' ? parsed.nbf : null,
    exp: typeof parsed.exp === 'number' ? parsed.exp : null,
  };
}

async function fetchServerTimeSec(supabaseUrl, anonKey) {
  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  const response = await fetch(`${baseUrl}/auth/v1/health`, {
    headers: { apikey: anonKey },
  });
  const dateHeader = response.headers.get('date');
  if (!dateHeader) {
    return null;
  }
  const parsed = Date.parse(dateHeader);
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
}

// ─── Static lifecycle audit ───────────────────────────────────────────────────

record('authSessionReady exists', existsSync(join(root, 'src/services/authSessionReady.ts')));
record('authRefreshGate exists', existsSync(join(root, 'src/services/authRefreshGate.ts')));
record('jwtForensics utility exists', existsSync(join(root, 'src/utils/jwtForensics.ts')));
record(
  'useSupabaseAuthRefresh hook exists',
  existsSync(join(root, 'src/hooks/useSupabaseAuthRefresh.ts')),
);
record(
  'syncService gates on ensureSessionReadyForSync',
  read('src/services/cloud/syncService.ts').includes('ensureSessionReadyForSync'),
);
record(
  'syncService serializes via withSyncAuthGuard',
  read('src/services/cloud/syncService.ts').includes('withSyncAuthGuard'),
);
record(
  'authRefreshGate waits for in-flight refresh',
  read('src/services/authRefreshGate.ts').includes('waitForAuthRefreshIdle'),
);
record(
  'authRefreshGate pauses auto-refresh during sync',
  read('src/services/authRefreshGate.ts').includes('stopAutoRefresh'),
);
record(
  'authRefreshGate claims sync depth before awaiting prior sync',
  read('src/services/authRefreshGate.ts').includes('syncAuthGuardDepth'),
);
record(
  'useSupabaseAuthRefresh respects sync auth guard',
  read('src/hooks/useSupabaseAuthRefresh.ts').includes('requestAutoRefreshWhenIdle'),
);
record(
  'session ready validates JWT iat against PostgREST clock',
  read('src/services/authSessionReady.ts').includes('fetchPostgrestServerTimeSec') &&
    read('src/services/authSessionReady.ts').includes('isJwtIatAheadOfServer'),
);
record(
  'jwt forensics exposes PostgREST server time probe',
  read('src/utils/jwtForensics.ts').includes('fetchPostgrestServerTimeSec'),
);
record(
  'RootNavigator mounts useSupabaseAuthRefresh',
  read('src/navigation/RootNavigator.tsx').includes('useSupabaseAuthRefresh'),
);
record(
  'useSupabaseAuthRefresh wires guarded auto-refresh',
  read('src/hooks/useSupabaseAuthRefresh.ts').includes('requestAutoRefreshWhenIdle'),
);
record(
  'useSupabaseAuthRefresh wires stopAutoRefresh',
  read('src/hooks/useSupabaseAuthRefresh.ts').includes('stopAutoRefresh'),
);
record(
  'forensics log numeric claims only',
  read('src/utils/jwtForensics.ts').includes('jwtIat') &&
    !read('src/utils/jwtForensics.ts').includes('access_token'),
);
record(
  'forensics include sync lifecycle stage',
  read('src/services/authSessionReady.ts').includes('syncStage='),
);
record('PGRST303 forensic logger is __DEV__ gated', read('src/services/authSessionReady.ts').includes('__DEV__'));

const syncSrc = read('src/services/cloud/syncService.ts');
record(
  'sync does not add arbitrary delay',
  !syncSrc.includes('setTimeout') && !syncSrc.includes('sleep('),
);
record(
  'sync does not blind-retry PGRST303',
  !syncSrc.toLowerCase().includes('pgrst303') || syncSrc.includes('logPgrst303Forensics'),
);

// ─── Environment ─────────────────────────────────────────────────────────────

const fileEnv = loadEnvFile();
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

if (!rawSupabaseUrl || !supabaseAnonKey) {
  blockedReason = 'SUPABASE CONFIGURATION';
  console.log('\nBLOCKED — SUPABASE CONFIGURATION');
  summarize();
  process.exit(0);
}

async function runLiveJwtTimingChecks() {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `phase10.7-${randomUUID()}@example.test`;
  const password = `Test-${randomUUID().slice(0, 8)}!`;

  const signUp = await client.auth.signUp({ email, password });
  record(
    'live: sign-up for JWT timing probe',
    !signUp.error && Boolean(signUp.data.session),
    signUp.error?.message ?? '',
  );

  if (!signUp.data.session) {
    return;
  }

  const accessToken = signUp.data.session.access_token;
  const claims = decodeJwtTimingClaims(accessToken);
  const serverTimeSec = await fetchServerTimeSec(supabaseUrl, supabaseAnonKey);
  const clientTimeSec = Math.floor(Date.now() / 1000);
  const iatMinusServer = claims?.iat !== null && serverTimeSec !== null ? claims.iat - serverTimeSec : null;

  console.log(
    `INFO - JWT timing: clientSec=${clientTimeSec} iat=${claims?.iat} nbf=${claims?.nbf} exp=${claims?.exp} serverSec=${serverTimeSec} iatMinusServerSec=${iatMinusServer}`,
  );

  record(
    'live: JWT iat decodable',
    claims?.iat !== null && claims?.iat !== undefined,
    `iat=${claims?.iat}`,
  );
  record(
    'live: server Date header available',
    serverTimeSec !== null,
    `serverSec=${serverTimeSec}`,
  );
  record(
    'live: JWT iat not ahead of server (|skew| <= 5s)',
    iatMinusServer !== null && Math.abs(iatMinusServer) <= 5,
    `iatMinusServerSec=${iatMinusServer}`,
  );

  const restProbe = await client.from('profiles').select('id', { head: true, count: 'exact' });
  record(
    'live: authenticated REST accepts fresh JWT',
    !restProbe.error,
    restProbe.error?.code ?? restProbe.error?.message ?? 'ok',
  );

  const refresh = await client.auth.refreshSession();
  const refreshedClaims = refresh.data.session
    ? decodeJwtTimingClaims(refresh.data.session.access_token)
    : null;
  const refreshedServerSec = await fetchServerTimeSec(supabaseUrl, supabaseAnonKey);
  const refreshedSkew =
    refreshedClaims?.iat !== null && refreshedServerSec !== null
      ? refreshedClaims.iat - refreshedServerSec
      : null;

  console.log(
    `INFO - post-refresh: iat=${refreshedClaims?.iat} serverSec=${refreshedServerSec} iatMinusServerSec=${refreshedSkew}`,
  );

  record(
    'live: refreshSession mints non-future iat',
    refreshedSkew !== null && refreshedSkew <= 5,
    `iatMinusServerSec=${refreshedSkew}`,
  );

  await client.auth.signOut();
}

async function runDeviceMatrix() {
  let adbOutput = '';
  try {
    const { stdout } = await execFile('adb', ['devices'], { timeout: 10_000 });
    adbOutput = stdout;
  } catch {
    recordStatus('device: adb available', 'BLOCKED', 'adb not found');
    return;
  }

  const devices = adbOutput
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('\tdevice'));

  if (devices.length === 0) {
    recordStatus('device: physical Android connected', 'BLOCKED', 'no adb device');
    recordStatus('device: PGRST303 reproduction matrix', 'BLOCKED', 'requires device');
    return;
  }

  record('device: physical Android connected', true, `${devices.length} device(s)`);
  recordStatus(
    'device: PGRST303 reproduction matrix',
    'BLOCKED',
    'manual lifecycle matrix required on device',
  );
}

function summarize() {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const blocked = results.filter((r) => r.status === 'BLOCKED').length;
  console.log(`\nSummary: ${pass} PASS, ${fail} FAIL, ${blocked} BLOCKED`);
  if (fail > 0) {
    process.exit(1);
  }
}

await runLiveJwtTimingChecks();
await runDeviceMatrix();
summarize();
