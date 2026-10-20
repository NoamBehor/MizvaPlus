import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = join(root, 'secrets/app-release.aab');
const bundletoolPath = join(root, 'secrets/bundletool.jar');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!existsSync(bundlePath)) {
  fail('secrets/app-release.aab is missing');
}
if (!existsSync(bundletoolPath)) {
  fail('secrets/bundletool.jar is missing');
}

const manifest = execFileSync(
  'java',
  ['-jar', bundletoolPath, 'dump', 'manifest', '--bundle', bundlePath],
  { encoding: 'utf8' },
);

if (!manifest.includes('package="com.mitzvahapp.app"')) fail('package name');
if (!manifest.includes('android:targetSdkVersion="36"')) fail('targetSdkVersion');
if (!manifest.includes('android:versionName="1.0.0"')) fail('versionName');
const versionCode = manifest.match(/android:versionCode="(\d+)"/);
if (!versionCode || Number(versionCode[1]) < 1) fail('versionCode');
if (manifest.includes('android:debuggable="true"')) fail('debuggable');

const extractDir = mkdtempSync(join(tmpdir(), 'play-aab-'));
try {
  execFileSync('tar', ['-xf', bundlePath, '-C', extractDir]);
  const libraries = [];
  function walk(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith('.so')) libraries.push(path);
    }
  }
  walk(join(extractDir, 'base', 'lib'));

  /** Google Play 16 KB policy applies to 64-bit ABIs only (see Android page-sizes guide). */
  const alignmentAbis = ['arm64-v8a', 'x86_64'];

  for (const library of libraries) {
    const abiSegment = library.split(/[/\\]/).find((part) => alignmentAbis.includes(part));
    if (!abiSegment) {
      continue;
    }

    const bytes = readFileSync(library);
    if (bytes.readUInt32LE(0) !== 0x464c457f) fail(`not an ELF: ${library}`);
    if (bytes[5] !== 1) fail(`big-endian ELF is unsupported: ${library}`);
    const elfClass = bytes[4];
    const phoff = elfClass === 2 ? Number(bytes.readBigUInt64LE(32)) : bytes.readUInt32LE(28);
    const phentsize = bytes.readUInt16LE(elfClass === 2 ? 54 : 42);
    const phnum = bytes.readUInt16LE(elfClass === 2 ? 56 : 44);
    const alignOffset = elfClass === 2 ? 48 : 28;
    for (let index = 0; index < phnum; index += 1) {
      const entry = phoff + index * phentsize;
      if (bytes.readUInt32LE(entry) !== 1) continue;
      const align =
        elfClass === 2
          ? Number(bytes.readBigUInt64LE(entry + alignOffset))
          : bytes.readUInt32LE(entry + alignOffset);
      if (align < 16384) {
        fail(`16 KB alignment ${align} (${abiSegment}/${library.split(/[/\\]/).pop()})`);
      }
    }
  }
} finally {
  rmSync(extractDir, { recursive: true, force: true });
}

console.log('PASS verify-play-aab');
