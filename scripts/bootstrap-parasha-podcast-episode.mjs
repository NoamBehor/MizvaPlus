/**
 * Bootstrap the first production Parasha Podcast episode.
 *
 * Uploads the local m4a to Supabase Storage and upserts published metadata.
 * Requires service role (never commit the key):
 *   EXPO_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   npm run bootstrap:parasha-podcast -- --audio "C:/path/to/episode.m4a"
 *
 * See docs/parasha-podcast-publishing.md
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createServiceClient,
  isValidSupabaseUrl,
  looksLikeServiceRoleKey,
  resolveEnv,
} from './lib/supabase-live-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function parseCliArgs(argv) {
  const args = {
    audioPath: null,
    dryRun: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--audio' && argv[index + 1]) {
      args.audioPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith('--audio=')) {
      args.audioPath = token.slice('--audio='.length);
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
    }
  }

  return args;
}

function parseM4aDurationSeconds(filePath) {
  const buf = readFileSync(filePath);
  let pos = 0;

  while (pos < buf.length - 8) {
    const size = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (size < 8) {
      break;
    }

    if (type === 'moov') {
      const moovStart = pos + 8;
      const moovEnd = pos + size;
      for (let j = moovStart; j < moovEnd - 8; j += 1) {
        const atomSize = buf.readUInt32BE(j);
        const atomType = buf.toString('ascii', j + 4, j + 8);
        if (atomType !== 'mvhd') {
          continue;
        }

        const version = buf[j + 8];
        if (version === 0) {
          const timescale = buf.readUInt32BE(j + 20);
          const duration = buf.readUInt32BE(j + 24);
          return Math.round(duration / timescale);
        }

        const timescale = buf.readUInt32BE(j + 28);
        const hi = buf.readUInt32BE(j + 32);
        const lo = buf.readUInt32BE(j + 36);
        const duration = hi * 2 ** 32 + lo;
        return Math.round(duration / timescale);
      }
    }

    pos += size;
  }

  throw new Error('Could not parse m4a duration from mvhd atom');
}

function loadEpisodeConfig() {
  const catalogPath = join(projectRoot, 'src/constants/parashaPodcastCatalog.ts');
  const source = readFileSync(catalogPath, 'utf8');
  const match = source.match(
    /export const PARASHA_PODCAST_EPISODE_V1 = (\{[\s\S]*?\}) as const;/,
  );
  if (!match) {
    throw new Error('Could not parse PARASHA_PODCAST_EPISODE_V1 from catalog');
  }

  return Function(`"use strict"; return (${match[1]});`)();
}

async function main() {
  const args = parseCliArgs(process.argv);
  const env = resolveEnv();
  const episode = loadEpisodeConfig();

  if (!isValidSupabaseUrl(env.supabaseUrl)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is missing or invalid');
  }
  if (!looksLikeServiceRoleKey(env.serviceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing or invalid');
  }

  const audioPath =
    args.audioPath ??
    join(
      process.env.USERPROFILE ?? process.env.HOME ?? '',
      'Downloads',
      'מהסוכה_בחצר_ועד_סוף_העולם.m4a',
    );

  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const durationSeconds = parseM4aDurationSeconds(audioPath);
  const fileStats = statSync(audioPath);
  const storagePath = episode.audioStoragePath;
  const publishedAt = new Date().toISOString();

  console.log('Parasha Podcast bootstrap');
  console.log('=======================');
  console.log(`Episode ID: ${episode.id}`);
  console.log(`Parasha key: ${episode.parashaKey}`);
  console.log(`Week: ${episode.weekStart} → ${episode.weekEnd}`);
  console.log(`Storage path: podcast/${storagePath}`);
  console.log(`Duration: ${durationSeconds}s (${(durationSeconds / 60).toFixed(1)} min)`);
  console.log(`File size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Local file: ${audioPath}`);

  if (args.dryRun) {
    console.log('\nDry run — no upload performed.');
    return;
  }

  const client = createServiceClient(env);

  const { error: uploadError } = await client.storage
    .from('podcast')
    .upload(storagePath, createReadStream(audioPath), {
      contentType: 'audio/mp4',
      upsert: true,
      duplex: 'half',
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: publicData } = client.storage.from('podcast').getPublicUrl(storagePath);

  const { error: upsertError } = await client.from('parasha_podcast_episodes').upsert(
    {
      id: episode.id,
      parasha_key: episode.parashaKey,
      hebrew_title: episode.hebrewTitle,
      description: episode.description,
      audio_storage_path: storagePath,
      duration_seconds: durationSeconds,
      week_start: episode.weekStart,
      week_end: episode.weekEnd,
      version: episode.version,
      published_at: publishedAt,
      status: 'published',
      script_version: episode.scriptVersion,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    throw new Error(`Episode upsert failed: ${upsertError.message}`);
  }

  console.log('\nPublished successfully.');
  console.log(`Public audio URL: ${publicData.publicUrl}`);
  console.log(`Table: parasha_podcast_episodes`);
  console.log(`Status: published`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
