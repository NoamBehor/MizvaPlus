/**
 * Verify local .env + app.config.js production behavior without printing secrets.
 * Run: node scripts/verify-production-env-local.mjs
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isValidSupabaseUrl, loadEnvFile, resolveEnv } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const fileEnv = loadEnvFile();
const env = resolveEnv();

const required = [
  'GOOGLE_MAPS_ANDROID_API_KEY',
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_OVERPASS_API_URL',
  'EXPO_PUBLIC_PRIVACY_POLICY_URL',
  'EXPO_PUBLIC_ACCOUNT_DELETION_URL',
  'PLAY_SUPPORT_EMAIL',
];

for (const key of required) {
  const value = process.env[key] ?? fileEnv[key] ?? '';
  if (!value) {
    fail(`missing ${key} in .env`);
  }
}

if (!isValidSupabaseUrl(env.supabaseUrl)) {
  fail('EXPO_PUBLIC_SUPABASE_URL invalid');
}
if (!env.anonKey || env.anonKey.length < 20) {
  fail('EXPO_PUBLIC_SUPABASE_ANON_KEY missing or too short');
}

const mapsKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? fileEnv.GOOGLE_MAPS_ANDROID_API_KEY ?? '';
if (!mapsKey) {
  fail('GOOGLE_MAPS_ANDROID_API_KEY missing');
}

process.env.EAS_BUILD_PROFILE = 'production';
process.env.GOOGLE_MAPS_ANDROID_API_KEY = mapsKey;
process.env.PLAY_SUPPORT_EMAIL = process.env.PLAY_SUPPORT_EMAIL ?? fileEnv.PLAY_SUPPORT_EMAIL ?? '';

const configPath = join(root, 'app.config.js');
delete require.cache[require.resolve(configPath)];
const expo = require(configPath).expo;

if (!expo.extra.googleMapsAndroidConfigured) {
  fail('app.config extra.googleMapsAndroidConfigured is false');
}
const mapsPlugin = (expo.plugins ?? []).find(
  (p) => Array.isArray(p) && p[0] === 'react-native-maps',
);
if (!mapsPlugin?.[1]?.androidGoogleMapsApiKey) {
  fail('react-native-maps plugin missing androidGoogleMapsApiKey');
}
if (expo.extra.devTestEmail !== '' || expo.extra.devTestPassword !== '') {
  fail('production profile still exposes dev test credentials in extra');
}
if (!expo.extra.playSupportEmail) {
  fail('playSupportEmail empty in production extra');
}

console.log('PASS verify-production-env-local');
console.log(`  supabase host: ${new URL(env.supabaseUrl).host}`);
console.log(`  maps plugin: configured`);
console.log(`  anon key length: ${env.anonKey.length}`);
