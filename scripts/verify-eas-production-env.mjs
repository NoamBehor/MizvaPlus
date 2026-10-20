/**
 * Verify required variable *names* exist on EAS production (values not shown).
 * Run: node scripts/verify-eas-production-env.mjs
 */
import { execFileSync } from 'node:child_process';

const EAS_CLI = 'eas-cli@24.12.0';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const REQUIRED = [
  'GOOGLE_MAPS_ANDROID_API_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_OVERPASS_API_URL',
  'EXPO_PUBLIC_PRIVACY_POLICY_URL',
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL',
  'PLAY_SUPPORT_EMAIL',
];

const output = execFileSync(
  npx,
  ['--yes', EAS_CLI, 'env:list', '--environment', 'production'],
  { encoding: 'utf8', shell: process.platform === 'win32' },
);

const missing = REQUIRED.filter((name) => !output.includes(`${name}=`));
if (missing.length > 0) {
  console.error(`FAIL: EAS production missing: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('PASS verify-eas-production-env');
for (const name of REQUIRED) {
  console.log(`  present: ${name}`);
}
