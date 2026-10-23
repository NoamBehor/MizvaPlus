import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const LATITUDE = 32.17158;
const LONGITUDE = 35.01156;
const ACTIVITY = 'com.mitzvahapp.app/.MainActivity';
const AVD_NAME = 'MitzvaPlus_API36';

const TABS = {
  profile: { x: 108, y: 2260 },
  map: { x: 324, y: 2260 },
  trivia: { x: 540, y: 2260 },
  mymitzvot: { x: 756, y: 2260 },
  home: { x: 972, y: 2260 },
};

const ALIASES = {
  home: 'home',
  בית: 'home',
  mymitzvot: 'mymitzvot',
  'my-mitzvot': 'mymitzvot',
  'המצוות שלי': 'mymitzvot',
  trivia: 'trivia',
  טריוויה: 'trivia',
  map: 'map',
  מפה: 'map',
  profile: 'profile',
  פרופיל: 'profile',
};

function adbPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const candidate = path.join(
      localAppData,
      'Android',
      'Sdk',
      'platform-tools',
      'adb.exe',
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return 'adb';
}

function emulatorPath() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return null;
  }
  const candidate = path.join(
    localAppData,
    'Android',
    'Sdk',
    'emulator',
    'emulator.exe',
  );
  return existsSync(candidate) ? candidate : null;
}

const adb = adbPath();

function adbExec(args) {
  return execFileSync(adb, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function hasEmulator() {
  const listing = adbExec(['devices']);
  return /emulator-\d+\s+device/.test(listing);
}

async function waitForBoot() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (hasEmulator()) {
      try {
        const booted = adbExec(['shell', 'getprop', 'sys.boot_completed']).trim();
        if (booted === '1') {
          return;
        }
      } catch {
        // Device is not ready for shell yet.
      }
    }
    await delay(2000);
  }
  throw new Error('Emulator did not finish booting.');
}

function startEmulator() {
  const executable = emulatorPath();
  if (!executable) {
    throw new Error('Android emulator executable was not found.');
  }
  const child = spawn(executable, ['-avd', AVD_NAME], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function readUiDump() {
  adbExec(['shell', 'uiautomator', 'dump', '/sdcard/uidump.xml']);
  return adbExec(['shell', 'cat', '/sdcard/uidump.xml']);
}

function tapBounds(bounds) {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) {
    return;
  }
  const x = Math.round((Number(match[1]) + Number(match[3])) / 2);
  const y = Math.round((Number(match[2]) + Number(match[4])) / 2);
  adbExec(['shell', 'input', 'tap', String(x), String(y)]);
}

async function connectDevServerIfNeeded() {
  const deadline = Date.now() + 45_000;
  let openedServer = false;

  while (Date.now() < deadline) {
    let xml = '';
    try {
      xml = readUiDump();
    } catch {
      await delay(1500);
      continue;
    }

    if (xml.includes('Development Build') && !openedServer) {
      const server =
        xml.match(
          /text="http:\/\/[^"]+:8081"[^>]*bounds="(\[\d+,\d+\]\[\d+,\d+\])"/,
        ) ??
        xml.match(
          /text="http:\/\/[^"]+"[^>]*bounds="(\[\d+,\d+\]\[\d+,\d+\])"/,
        );
      if (server) {
        tapBounds(server[1]);
        openedServer = true;
        await delay(2000);
        continue;
      }
    }

    if (!xml.includes('Development Build') && !xml.includes('Loading from')) {
      return;
    }

    await delay(2000);
  }
}

function focusEmulatorWindow() {
  if (process.platform !== 'win32') {
    return;
  }
  const script = `
$process = Get-Process qemu-system-x86_64 -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $process -or $process.MainWindowHandle -eq 0) { exit 0 }
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class OpenAppScreenWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$handle = [IntPtr]$process.MainWindowHandle
[void][OpenAppScreenWindow]::ShowWindow($handle, 9)
[void][OpenAppScreenWindow]::SetForegroundWindow($handle)
`;
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-Command', script],
    { stdio: 'ignore' },
  );
}

async function main() {
  const requested = (process.argv[2] ?? 'home').trim().toLowerCase();
  const screen = ALIASES[requested] ?? ALIASES[process.argv[2]?.trim() ?? ''];
  if (!screen) {
    console.error(
      'Unknown screen. Use home, mymitzvot, trivia, map, or profile.',
    );
    process.exit(1);
  }

  if (!hasEmulator()) {
    console.log('Starting emulator...');
    startEmulator();
    await waitForBoot();
  }

  try {
    adbExec(['reverse', 'tcp:8081', 'tcp:8081']);
  } catch {
    // Metro can still be reached by the saved dev-server URL.
  }
  adbExec(['emu', 'geo', 'fix', String(LONGITUDE), String(LATITUDE)]);
  await delay(1000);
  adbExec(['shell', 'am', 'start', '-n', ACTIVITY]);
  await connectDevServerIfNeeded();
  await delay(1500);

  const tab = TABS[screen];
  adbExec([
    'shell',
    'input',
    'tap',
    String(tab.x),
    String(tab.y),
  ]);
  focusEmulatorWindow();
  console.log(`OPENED screen=${screen} place=Alfei Menashe`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
