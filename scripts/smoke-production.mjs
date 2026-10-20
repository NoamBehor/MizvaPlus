/**
 * Production smoke checks (network): Supabase reachability, legal URLs, Overpass.
 * Does not print keys or tokens.
 *
 * Run: node scripts/smoke-production.mjs
 */
import { isValidSupabaseUrl, loadEnvFile, resolveEnv } from './lib/supabase-live-env.mjs';

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

const env = resolveEnv();
if (!isValidSupabaseUrl(env.supabaseUrl)) {
  fail('invalid supabase url');
}

const restProbe = await fetch(`${env.supabaseUrl}/rest/v1/`, {
  headers: {
    apikey: env.anonKey,
    Authorization: `Bearer ${env.anonKey}`,
  },
});
if (restProbe.status !== 200 && restProbe.status !== 401) {
  fail(`supabase REST probe HTTP ${restProbe.status}`);
}
console.log('PASS smoke: supabase REST reachable with anon key');

const fileEnv = loadEnvFile();
const privacy =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? fileEnv.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';
const deletion =
  process.env.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? fileEnv.EXPO_PUBLIC_ACCOUNT_DELETION_URL ?? '';

for (const [label, url] of [
  ['privacy', privacy],
  ['account-deletion', deletion],
]) {
  if (!url) {
    fail(`missing ${label} url in env`);
  }
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  if (!res.ok && res.status !== 405) {
    const getRes = await fetch(url, { redirect: 'follow' });
    if (!getRes.ok) {
      fail(`${label} url HTTP ${getRes.status}`);
    }
  }
  console.log(`PASS smoke: ${label} url reachable`);
}

const overpass = env.overpassUrl;
const smokeQuery = '[out:json][timeout:10];node(31.77,35.20,31.79,35.22)[amenity=place_of_worship];out 1;';
const overpassRes = await fetch(overpass, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'User-Agent': 'MitzvaPlus/1.0 (production-smoke; +https://mitzvahapp.app)',
  },
  body: `data=${encodeURIComponent(smokeQuery)}`,
});
if (!overpassRes.ok) {
  if (overpassRes.status === 504 || overpassRes.status === 429) {
    console.log(`WARN smoke: overpass HTTP ${overpassRes.status} (transient; endpoint reachable)`);
  } else {
    fail(`overpass HTTP ${overpassRes.status}`);
  }
} else {
  console.log('PASS smoke: overpass endpoint responds');
}

console.log('PASS smoke-production');
