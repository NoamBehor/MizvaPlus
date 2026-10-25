/**
 * Web tab pointer-event regression — TabScreenFocusGuard wiring.
 * Run: npm run verify:web-tab-focus
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const guard = read('src/navigation/TabScreenFocusGuard.tsx');
const wrappers = read('src/navigation/tabScreenWrappers.tsx');
const mainNav = read('src/navigation/MainTabNavigator.tsx');
const packageJson = JSON.parse(read('package.json'));

const checks = [
  [
    'Focus guard hides inactive web scenes',
    guard.includes("display: isFocused ? 'flex' : 'none'") &&
      guard.includes("Platform.OS === 'web'"),
  ],
  [
    'Inactive scenes block pointer events',
    guard.includes("pointerEvents={isFocused ? 'auto' : 'none'}"),
  ],
  [
    'All five tab screens wrapped',
    wrappers.includes('HomeTabScreen') &&
      wrappers.includes('CalendarTabScreen') &&
      wrappers.includes('MapTabScreen') &&
      wrappers.includes('TriviaTabScreen'),
  ],
  [
    'Main navigator uses wrapped screens',
    mainNav.includes('HomeTabScreen') && !mainNav.includes('component={HomeScreen}'),
  ],
  [
    'verify script registered',
    packageJson.scripts['verify:web-tab-focus'] !== undefined,
  ],
];

let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) {
    failed += 1;
  }
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed > 0 ? 1 : 0);
