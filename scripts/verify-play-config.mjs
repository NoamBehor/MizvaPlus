import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function loadExpoConfig() {
  const configPath = join(root, 'app.config.js');
  delete require.cache[require.resolve(configPath)];
  return require(configPath).expo;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

process.env.DEV_TEST_EMAIL = 'dev-check@example.com';
process.env.DEV_TEST_PASSWORD = 'dev-check-password';
process.env.EAS_BUILD_PROFILE = 'production';

const production = loadExpoConfig();
if (production.extra.devTestEmail !== '' || production.extra.devTestPassword !== '') {
  fail('production extras still contain dev credentials');
}
if (production.android.package !== 'com.mitzvahapp.app') {
  fail('android package changed');
}

const buildProps = (production.plugins ?? []).find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
);
if (
  !buildProps ||
  buildProps[1]?.android?.compileSdkVersion !== 36 ||
  buildProps[1]?.android?.targetSdkVersion !== 36
) {
  fail('compileSdkVersion and targetSdkVersion must be 36');
}

delete process.env.EAS_BUILD_PROFILE;
const development = loadExpoConfig();
if (development.extra.devTestEmail !== 'dev-check@example.com') {
  fail('non-production build dropped the dev test email');
}
if (development.extra.devTestPassword !== 'dev-check-password') {
  fail('non-production build dropped the dev test password');
}

const eas = JSON.parse(readFileSync(join(root, 'eas.json'), 'utf8'));
const profile = eas.build?.production;
if (
  profile?.developmentClient !== false ||
  profile?.distribution !== 'store' ||
  profile?.environment !== 'production' ||
  profile?.autoIncrement !== true ||
  profile?.android?.buildType !== 'app-bundle'
) {
  fail('production EAS profile is incomplete');
}

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
for (const entry of [
  'secrets/',
  'android/',
  'ios/',
  'google-services.json',
  '*.keystore',
  'docs/play/preflight-result.json',
]) {
  if (!gitignore.includes(entry)) {
    fail(`gitignore missing ${entry}`);
  }
}

console.log('PASS verify-play-config');
