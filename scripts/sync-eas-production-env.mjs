/**
 * Push required EAS "production" environment variables from local .env.
 * Never logs secret values. Skips DEV_* and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run: node scripts/sync-eas-production-env.mjs
 */
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from './lib/supabase-live-env.mjs';

const EAS_CLI = 'eas-cli@24.12.0';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

/** @type {{ name: string; visibility: 'plaintext' | 'sensitive' | 'secret'; required: boolean }[]} */
const SPEC = [
  { name: 'GOOGLE_MAPS_ANDROID_API_KEY', visibility: 'secret', required: true },
  { name: 'EXPO_PUBLIC_SUPABASE_URL', visibility: 'plaintext', required: true },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', visibility: 'sensitive', required: true },
  { name: 'EXPO_PUBLIC_OVERPASS_API_URL', visibility: 'plaintext', required: true },
  { name: 'EXPO_PUBLIC_PRIVACY_POLICY_URL', visibility: 'plaintext', required: true },
  { name: 'EXPO_PUBLIC_ACCOUNT_DELETION_URL', visibility: 'plaintext', required: true },
  { name: 'PLAY_SUPPORT_EMAIL', visibility: 'plaintext', required: true },
  { name: 'EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY', visibility: 'sensitive', required: false },
];

const fileEnv = loadEnvFile();
const missingRequired = [];

for (const { name, visibility, required } of SPEC) {
  const value = process.env[name] ?? fileEnv[name] ?? '';
  if (!value) {
    if (required) {
      missingRequired.push(name);
    } else {
      console.log(`SKIP optional (empty): ${name}`);
    }
    continue;
  }

  console.log(`SET ${name} (${visibility})`);
  execFileSync(
    npx,
    [
      '--yes',
      EAS_CLI,
      'env:set',
      'production',
      '--name',
      name,
      '--value',
      value,
      '--visibility',
      visibility,
      '--non-interactive',
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
}

if (missingRequired.length > 0) {
  console.error(`FAIL: missing required values in .env: ${missingRequired.join(', ')}`);
  process.exit(1);
}

console.log('PASS sync-eas-production-env');
