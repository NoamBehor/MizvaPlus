/**
 * Google Play release preflight — runs automated checks for store submission.
 * Run: node scripts/verify-play-preflight.mjs
 *
 * Manual steps (not automated here):
 * - eas build --platform android --profile production
 * - eas submit --platform android --profile production (or upload AAB in Play Console)
 * - Play Console: Data Safety, Content Rating, Target Audience, App Access
 * - Install internal testing build on a physical device (e.g. OnePlus)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const steps = [];

function runStep(name, script) {
  try {
    execFileSync('node', [join(root, script)], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    steps.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    const output =
      (error.stdout ?? '') + (error.stderr ?? '') || error.message || 'failed';
    steps.push({ name, status: 'fail', detail: output.trim().split('\n').slice(-3).join(' ') });
    console.error(`FAIL ${name}`);
    console.error(output.trim());
  }
}

function checkFile(name, relativePath) {
  if (existsSync(join(root, relativePath))) {
    steps.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
    return;
  }
  steps.push({ name, status: 'fail', detail: `${relativePath} missing` });
  console.error(`FAIL ${name}: ${relativePath} missing`);
}

console.log('Play preflight — automated checks\n');

runStep('play config', 'scripts/verify-play-config.mjs');
runStep('play legal', 'scripts/verify-play-legal.mjs');
runStep('play listing', 'scripts/verify-play-listing.mjs');
runStep('account deletion (static + live)', 'scripts/verify-account-deletion.mjs');
runStep('sprint production', 'scripts/verify-sprint-production.mjs');
runStep('typecheck', 'scripts/verify-typecheck.mjs');

checkFile('data safety manifest', 'store/play/data-safety.json');

if (existsSync(join(root, 'android/app/src/main/AndroidManifest.xml'))) {
  runStep('play manifest', 'scripts/verify-play-manifest.mjs');
} else {
  steps.push({
    name: 'play manifest',
    status: 'skip',
    detail: 'run: npx expo prebuild --platform android',
  });
  console.log('SKIP play manifest (no android/ — run expo prebuild)');
}

if (existsSync(join(root, 'secrets/app-release.aab'))) {
  runStep('play aab', 'scripts/verify-play-aab.mjs');
} else {
  steps.push({
    name: 'play aab',
    status: 'skip',
    detail: 'run EAS production build and save secrets/app-release.aab',
  });
  console.log('SKIP play aab (secrets/app-release.aab missing)');
}

const outDir = join(root, 'docs/play');
mkdirSync(outDir, { recursive: true });
const resultPath = join(outDir, 'preflight-result.json');
writeFileSync(
  resultPath,
  JSON.stringify({ generatedAt: new Date().toISOString(), steps }, null, 2),
  'utf8',
);

const failed = steps.filter((step) => step.status === 'fail');
const skipped = steps.filter((step) => step.status === 'skip');

console.log(`\n${steps.length - failed.length}/${steps.length} steps ok (${skipped.length} skipped)`);
console.log(`Wrote ${resultPath}`);

if (failed.length > 0) {
  process.exit(1);
}
