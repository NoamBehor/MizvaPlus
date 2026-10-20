import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile, resolveEnv } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = resolveEnv();

function htmlPage(title, markdown) {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #FAF8F5; color: #1F2937; margin: 0; }
    main { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body><main>${escaped}</main></body>
</html>`;
}

async function ensureBucket() {
  const response = await fetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.serviceRoleKey}`,
      apikey: env.serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'legal', name: 'legal', public: true }),
  });
  if (response.ok || response.status === 409) {
    return;
  }
  const existing = await fetch(`${env.supabaseUrl}/storage/v1/bucket/legal`, {
    headers: {
      Authorization: `Bearer ${env.serviceRoleKey}`,
      apikey: env.serviceRoleKey,
    },
  });
  if (!existing.ok) {
    throw new Error(`bucket status ${response.status}`);
  }
}

async function upload(path, html) {
  const response = await fetch(`${env.supabaseUrl}/storage/v1/object/legal/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.serviceRoleKey}`,
      apikey: env.serviceRoleKey,
      'Content-Type': 'text/html; charset=utf-8',
      'x-upsert': 'true',
    },
    body: html,
  });
  if (!response.ok && response.status !== 409) {
    const update = await fetch(`${env.supabaseUrl}/storage/v1/object/legal/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.serviceRoleKey}`,
        apikey: env.serviceRoleKey,
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: html,
    });
    if (!update.ok) {
      throw new Error(`upload ${path} status ${update.status}`);
    }
  }
}

function upsertEnv(key, value) {
  const envPath = join(root, '.env');
  const current = readFileSync(envPath, 'utf8');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.endsWith('\n') ? current : `${current}\n`}${line}\n`;
  writeFileSync(envPath, next);
}

const fileEnv = loadEnvFile();
const email = process.env.PLAY_SUPPORT_EMAIL ?? fileEnv.PLAY_SUPPORT_EMAIL ?? '';
if (!email) {
  console.error('FAIL: PLAY_SUPPORT_EMAIL is required');
  process.exit(1);
}

await ensureBucket();
const privacyMd = readFileSync(join(root, 'docs/legal/privacy-policy.he.md'), 'utf8');
const deletionMd = readFileSync(join(root, 'docs/legal/account-deletion.he.md'), 'utf8');
await upload('privacy.html', htmlPage('מדיניות פרטיות', privacyMd));
await upload('account-deletion.html', htmlPage('מחיקת חשבון', deletionMd));

const privacyUrl = `${env.supabaseUrl}/storage/v1/object/public/legal/privacy.html`;
const deletionUrl = `${env.supabaseUrl}/storage/v1/object/public/legal/account-deletion.html`;
upsertEnv('EXPO_PUBLIC_PRIVACY_POLICY_URL', privacyUrl);
upsertEnv('EXPO_PUBLIC_ACCOUNT_DELETION_URL', deletionUrl);

for (const url of [privacyUrl, deletionUrl]) {
  const response = await fetch(url);
  const body = await response.text();
  if (response.status !== 200 || !body.includes(email)) {
    console.error(`FAIL: public legal page status ${response.status}`);
    process.exit(1);
  }
}

console.log('PASS publish-legal-pages');
