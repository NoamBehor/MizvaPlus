/**
 * RTL layout conventions — regression checks.
 * Run: npm run verify:ui-rtl
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

const results = [];
function record(name, pass) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
}

const screenContainer = read('src/components/common/ScreenContainer.tsx');
const progressBar = read('src/components/common/ProgressBar.tsx');
const podcastProgress = read('src/components/podcast/PodcastProgressBar.tsx');
const appTsx = read('App.tsx');
const theme = read('src/constants/theme.ts');
const packageJson = JSON.parse(read('package.json'));

record(
  'ScreenContainer does not force CSS direction (avoids progress side-effects)',
  !screenContainer.includes("direction: 'rtl'"),
);
record(
  'ProgressBar track uses LTR fill direction',
  progressBar.includes("direction: 'ltr'"),
);
record(
  'Podcast progress track uses LTR',
  podcastProgress.includes("direction: 'ltr'"),
);
record(
  'Web document dir=rtl applied in App',
  appTsx.includes("setAttribute('dir', 'rtl')"),
);
record(
  'App root applies layout direction for RTL flex',
  appTsx.includes('appRootLayoutStyle'),
);
const layoutDir = read('src/constants/layoutDirection.ts');
record(
  'Layout direction constant defines app root style',
  layoutDir.includes("direction:") && layoutDir.includes('appRootLayoutStyle'),
);
record(
  'Typography tokens include RTL text alignment',
  theme.includes("writingDirection: 'rtl'"),
);
record(
  'verify script registered',
  packageJson.scripts['verify:ui-rtl'] !== undefined,
);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
