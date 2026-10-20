# Parasha Podcast — Publishing Guide

Production audio is hosted in **Supabase Storage**. The mobile app reads only **published** rows from `parasha_podcast_episodes`.

## Infrastructure

| Item | Value |
|------|-------|
| Bucket | `podcast` |
| Table | `public.parasha_podcast_episodes` |
| Client access | `SELECT` published rows only (RLS) |
| Audio access | Public read on `podcast` bucket objects |
| Writes | Service role only (bootstrap script or dashboard) |

Apply the migration first:

```bash
# Via Supabase CLI or Dashboard SQL editor
supabase/migrations/20260908100000_parasha_podcast.sql
```

## First episode (Content Pack V1)

| Field | Value |
|-------|-------|
| Episode ID | `episode-haazinu-sukkot-2025-v1` |
| `parasha_key` | `Ha'azinu` |
| Hebrew title | מהסוכה בחצר ועד סוף העולם |
| `week_start` | `2025-09-28` |
| `week_end` | `2025-10-04` |
| Storage path | `episodes/Ha'azinu/2025-10-04/mahasuka-bachatzer-v1.m4a` |
| Duration | ~950 seconds (parsed from file) |
| `status` | `published` |

The episode is tied to **פרשת האזינו** (Shabbat before Sukkot 5786). Calendar / `weeklyParasha.basename` remains the lookup key.

## Automated publish (recommended)

```bash
# Requires .env with EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run bootstrap:parasha-podcast -- --audio "C:/Users/you/Downloads/מהסוכה_בחצר_ועד_סוף_העולם.m4a"
```

Dry run (metadata only):

```bash
npm run bootstrap:parasha-podcast -- --dry-run --audio "path/to/file.m4a"
```

## Manual publish (Dashboard)

1. **Storage → podcast → Upload**
   - Path: `episodes/Ha'azinu/2025-10-04/mahasuka-bachatzer-v1.m4a`
   - MIME: `audio/mp4` / `audio/x-m4a`
2. **Table Editor → parasha_podcast_episodes → Insert row**
   - Use the field values from the table above
   - Set `audio_storage_path` to the storage object path (no `podcast/` prefix)
   - Set `published_at` to now
   - Set `status` to `published`
3. **Verify public URL**
   - `https://<project>.supabase.co/storage/v1/object/public/podcast/episodes/Ha'azinu/2025-10-04/mahasuka-bachatzer-v1.m4a`

## App behavior

```text
Calendar weeklyParasha.basename
        ↓
ProductionParashaPodcastProvider
        ↓
parasha_podcast_episodes (status = published, week range match)
        ↓
public storage URL
        ↓
useParashaPodcast → ParashaPodcastCard → expo-audio
```

In development, if no published episode exists for the current parasha week, the existing mock provider is used as fallback.
