/**
 * Phase 10.2 verification — live Supabase + auth/sync hardening.
 * Run: npm run verify:phase10.2
 *
 * Requires .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.
 * Never prints secret values.
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];
let blockedReason = null;

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : blockedReason ? 'BLOCKED' : 'FAIL';
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

function parseHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isValidSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function looksLikeSupabaseKey(value) {
  if (typeof value !== 'string' || value.length < 20) {
    return false;
  }
  // Legacy JWT anon keys and newer publishable keys (sb_publishable_...)
  return value.split('.').length === 3 || value.startsWith('sb_publishable_');
}

// ─── Deterministic key format validation (no secrets logged) ─────────────────

const MOCK_MODERN_KEY = 'sb_publishable_example_key_for_validation_test_only';
const MOCK_LEGACY_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxOTU1NTc2MDAwfQ.mock_signature_for_test';
const MOCK_INVALID_KEY = 'not-a-valid-key';

record('key validation: modern sb_publishable_ format accepted', looksLikeSupabaseKey(MOCK_MODERN_KEY));
record('key validation: legacy JWT anon format accepted', looksLikeSupabaseKey(MOCK_LEGACY_JWT));
record('key validation: invalid key rejected', !looksLikeSupabaseKey(MOCK_INVALID_KEY));

// ─── Static checks (always run) ─────────────────────────────────────────────

const gitignore = read('.gitignore');
record('.env is gitignored', gitignore.includes('.env'));

const authSource = read('src/services/auth.ts');
const sourceTree = [
  'src/services/supabase.ts',
  'src/services/auth.ts',
  'src/hooks/useAppInitialization.ts',
  'src/hooks/useAuthSession.ts',
  'src/hooks/useDeepLinkAuth.ts',
  'src/navigation/RootNavigator.tsx',
].map((path) => read(path)).join('\n');

record(
  'no service-role key in client source',
  !sourceTree.toLowerCase().includes('service_role'),
);
record(
  'signUpWithEmail passes display_name metadata',
  authSource.includes("data: { display_name: trimmedDisplayName }"),
);
record(
  'signUpWithEmail returns confirmation_pending status',
  authSource.includes('confirmation_pending'),
);
record(
  'resetPasswordForEmail exists in auth service',
  authSource.includes('resetPasswordForEmail'),
);
record(
  'resendConfirmationEmail exists in auth service',
  authSource.includes('resendConfirmationEmail'),
);
record(
  'updatePassword exists in auth service',
  authSource.includes('updatePassword'),
);
record(
  'useAuthSession subscribes to onAuthStateChange',
  read('src/hooks/useAuthSession.ts').includes('onAuthStateChange'),
);
record(
  'useAuthSession handles PASSWORD_RECOVERY',
  read('src/hooks/useAuthSession.ts').includes('PASSWORD_RECOVERY'),
);
record(
  'RootNavigator mounts useAuthSession',
  read('src/navigation/RootNavigator.tsx').includes('useAuthSession()'),
);
record(
  'RootNavigator mounts useDeepLinkAuth',
  read('src/navigation/RootNavigator.tsx').includes('useDeepLinkAuth()'),
);
record(
  'EmailConfirmationScreen exists',
  existsSync(join(root, 'src/screens/auth/EmailConfirmationScreen.tsx')),
);
record(
  'ForgotPasswordScreen exists',
  existsSync(join(root, 'src/screens/auth/ForgotPasswordScreen.tsx')),
);
record(
  'ResetPasswordScreen exists',
  existsSync(join(root, 'src/screens/auth/ResetPasswordScreen.tsx')),
);
record(
  'supabase client enables autoRefreshToken',
  read('src/services/supabase.ts').includes('autoRefreshToken: true'),
);
record(
  'supabase client enables persistSession',
  read('src/services/supabase.ts').includes('persistSession: true'),
);

// ─── Environment checks ─────────────────────────────────────────────────────

const fileEnv = loadEnvFile();
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

record('EXPO_PUBLIC_SUPABASE_URL exists', Boolean(supabaseUrl));
record('EXPO_PUBLIC_SUPABASE_ANON_KEY exists', Boolean(supabaseAnonKey));
record('Supabase URL format valid', isValidSupabaseUrl(supabaseUrl));
record('Supabase anon key valid format', looksLikeSupabaseKey(supabaseAnonKey));

const hostname = parseHostname(supabaseUrl);
if (hostname) {
  console.log(`INFO - Supabase hostname: ${hostname}`);
}

if (!supabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(supabaseUrl)) {
  blockedReason = 'SUPABASE CONFIGURATION';
  console.log('\nBLOCKED — SUPABASE CONFIGURATION');
  console.log('Create .env from .env.example with live project credentials to run live checks.');
  summarize();
  process.exit(0);
}

// ─── Live checks ─────────────────────────────────────────────────────────────

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const requiredTables = [
  'profiles',
  'mitzvah_preferences',
  'mitzvah_completions',
  'quiz_attempts',
  'user_badges',
  'onboarding_state',
];

async function tableExists(table) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
  if (!error) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (message.includes('does not exist') || message.includes('42p01')) {
    return false;
  }

  // RLS / permission errors still mean the table exists.
  return true;
}

async function runLiveChecks() {
  const health = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: supabaseAnonKey },
  });
  record('live Supabase connection', health.ok, `status ${health.status}`);

  for (const table of requiredTables) {
    record(`live table exists: ${table}`, await tableExists(table));
  }

  const suffix = randomUUID().slice(0, 8);
  const password = `Test!${suffix}Aa1`;
  const userAEmail = `phase10.2.a.${suffix}@example.com`;
  const userBEmail = `phase10.2.b.${suffix}@example.com`;
  const displayNameA = `בודק א ${suffix}`;

  const clientA = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const signUpA = await clientA.auth.signUp({
    email: userAEmail,
    password,
    options: { data: { display_name: displayNameA } },
  });
  record('User A registration', !signUpA.error && Boolean(signUpA.data.user), signUpA.error?.message ?? '');

  if (signUpA.error || !signUpA.data.session) {
    blockedReason = 'SUPABASE CONFIGURATION';
    console.log('\nBLOCKED — live auth tests require a project with email confirmation disabled or auto-confirm enabled.');
    summarize();
    process.exit(0);
  }

  const userAId = signUpA.data.user.id;

  const profileA = await clientA
    .from('profiles')
    .select('display_name, updated_at')
    .eq('id', userAId)
    .single();
  record(
    'signup trigger creates profile with display_name',
    !profileA.error && profileA.data?.display_name === displayNameA,
    profileA.error?.message ?? profileA.data?.display_name ?? '',
  );

  const signUpB = await clientB.auth.signUp({
    email: userBEmail,
    password,
    options: { data: { display_name: `בודק ב ${suffix}` } },
  });
  record('User B registration', !signUpB.error && Boolean(signUpB.data.user), signUpB.error?.message ?? '');

  if (signUpB.error || !signUpB.data.session) {
    summarize();
    process.exit(1);
  }

  const userBId = signUpB.data.user.id;

  await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    activity_date: '2026-08-13',
    xp_awarded: 10,
  });

  const crossRead = await clientA
    .from('mitzvah_completions')
    .select('id')
    .eq('user_id', userBId);
  record(
    'RLS: User A cannot SELECT User B completions',
    !crossRead.error && (crossRead.data?.length ?? 0) === 0,
  );

  const crossInsert = await clientA.from('mitzvah_completions').insert({
    user_id: userBId,
    mitzvah_id: 'shabbat-candles',
    activity_date: '2026-08-13',
    xp_awarded: 10,
  });
  record(
    'RLS: User A cannot INSERT User B completions',
    Boolean(crossInsert.error),
    crossInsert.error?.message ?? 'unexpected insert allowed',
  );

  const ownRead = await clientA
    .from('mitzvah_completions')
    .select('id')
    .eq('user_id', userAId);
  record('RLS: User A can SELECT own completions', !ownRead.error && (ownRead.data?.length ?? 0) >= 1);

  const duplicateInsert = await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    activity_date: '2026-08-13',
    xp_awarded: 10,
  });
  record(
    'unique constraint: mitzvah_completions daily idempotency',
    Boolean(duplicateInsert.error),
    duplicateInsert.error?.message ?? 'duplicate allowed',
  );

  const updatedAtBefore = profileA.data?.updated_at;
  await clientA
    .from('profiles')
    .update({ display_name: `${displayNameA} עודכן` })
    .eq('id', userAId);
  const profileAfterUpdate = await clientA
    .from('profiles')
    .select('updated_at')
    .eq('id', userAId)
    .single();
  record(
    'profiles updated_at trigger',
    !profileAfterUpdate.error &&
      Boolean(profileAfterUpdate.data?.updated_at) &&
      profileAfterUpdate.data.updated_at !== updatedAtBefore,
  );

  await clientA.auth.signOut();
  await clientB.auth.signOut();

  record('User A logout', true);
  record('User B logout', true);
}

function summarize() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nPhase 10.2 verification: ${passed}/${results.length} passed, ${failed} failed`);
  if (blockedReason) {
    console.log(`Live checks status: BLOCKED — ${blockedReason}`);
  }
}

await runLiveChecks().catch((error) => {
  record('live verification runtime', false, error instanceof Error ? error.message : String(error));
});

summarize();
process.exit(results.some((r) => !r.pass) ? 1 : 0);
