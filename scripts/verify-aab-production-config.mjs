/**
 * Verify a production AAB contains Maps manifest meta-data and bundled public config.
 * Expects secrets/app-release.aab and reads expected host from .env (no secret echo).
 *
 * Run: node scripts/verify-aab-production-config.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadEnvFile, resolveEnv } from './lib/supabase-live-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(root, 'secrets/app-release.aab');
const bundletoolPath = join(root, 'secrets/bundletool.jar');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  fail('secrets/app-release.aab missing — download with eas build:download');
}

const fileEnv = loadEnvFile();
const env = resolveEnv();
const supabaseHost = new URL(env.supabaseUrl).host;
const privacyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? fileEnv.EXPO_PUBLIC_PRIVACY_POLICY_URL ?? '';
const privacyHost = privacyUrl ? new URL(privacyUrl).host : '';

if (existsSync(bundletoolPath)) {
  const manifest = execFileSync(
    'java',
    ['-jar', bundletoolPath, 'dump', 'manifest', '--bundle', bundlePath],
    { encoding: 'utf8' },
  );
  if (!manifest.includes('com.google.android.geo.API_KEY')) {
    fail('AndroidManifest missing com.google.android.geo.API_KEY');
  }
  if (!manifest.includes('package="com.mitzvahapp.app"')) {
    fail('package name');
  }
  console.log('PASS aab manifest: Google Maps API_KEY meta-data present');
} else {
  console.log('SKIP bundletool manifest check (secrets/bundletool.jar missing)');
}

const extractDir = mkdtempSync(join(tmpdir(), 'aab-config-'));
try {
  execFileSync('tar', ['-xf', bundlePath, '-C', extractDir], { stdio: 'pipe' });

  const needles = [supabaseHost];
  if (privacyHost) {
    needles.push(privacyHost);
  }

  let bundleText = '';
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (
        entry.endsWith('.bundle') ||
        entry.endsWith('.hbc') ||
        entry === 'index.android.bundle'
      ) {
        bundleText += readFileSync(path, 'latin1');
      }
    }
  }
  walk(join(extractDir, 'base'));

  if (!bundleText) {
    fail('no JS bundle found inside AAB');
  }

  for (const needle of needles) {
    if (!bundleText.includes(needle)) {
      fail(`bundle missing expected host string: ${needle}`);
    }
  }
  console.log(`PASS aab bundle: contains supabase host (${supabaseHost})`);
  if (privacyHost) {
    console.log(`PASS aab bundle: contains privacy policy host (${privacyHost})`);
  }
} finally {
  rmSync(extractDir, { recursive: true, force: true });
}

console.log('PASS verify-aab-production-config');
