import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'android/app/src/main/AndroidManifest.xml');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!existsSync(manifestPath)) {
  fail('android manifest missing; run expo prebuild first');
}

const manifest = readFileSync(manifestPath, 'utf8');
const activeManifest = manifest
  .split('\n')
  .filter((line) => !line.includes('tools:node="remove"'))
  .join('\n');
const forbidden = [
  'ACCESS_BACKGROUND_LOCATION',
  'RECORD_AUDIO',
  'FOREGROUND_SERVICE_LOCATION',
  'com.google.android.gms.permission.AD_ID',
  'SYSTEM_ALERT_WINDOW',
];
for (const permission of forbidden) {
  if (activeManifest.includes(permission)) {
    fail(`manifest contains ${permission}`);
  }
}
if (!manifest.includes('ACCESS_FINE_LOCATION') || !manifest.includes('ACCESS_COARSE_LOCATION')) {
  fail('foreground location permissions missing');
}

const targetMatch = manifest.match(/android:targetSdkVersion="(\d+)"/);
const gradlePath = join(root, 'android/gradle.properties');
const buildGradlePath = join(root, 'android/app/build.gradle');
let targetSdk = targetMatch?.[1] ?? '';
if (!targetSdk && existsSync(buildGradlePath)) {
  const gradle = readFileSync(buildGradlePath, 'utf8');
  const gradleTarget = gradle.match(/targetSdkVersion\s*(?:=|\()\s*(\d+)/);
  targetSdk = gradleTarget?.[1] ?? '';
  if (!targetSdk) {
    const rootTarget = gradle.match(/targetSdkVersion\s*=\s*rootProject\.ext\.targetSdkVersion/);
    if (rootTarget && existsSync(join(root, 'android/build.gradle'))) {
      const rootGradle = readFileSync(join(root, 'android/build.gradle'), 'utf8');
      const extTarget = rootGradle.match(/targetSdkVersion\s*=\s*(\d+)/);
      targetSdk = extTarget?.[1] ?? '';
    }
  }
}
if (targetSdk !== '36') {
  const props = existsSync(gradlePath) ? readFileSync(gradlePath, 'utf8') : '';
  if (!props.includes('android.targetSdkVersion=36') && !manifest.includes('targetSdkVersion="36"')) {
    fail(`targetSdkVersion is ${targetSdk || 'missing'}`);
  }
}

console.log('PASS verify-play-manifest');
console.log(`targetSdk=${targetSdk || '36'}`);
