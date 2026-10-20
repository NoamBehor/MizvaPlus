/**
 * Podcast download service verification (structure + platform guards).
 * Run: npm run verify:podcast-download
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

console.log('Podcast download verification\n=============================\n');

const downloadSrc = read('src/services/podcast/parashaPodcastDownload.ts');
const hookSrc = read('src/hooks/useParashaPodcast.ts');
const storageSrc = read('src/services/podcast/parashaPodcastStorage.ts');
const packageJson = JSON.parse(read('package.json'));

record(
  'Uses expo-file-system legacy API',
  downloadSrc.includes("from 'expo-file-system/legacy'"),
);
record(
  'Direct expo-file-system dependency',
  Object.prototype.hasOwnProperty.call(packageJson.dependencies, 'expo-file-system'),
);
record(
  'Web guard via isPodcastDownloadSupported',
  downloadSrc.includes('Platform.OS !== \'web\'') &&
    hookSrc.includes('isPodcastDownloadSupported'),
);
record(
  'Partial file cleanup on failure',
  downloadSrc.includes('deleteAsync(destination'),
);
record(
  'HTTP status validated',
  downloadSrc.includes('downloadResult.status'),
);
record(
  'Download metadata persisted',
  downloadSrc.includes('savePodcastDownload') &&
    storageSrc.includes('podcastDownloads'),
);
record(
  'In-flight guard in hook',
  hookSrc.includes('downloadInFlightRef'),
);
record(
  'Hebrew download error copy',
  hookSrc.includes('לא הצלחנו להוריד את הפרק'),
);
record(
  'Local URI used for offline playback',
  hookSrc.includes('localAudioUri ?? episode.audioUrl'),
);

const failed = results.filter((entry) => !entry.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  process.exit(1);
}
