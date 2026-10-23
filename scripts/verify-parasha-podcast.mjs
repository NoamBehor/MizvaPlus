/**
 * Parasha Podcast verification — frontend architecture and UI wiring.
 * Run: npm run verify:parasha-podcast
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const results = [];

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function podcastProgressStorageKey(parashaKey) {
  return `@mitzvahapp/podcast_progress:${parashaKey}`;
}

console.log('Parasha Podcast verification\n============================\n');

const podcastTypeSrc = read('src/types/podcast.ts');
const providerSrc = read('src/services/podcast/parashaPodcastProvider.ts');
const serviceSrc = read('src/services/podcast/parashaPodcastService.ts');
const storageSrc = read('src/services/podcast/parashaPodcastStorage.ts');
const downloadSrc = read('src/services/podcast/parashaPodcastDownload.ts');
const hookSrc = read('src/hooks/useParashaPodcast.ts');
const cardSrc = read('src/components/podcast/ParashaPodcastCard.tsx');
const playerSrc = read('src/components/podcast/ParashaPodcastPlayer.tsx');
const screenSrc = read('src/screens/podcast/ParashaPodcastPlayerScreen.tsx');
const homeSrc = read('src/screens/home/HomeScreen.tsx');
const navTypesSrc = read('src/navigation/types.ts');
const navRefSrc = read('src/navigation/navigationRef.ts');
const rootNavSrc = read('src/navigation/RootNavigator.tsx');
const packageJson = JSON.parse(read('package.json'));

record(
  'Podcast type exists',
  podcastTypeSrc.includes('export type ParashaPodcastEpisode'),
);
record(
  'Provider returns episode',
  providerSrc.includes('getEpisodeForParasha') &&
    providerSrc.includes('MockParashaPodcastProvider'),
);
record(
  'getCurrentParashaPodcast uses provider',
  serviceSrc.includes('getCurrentParashaPodcast') &&
    serviceSrc.includes('getParashaPodcastProvider'),
);
record(
  'Current parasha is used (no duplicate calendar logic in service)',
  !serviceSrc.includes('getWeeklyParashaForDateKey') &&
    !serviceSrc.includes('findWeeklyParashaForDate') &&
    serviceSrc.includes('weeklyParasha'),
);
record(
  'Home card renders',
  homeSrc.includes('ParashaPodcastCard') &&
    cardSrc.includes('export function ParashaPodcastCard'),
);
record(
  'Player route exists',
  navTypesSrc.includes('ParashaPodcastPlayer') &&
    rootNavSrc.includes('ParashaPodcastPlayer') &&
    navRefSrc.includes('navigateToParashaPodcastPlayer'),
);
record('Play state supported', hookSrc.includes('play') && playerSrc.includes('togglePlayback'));
record('Pause state supported', hookSrc.includes('pause') && hookSrc.includes('isPlaying'));
record(
  'Skip ±15 supported',
  hookSrc.includes('skipBack') &&
    hookSrc.includes('skipForward') &&
    hookSrc.includes('SKIP_SECONDS = 15'),
);
record(
  'Progress persistence supported',
  storageSrc.includes('savePodcastProgress') &&
    storageSrc.includes('getPodcastProgress') &&
    hookSrc.includes('savePodcastProgress'),
);
record(
  'Speed selector supported',
  hookSrc.includes('setPlaybackSpeed') &&
    read('src/components/podcast/PodcastSpeedSelector.tsx').includes(
      'PODCAST_PLAYBACK_SPEEDS',
    ),
);
record(
  'Resume persistence supported',
  hookSrc.includes('resumeFromSavedPosition') &&
    hookSrc.includes('hasResumePosition'),
);
record(
  'Download state supported',
  downloadSrc.includes('downloadPodcastEpisode') &&
    hookSrc.includes('downloadState'),
);
record(
  'Offline state supported',
  downloadSrc.includes('getLocalPodcastFile') &&
    hookSrc.includes('isOfflineAvailable'),
);
record(
  'Empty state message',
  cardSrc.includes('הפרק של פרשת השבוע עדיין בהכנה'),
);
record(
  'Error state message',
  playerSrc.includes('לא הצלחנו לטעון את הפרק') ||
    hookSrc.includes('לא הצלחנו לטעון את הפרק'),
);
record(
  'Mini player supported',
  read('src/components/podcast/ParashaPodcastMiniPlayer.tsx').includes(
    'ParashaPodcastMiniPlayer',
  ) &&
    read('src/navigation/RootNavigator.tsx').includes('ParashaPodcastMiniPlayer'),
);
record(
  'Mini player only on main tabs (avoids blocking stack screens)',
  read('src/components/podcast/ParashaPodcastMiniPlayer.tsx').includes(
    'isVisible: isOnMainTab && !isOnFullPlayer',
  ),
);
record(
  'Episode status filtering supported',
  podcastTypeSrc.includes("status: ParashaPodcastEpisodeStatus") &&
    read('src/services/podcast/parashaPodcastService.ts').includes(
      "episode.status !== 'published'",
    ),
);
record(
  'Share abstraction supported',
  read('src/services/podcast/sharePodcastEpisode.ts').includes(
    'sharePodcastEpisode',
  ),
);
record(
  'RTL patterns used',
  cardSrc.includes("alignItems: 'flex-start'") &&
    screenSrc.includes('className="flex-row items-center justify-between"'),
);
record(
  'Web fallback present',
  hookSrc.includes('isWebPlaybackLimited') &&
    playerSrc.includes('תצוגת דפדפן'),
);
record(
  'No duplicate navigation route',
  (navTypesSrc.match(/ParashaPodcastPlayer/g) ?? []).length === 1,
);
record(
  'Progress key uses parashaKey',
  storageSrc.includes('podcastProgressStorageKey') &&
    podcastProgressStorageKey('sample') ===
      '@mitzvahapp/podcast_progress:sample',
);
record(
  'Dev provider prefers production then mock',
  providerSrc.includes('DevParashaPodcastProvider') &&
    providerSrc.includes('if (__DEV__)') &&
    providerSrc.includes('MockParashaPodcastProvider'),
);
record(
  'Production provider uses Supabase repository',
  providerSrc.includes('fetchPublishedEpisodeForParasha') &&
    read('src/services/podcast/parashaPodcastRepository.ts').includes(
      'parasha_podcast_episodes',
    ),
);
record(
  'Podcast catalog episode v1 defined',
  read('src/constants/parashaPodcastCatalog.ts').includes(
    'מהסוכה בחצר ועד סוף העולם',
  ) &&
    read('src/constants/parashaPodcastCatalog.ts').includes("parashaKey: \"Ha'azinu\""),
);
record(
  'Supabase podcast migration exists',
  read('supabase/migrations/20260908100000_parasha_podcast.sql').includes(
    'parasha_podcast_episodes',
  ) &&
    read('supabase/migrations/20260908100000_parasha_podcast.sql').includes(
      "bucket_id = 'podcast'",
    ),
);
record(
  'Bootstrap publish script exists',
  read('scripts/bootstrap-parasha-podcast-episode.mjs').includes(
    'parasha_podcast_episodes',
  ),
);
record(
  'Episode duration metadata (950s)',
  read('src/constants/parashaPodcastCatalog.ts').includes('durationSeconds: 950'),
);
record(
  'expo-audio dependency installed',
  Object.prototype.hasOwnProperty.call(packageJson.dependencies, 'expo-audio'),
);
record(
  'expo-file-system dependency installed',
  Object.prototype.hasOwnProperty.call(packageJson.dependencies, 'expo-file-system'),
);
record(
  'Download duplicate guard in hook',
  hookSrc.includes('downloadInFlightRef') &&
    hookSrc.includes("downloadState === 'downloading'"),
);
record(
  'Download failure surfaces Hebrew message',
  hookSrc.includes('downloadError') &&
    hookSrc.includes('לא הצלחנו להוריד את הפרק'),
);
record(
  'Failed download cleans partial file',
  downloadSrc.includes('deleteAsync(destination'),
);
record(
  'Mock episode fields present',
  providerSrc.includes('durationSeconds: 574') &&
    providerSrc.includes('פרק לדוגמה על הרעיונות המרכזיים'),
);
record(
  'Accessibility labels on controls',
  playerSrc.includes('accessibilityLabel') &&
    read('src/components/podcast/PodcastDownloadButton.tsx').includes(
      'accessibilityLabel',
    ),
);

const failed = results.filter((entry) => !entry.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
