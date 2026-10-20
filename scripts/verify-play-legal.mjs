import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = loadEnvFile();
const email = process.env.PLAY_SUPPORT_EMAIL ?? env.PLAY_SUPPORT_EMAIL ?? '';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!email) {
  fail('PLAY_SUPPORT_EMAIL is required');
}

const requiredFiles = [
  'docs/legal/privacy-policy.he.md',
  'docs/legal/privacy-policy.en.md',
  'docs/legal/account-deletion.he.md',
  'docs/legal/account-deletion.en.md',
];

const phrases = ['Supabase', 'מחיקת חשבון', email];
for (const relativePath of requiredFiles) {
  const body = readFileSync(join(root, relativePath), 'utf8');
  if (relativePath.endsWith('.he.md') && !body.includes('מיקום')) {
    fail(`${relativePath} missing location disclosure`);
  }
  if (relativePath.endsWith('.en.md') && !body.toLowerCase().includes('location')) {
    fail(`${relativePath} missing location disclosure`);
  }
  for (const phrase of phrases) {
    if (!body.includes(phrase)) {
      fail(`${relativePath} missing required phrase`);
    }
  }
}

const profile = readFileSync(join(root, 'src/screens/profile/ProfileScreen.tsx'), 'utf8');
const auth = readFileSync(join(root, 'src/screens/auth/AuthScreen.tsx'), 'utf8');
if (!profile.includes('LegalDocument') || !profile.includes('privacy')) {
  fail('ProfileScreen does not open the privacy document');
}
if (!auth.includes('LegalDocument') || !auth.includes('privacy')) {
  fail('AuthScreen does not open the privacy document');
}
if (!profile.includes('מחיקת חשבון')) {
  fail('ProfileScreen missing account deletion control');
}

console.log('PASS verify-play-legal');
