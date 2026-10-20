/**
 * Save a PNG from `adb exec-out screencap -p` (binary-safe on Windows).
 * Usage: node scripts/capture-adb-screenshot.mjs <output.png> [adb-serial]
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const outPath = process.argv[2];
const serial = process.argv[3];

if (!outPath) {
  console.error('Usage: node scripts/capture-adb-screenshot.mjs <output.png> [serial]');
  process.exit(1);
}

mkdirSync(dirname(outPath), { recursive: true });

const adbArgs = serial ? ['-s', serial, 'exec-out', 'screencap', '-p'] : ['exec-out', 'screencap', '-p'];
const png = execFileSync('adb', adbArgs, { maxBuffer: 30 * 1024 * 1024 });

if (png.length < 50_000) {
  console.warn(`WARN: small PNG (${png.length} bytes) — may be black or lock screen`);
}

const sig = png.subarray(0, 8);
const isPng =
  sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47;
if (!isPng) {
  console.error('FAIL: output is not a PNG');
  process.exit(2);
}

writeFileSync(outPath, png);
console.log(`OK ${outPath} (${png.length} bytes)`);
