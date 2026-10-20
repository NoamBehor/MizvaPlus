import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAnonClient,
  createServiceClient,
  isValidSupabaseUrl,
  looksLikeServiceRoleKey,
  resolveEnv,
} from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const functionSource = readFileSync(
  join(root, 'supabase/functions/delete-account/index.ts'),
  'utf8',
);
if (!functionSource.includes("authorization.startsWith('Bearer ')")) {
  fail('delete-account does not require a bearer token');
}
if (!functionSource.includes('fulfilled_by_user_id')) {
  fail('delete-account does not clear fulfilled_by_user_id');
}
if (!functionSource.includes('deleteUser')) {
  fail('delete-account does not delete the auth user');
}

const clientSource = readFileSync(join(root, 'src/services/auth/deleteAccount.ts'), 'utf8');
if (!clientSource.includes('export async function deleteCurrentAccount')) {
  fail('deleteCurrentAccount is missing');
}

const profile = readFileSync(join(root, 'src/screens/profile/ProfileScreen.tsx'), 'utf8');
if (!profile.includes('מחיקת חשבון')) {
  fail('ProfileScreen missing מחיקת חשבון');
}

const env = resolveEnv();
if (!looksLikeServiceRoleKey(env.serviceRoleKey) || !isValidSupabaseUrl(env.supabaseUrl)) {
  console.log('PASS verify-account-deletion');
  console.log('SKIP live: no service role');
  process.exit(0);
}

const admin = createServiceClient(env);
const anon = createAnonClient(env);
const stamp = Date.now();
const email = `play-delete-${stamp}@example.com`;
const password = `PlayDelete-${stamp}-Aa1`;

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createError || !created.user) {
  const detail = createError?.message ? `: ${createError.message}` : '';
  fail(`could not create throwaway user${detail}`);
}

const userId = created.user.id;
try {
  const { data: signedIn, error: signInError } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signedIn.session) {
    fail('throwaway sign-in failed');
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${signedIn.session.access_token}`,
      apikey: env.anonKey,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 404) {
    await admin.auth.admin.deleteUser(userId);
    console.log('PASS verify-account-deletion');
    console.log('SKIP live: delete-account function is not deployed');
    process.exit(0);
  }

  if (!response.ok) {
    fail(`delete-account returned ${response.status}`);
  }

  const body = await response.json();
  if (body.deleted !== true) {
    fail('delete-account did not return deleted true');
  }

  const { data: after, error: afterError } = await admin.auth.admin.getUserById(userId);
  if (!afterError && after?.user) {
    fail('auth user still exists after deletion');
  }
} catch (error) {
  await admin.auth.admin.deleteUser(userId);
  fail(error instanceof Error ? error.message : 'live deletion failed');
}

console.log('PASS verify-account-deletion');
