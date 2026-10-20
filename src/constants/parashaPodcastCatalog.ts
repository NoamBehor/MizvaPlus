/**
 * Canonical metadata for the first production podcast episode.
 * Audio is hosted in Supabase Storage — not bundled in the app.
 */
export const PARASHA_PODCAST_EPISODE_V1 = {
  id: 'episode-haazinu-sukkot-2025-v1',
  parashaKey: "Ha'azinu",
  hebrewTitle: 'מהסוכה בחצר ועד סוף העולם',
  description:
    'פרק מיוחד לקראת חג הסוכות — מהסוכה בבית, דרך ארבעת המינים ושמחת החג, ועד שאלות על זהות, קהילה ועולם.',
  audioStoragePath: "episodes/Ha'azinu/2025-10-04/mahasuka-bachatzer-v1.m4a",
  durationSeconds: 950,
  weekStart: '2025-09-28',
  weekEnd: '2025-10-04',
  version: 1,
  scriptVersion: 'content-pack-v1',
} as const;
