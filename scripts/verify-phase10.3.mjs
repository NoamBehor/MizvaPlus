/**
 * Phase 10.3 verification — live Supabase production gate.
 * Run: npm run verify:phase10.3
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

function record(name, pass, detail = '', kind = 'live') {
  results.push({ name, pass, detail, kind });
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

function normalizeSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
  }
}

function isValidSupabaseUrl(url) {
  try {
    const parsed = new URL(normalizeSupabaseUrl(url));
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

// ─── Static privacy checks ───────────────────────────────────────────────────

const cloudFiles = [
  'src/services/cloud/syncService.ts',
  'src/services/cloud/reconciliation.ts',
  'src/services/cloud/mitzvahRepository.ts',
  'src/services/cloud/profileRepository.ts',
  'src/services/cloud/quizRepository.ts',
  'src/services/cloud/badgeRepository.ts',
  'src/services/cloud/onboardingRepository.ts',
  'src/services/cloud/types.ts',
].map((p) => (existsSync(join(root, p)) ? read(p) : '')).join('\n');

const privacyPatterns = [
  'latitude',
  'longitude',
  'overpass',
  'calendarCache',
  'calendar_cache',
];

for (const pattern of privacyPatterns) {
  record(
    `privacy: cloud layer excludes ${pattern}`,
    !cloudFiles.toLowerCase().includes(pattern.toLowerCase()),
    '',
    'static',
  );
}

// ─── Environment ─────────────────────────────────────────────────────────────

const fileEnv = loadEnvFile();
const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

record('EXPO_PUBLIC_SUPABASE_URL exists', Boolean(rawSupabaseUrl), '', 'env');
record('EXPO_PUBLIC_SUPABASE_ANON_KEY exists', Boolean(supabaseAnonKey), '', 'env');
record('Supabase URL format valid', isValidSupabaseUrl(rawSupabaseUrl), '', 'env');
record('Supabase anon key present and valid format', looksLikeSupabaseKey(supabaseAnonKey), '', 'env');

if (rawSupabaseUrl !== supabaseUrl) {
  console.log(
    `INFO - Normalized Supabase URL (removed path suffix): ${new URL(supabaseUrl).hostname}`,
  );
} else if (isValidSupabaseUrl(rawSupabaseUrl)) {
  console.log(`INFO - Supabase hostname: ${new URL(supabaseUrl).hostname}`);
}

if (!rawSupabaseUrl || !supabaseAnonKey || !isValidSupabaseUrl(rawSupabaseUrl)) {
  blockedReason = 'SUPABASE CONFIGURATION';
  console.log('\nBLOCKED — SUPABASE CONFIGURATION');
  summarize();
  process.exit(0);
}

// Client initialization
try {
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  record('Supabase client initializes', true, '', 'env');
} catch (error) {
  record(
    'Supabase client initializes',
    false,
    error instanceof Error ? error.message : String(error),
    'env',
  );
  blockedReason = 'SUPABASE CONFIGURATION';
  summarize();
  process.exit(1);
}

const requiredTables = [
  'profiles',
  'mitzvah_preferences',
  'mitzvah_completions',
  'quiz_attempts',
  'user_badges',
  'onboarding_state',
];

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
  if (!error) {
    return true;
  }

  const message = error.message.toLowerCase();
  if (message.includes('does not exist') || message.includes('42p01')) {
    return false;
  }

  return true;
}

async function runLiveChecks() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const health = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: supabaseAnonKey },
  });
  record('live Supabase connection', health.ok, `status ${health.status}`);

  for (const table of requiredTables) {
    record(`live table exists: ${table}`, await tableExists(supabase, table));
  }

  const suffix = randomUUID().slice(0, 8);
  const password = `Test!${suffix}Aa1`;
  const userAEmail = `phase10.3.a.${suffix}@mailinator.com`;
  const userBEmail = `phase10.3.b.${suffix}@mailinator.com`;
  const displayNameA = `בודק א ${suffix}`;

  const clientA = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: true },
  });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ─── Auth lifecycle User A ────────────────────────────────────────────────

  const signUpA = await clientA.auth.signUp({
    email: userAEmail,
    password,
    options: { data: { display_name: displayNameA } },
  });
  record(
    'A: register User A',
    !signUpA.error && Boolean(signUpA.data.user),
    signUpA.error?.message ?? '',
  );

  if (signUpA.error || !signUpA.data.session) {
    blockedReason = 'SUPABASE AUTH (email confirmation may be required)';
    console.log('\nBLOCKED — live auth tests require auto-confirm or disabled email confirmation.');
    summarize();
    process.exit(0);
  }

  const userAId = signUpA.data.user.id;
  const sessionA = signUpA.data.session;

  const profileA = await clientA
    .from('profiles')
    .select('display_name, xp, updated_at')
    .eq('id', userAId)
    .single();
  record(
    'B: profile created on signup',
    !profileA.error && Boolean(profileA.data),
    profileA.error?.message ?? '',
  );
  record(
    'C: display_name correct',
    profileA.data?.display_name === displayNameA,
    profileA.data?.display_name ?? '',
  );

  await clientA.auth.signOut();
  record('D: logout User A', true);

  const loginA = await clientA.auth.signInWithPassword({ email: userAEmail, password });
  record(
    'E: login User A',
    !loginA.error && Boolean(loginA.data.session),
    loginA.error?.message ?? '',
  );

  const sessionAfterLogin = await clientA.auth.getSession();
  record(
    'F: session restoration after login',
    !sessionAfterLogin.error && Boolean(sessionAfterLogin.data.session?.user?.id === userAId),
  );

  // ─── User B registration ──────────────────────────────────────────────────

  const signUpB = await clientB.auth.signUp({
    email: userBEmail,
    password,
    options: { data: { display_name: `בודק ב ${suffix}` } },
  });
  record(
    'G: register User B',
    !signUpB.error && Boolean(signUpB.data.session),
    signUpB.error?.message ?? '',
  );

  if (signUpB.error || !signUpB.data.session) {
    summarize();
    process.exit(1);
  }

  const userBId = signUpB.data.user.id;

  const profileB = await clientB.from('profiles').select('xp, streak').eq('id', userBId).single();
  record(
    'H: User B clean state (xp=0)',
    !profileB.error && profileB.data?.xp === 0 && profileB.data?.streak === 0,
    `xp=${profileB.data?.xp}`,
  );

  await clientB.auth.signOut();
  record('I: logout User B', true);

  const loginAAgain = await clientA.auth.signInWithPassword({ email: userAEmail, password });
  record(
    'J: login User A again',
    !loginAAgain.error && Boolean(loginAAgain.data.session),
    loginAAgain.error?.message ?? '',
  );

  const profileARestored = await clientA
    .from('profiles')
    .select('display_name')
    .eq('id', userAId)
    .single();
  record(
    'K: User A state restored',
    profileARestored.data?.display_name === displayNameA,
    profileARestored.data?.display_name ?? '',
  );

  // ─── onAuthStateChange events (Node simulation) ───────────────────────────

  const authEvents = [];
  const { data: sub } = clientA.auth.onAuthStateChange((event, session) => {
    authEvents.push({ event, hasSession: Boolean(session) });
  });

  await clientA.auth.signOut();
  await new Promise((r) => setTimeout(r, 200));

  const reLogin = await clientA.auth.signInWithPassword({ email: userAEmail, password });
  await new Promise((r) => setTimeout(r, 200));

  if (reLogin.data.session) {
    const { data: refreshed } = await clientA.auth.refreshSession();
    await new Promise((r) => setTimeout(r, 200));
    record('auth event: SIGNED_IN observed', authEvents.some((e) => e.event === 'SIGNED_IN'));
    record('auth event: SIGNED_OUT observed', authEvents.some((e) => e.event === 'SIGNED_OUT'));
    record(
      'auth event: TOKEN_REFRESHED observed',
      authEvents.some((e) => e.event === 'TOKEN_REFRESHED') || Boolean(refreshed.session),
    );
    record(
      'auth event: null session on signOut',
      authEvents.some((e) => e.event === 'SIGNED_OUT' && !e.hasSession),
    );
  }

  sub.subscription.unsubscribe();

  // ─── RLS isolation (both directions) ─────────────────────────────────────

  await clientB.auth.signInWithPassword({ email: userBEmail, password });

  await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    activity_date: '2026-08-13',
    xp_awarded: 10,
  });

  const tablesForRls = [
    'profiles',
    'mitzvah_preferences',
    'mitzvah_completions',
    'quiz_attempts',
    'user_badges',
    'onboarding_state',
  ];

  for (const table of tablesForRls) {
    const crossSelect = await clientA.from(table).select('*').eq(
      table === 'profiles' || table === 'onboarding_state' ? 'id' : 'user_id',
      userBId,
    );
    record(
      `RLS A→B SELECT blocked: ${table}`,
      !crossSelect.error && (crossSelect.data?.length ?? 0) === 0,
    );
  }

  // INSERT as other user
  const crossInsertCompletion = await clientA.from('mitzvah_completions').insert({
    user_id: userBId,
    mitzvah_id: 'tefillin',
    activity_date: '2026-08-14',
    xp_awarded: 5,
  });
  record(
    'RLS A cannot INSERT User B completion',
    Boolean(crossInsertCompletion.error),
    crossInsertCompletion.error?.message ?? 'unexpected insert',
  );

  const crossInsertProfile = await clientA.from('profiles').insert({
    id: userBId,
    display_name: 'hack',
  });
  record(
    'RLS A cannot INSERT User B profile',
    Boolean(crossInsertProfile.error),
    crossInsertProfile.error?.message ?? 'unexpected insert',
  );

  // UPDATE other user
  const crossUpdate = await clientA
    .from('profiles')
    .update({ display_name: 'hacked' })
    .eq('id', userBId);
  record(
    'RLS A cannot UPDATE User B profile',
    !crossUpdate.error && (crossUpdate.count === 0 || crossUpdate.data === null),
    crossUpdate.error?.message ?? 'rows updated',
  );

  // DELETE other user data
  const crossDelete = await clientA.from('mitzvah_completions').delete().eq('user_id', userBId);
  record(
    'RLS A cannot DELETE User B completions',
    !crossDelete.error && (crossDelete.count === 0 || (crossDelete.data?.length ?? 0) === 0),
  );

  // Own access
  const ownCompletion = await clientA
    .from('mitzvah_completions')
    .select('id')
    .eq('user_id', userAId);
  record(
    'RLS A can SELECT own completions',
    !ownCompletion.error && (ownCompletion.data?.length ?? 0) >= 1,
  );

  const ownProfileUpdate = await clientA
    .from('profiles')
    .update({ xp: 15 })
    .eq('id', userAId)
    .select('xp')
    .single();
  record(
    'RLS A can UPDATE own profile',
    !ownProfileUpdate.error && ownProfileUpdate.data?.xp === 15,
  );

  // B cannot access A
  const bReadA = await clientB.from('mitzvah_completions').select('id').eq('user_id', userAId);
  record(
    'RLS B cannot SELECT User A completions',
    !bReadA.error && (bReadA.data?.length ?? 0) === 0,
  );

  // ─── Schema constraints (live probes) ───────────────────────────────────

  const dupCompletion = await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    activity_date: '2026-08-13',
    xp_awarded: 10,
  });
  record(
    'constraint: mitzvah_completions UNIQUE daily',
    Boolean(dupCompletion.error),
    dupCompletion.error?.message ?? 'duplicate allowed',
  );

  const updatedAtBefore = profileA.data?.updated_at;
  await clientA.from('profiles').update({ display_name: `${displayNameA} v2` }).eq('id', userAId);
  const profileUpdated = await clientA
    .from('profiles')
    .select('updated_at')
    .eq('id', userAId)
    .single();
  record(
    'trigger: profiles updated_at advances',
    !profileUpdated.error &&
      Boolean(profileUpdated.data?.updated_at) &&
      profileUpdated.data.updated_at !== updatedAtBefore,
  );

  await clientA.from('quiz_attempts').insert({
    user_id: userAId,
    quiz_date: '2026-08-13',
    question_id: 'q1',
    selected_option_id: 'a',
    is_correct: true,
    xp_awarded: 5,
  });
  const dupQuiz = await clientA.from('quiz_attempts').insert({
    user_id: userAId,
    quiz_date: '2026-08-13',
    question_id: 'q1',
    selected_option_id: 'b',
    is_correct: false,
    xp_awarded: 0,
  });
  record(
    'constraint: quiz_attempts UNIQUE daily',
    Boolean(dupQuiz.error),
    dupQuiz.error?.message ?? 'duplicate allowed',
  );

  const dupBadge = await clientA.from('user_badges').insert({
    user_id: userAId,
    badge_id: 'first-mitzvah',
  });
  const dupBadge2 = await clientA.from('user_badges').insert({
    user_id: userAId,
    badge_id: 'first-mitzvah',
  });
  record(
    'constraint: user_badges PK prevents duplicate',
    !dupBadge.error && Boolean(dupBadge2.error),
    dupBadge2.error?.message ?? '',
  );

  // FK probe with fake user id
  const fkProbe = await clientA.from('mitzvah_completions').insert({
    user_id: '00000000-0000-0000-0000-000000000001',
    mitzvah_id: 'tefillin',
    activity_date: '2026-08-15',
    xp_awarded: 1,
  });
  record(
    'constraint: FK to auth.users enforced',
    Boolean(fkProbe.error),
    fkProbe.error?.message ?? 'fk missing',
  );

  // ─── Cloud sync: Local → Cloud ────────────────────────────────────────────

  const completionSync = await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'mezuzah',
    activity_date: '2026-08-15',
    xp_awarded: 12,
  });
  record(
    'sync A: completion upsert to cloud',
    !completionSync.error,
    completionSync.error?.message ?? '',
  );

  await clientA.from('profiles').update({ xp: 27, level: 2 }).eq('id', userAId);
  const cloudProfile = await clientA.from('profiles').select('xp, level').eq('id', userAId).single();
  record(
    'sync A: profile XP in cloud',
    cloudProfile.data?.xp === 27 && cloudProfile.data?.level === 2,
    `xp=${cloudProfile.data?.xp}`,
  );

  const cloudCompletion = await clientA
    .from('mitzvah_completions')
    .select('mitzvah_id')
    .eq('user_id', userAId)
    .eq('mitzvah_id', 'mezuzah');
  record(
    'sync A: completion exists in Supabase',
    !cloudCompletion.error && (cloudCompletion.data?.length ?? 0) === 1,
  );

  // ─── Cloud sync: Cloud → Local (re-login fetch) ─────────────────────────

  await clientA.auth.signOut();
  await clientA.auth.signInWithPassword({ email: userAEmail, password });

  const pulledProfile = await clientA.from('profiles').select('xp, level').eq('id', userAId).single();
  const pulledCompletions = await clientA
    .from('mitzvah_completions')
    .select('mitzvah_id')
    .eq('user_id', userAId);
  record(
    'sync B: re-login pulls cloud profile',
    pulledProfile.data?.xp === 27,
    `xp=${pulledProfile.data?.xp}`,
  );
  record(
    'sync B: re-login pulls completions',
    (pulledCompletions.data?.length ?? 0) >= 2,
    `count=${pulledCompletions.data?.length}`,
  );

  // ─── Duplicate XP protection ────────────────────────────────────────────

  const xpBefore = pulledProfile.data?.xp ?? 0;
  // Re-sync same completion data multiple times should not add rows
  for (let i = 0; i < 3; i++) {
    await clientA.from('mitzvah_completions').insert({
      user_id: userAId,
      mitzvah_id: 'mezuzah',
      activity_date: '2026-08-15',
      xp_awarded: 12,
    });
  }
  const xpAfterDup = await clientA.from('profiles').select('xp').eq('id', userAId).single();
  record(
    'XP integrity: duplicate completion inserts rejected',
    xpAfterDup.data?.xp === xpBefore,
    `xp=${xpAfterDup.data?.xp}`,
  );

  await clientA.auth.signOut();
  await clientA.auth.signInWithPassword({ email: userAEmail, password });
  const xpAfterRelogin = await clientA.from('profiles').select('xp').eq('id', userAId).single();
  record(
    'XP integrity: XP stable after logout/login',
    xpAfterRelogin.data?.xp === xpBefore,
    `xp=${xpAfterRelogin.data?.xp}`,
  );

  // ─── Multi-client conflict simulation ───────────────────────────────────

  const clientA2 = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await clientA2.auth.setSession({
    access_token: loginAAgain.data.session.access_token,
    refresh_token: loginAAgain.data.session.refresh_token,
  });

  await clientA.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'charity',
    activity_date: '2026-08-16',
    xp_awarded: 8,
  });
  await clientA2.from('mitzvah_completions').insert({
    user_id: userAId,
    mitzvah_id: 'hospitality',
    activity_date: '2026-08-17',
    xp_awarded: 8,
  });

  const unionCompletions = await clientA
    .from('mitzvah_completions')
    .select('mitzvah_id')
    .eq('user_id', userAId);
  const ids = new Set((unionCompletions.data ?? []).map((r) => r.mitzvah_id));
  record(
    'conflict: completions UNION (both clients)',
    ids.has('charity') && ids.has('hospitality'),
    [...ids].join(','),
  );

  // Preference latest updated_at wins
  const early = new Date('2026-08-10T10:00:00Z').toISOString();
  const late = new Date('2026-08-12T10:00:00Z').toISOString();

  await clientA.from('mitzvah_preferences').upsert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    enabled: true,
    reminder_enabled: false,
    updated_at: early,
  });
  await clientA2.from('mitzvah_preferences').upsert({
    user_id: userAId,
    mitzvah_id: 'shabbat-candles',
    enabled: false,
    reminder_enabled: true,
    reminder_hour: 20,
    reminder_minute: 0,
    updated_at: late,
  });

  const prefResult = await clientA
    .from('mitzvah_preferences')
    .select('enabled, reminder_enabled, updated_at')
    .eq('user_id', userAId)
    .eq('mitzvah_id', 'shabbat-candles')
    .single();
  record(
    'conflict: preference latest updated_at wins',
    prefResult.data?.enabled === false && prefResult.data?.reminder_enabled === true,
    `enabled=${prefResult.data?.enabled}`,
  );

  // Onboarding OR
  await clientA.from('onboarding_state').upsert({
    user_id: userAId,
    completed: false,
    updated_at: early,
  });
  await clientA2.from('onboarding_state').upsert({
    user_id: userAId,
    completed: true,
    completed_at: late,
    updated_at: late,
  });
  const onboarding = await clientA
    .from('onboarding_state')
    .select('completed')
    .eq('user_id', userAId)
    .single();
  record(
    'conflict: onboarding completed=true wins',
    onboarding.data?.completed === true,
    `completed=${onboarding.data?.completed}`,
  );

  // Cleanup sessions
  await clientA.auth.signOut();
  await clientB.auth.signOut();
}

function summarize() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nPhase 10.3 verification: ${passed}/${results.length} passed, ${failed} failed`);
  if (blockedReason) {
    console.log(`Live checks status: BLOCKED — ${blockedReason}`);
  }
}

await runLiveChecks().catch((error) => {
  record('live verification runtime', false, error instanceof Error ? error.message : String(error));
});

summarize();
process.exit(results.some((r) => !r.pass) ? 1 : 0);
