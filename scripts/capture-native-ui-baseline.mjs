/**
 * Native Android baseline: Home + Map (requires adb device, unlocked screen).
 * Usage: node scripts/capture-native-ui-baseline.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'docs/qa-screenshots/baseline');
const pkg = 'com.mitzvahapp.app';

function adb(args, opts = {}) {
  return execFileSync('adb', args, { encoding: opts.binary ? undefined : 'utf8', ...opts });
}

function getSerial() {
  const out = adb(['devices', '-l']);
  const line = out
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('List') && l.includes('device'));
  if (!line) return null;
  return line.split(/\s+/)[0];
}

function capturePng(serial, dest) {
  const png = execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], {
    maxBuffer: 30 * 1024 * 1024,
  });
  writeFileSync(dest, png);
  return png.length;
}

function dumpUi(serial) {
  adb(['-s', serial, 'shell', 'uiautomator', 'dump', '/sdcard/mp_ui.xml']);
  return adb(['-s', serial, 'shell', 'cat', '/sdcard/mp_ui.xml']);
}

function tapByText(serial, xml, label) {
  const re = new RegExp(
    `text="${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return false;
  const x = Math.floor((Number(m[1]) + Number(m[3])) / 2);
  const y = Math.floor((Number(m[2]) + Number(m[4])) / 2);
  adb(['-s', serial, 'shell', 'input', 'tap', String(x), String(y)]);
  return true;
}

function wakeAndUnlock(serial) {
  adb(['-s', serial, 'shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
  adb(['-s', serial, 'shell', 'input', 'keyevent', '82']);
  adb(['-s', serial, 'shell', 'wm', 'dismiss-keyguard']);
  adb(['-s', serial, 'shell', 'input', 'swipe', '540', '2100', '540', '900', '400']);
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  const serial = getSerial();
  if (!serial) {
    console.error('BLOCKED: no adb device — enable USB or wireless debugging and retry.');
    process.exit(1);
  }

  const model = adb(['-s', serial, 'shell', 'getprop', 'ro.product.model']).trim();
  const meta = { serial, model, capturedAt: new Date().toISOString(), projectRoot: root };

  console.log(`Device: ${model} (${serial})`);
  adb(['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
  adb(['-s', serial, 'reverse', 'tcp:8082', 'tcp:8082']);

  wakeAndUnlock(serial);
  adb(['-s', serial, 'shell', 'am', 'force-stop', pkg]);
  spawnSync('adb', ['-s', serial, 'shell', 'am', 'start', '-n', `${pkg}/.MainActivity`], {
    stdio: 'inherit',
  });
  await sleep(12_000);

  let xml = dumpUi(serial);
  if (!xml.includes(pkg)) {
    console.warn('WARN: app package not in UI tree — lock screen or launcher may be foreground');
    wakeAndUnlock(serial);
    await sleep(2000);
    xml = dumpUi(serial);
  }

  const slug = model.replace(/\s+/g, '-');
  const homePath = join(outDir, `home-native-android-${slug}.png`);
  const homeBytes = capturePng(serial, homePath);
  meta.home = { path: homePath, bytes: homeBytes, valid: homeBytes > 80_000 };

  if (!tapByText(serial, xml, 'מפה')) {
    console.warn('WARN: could not find tab "מפה" — coordinate fallback');
    adb(['-s', serial, 'shell', 'input', 'tap', '324', '2280']);
  }
  await sleep(6000);

  const mapPath = join(outDir, `map-native-android-${slug}.png`);
  const mapBytes = capturePng(serial, mapPath);
  meta.map = { path: mapPath, bytes: mapBytes, valid: mapBytes > 80_000 };

  meta.appInUiTree = xml.includes(pkg);
  writeFileSync(join(outDir, 'baseline-meta.json'), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta, null, 2));

  if (!meta.home.valid || !meta.map.valid) {
    console.error('FAIL: capture too small — unlock device and keep app in foreground.');
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
