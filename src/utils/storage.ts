import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as T;
}

export async function setJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  onboardingComplete: '@mitzvahapp/onboarding_complete',
  preferences: '@mitzvahapp/mitzvah_preferences',
  completions: '@mitzvahapp/mitzvah_completions',
  userProfile: '@mitzvahapp/user_profile',
  quizAttempts: '@mitzvahapp/quiz_attempts',
  badges: '@mitzvahapp/badges',
  prayerReaderFontSize: '@mitzvahapp/prayer_reader_font_size',
  prayerReaderPosition: '@mitzvahapp/prayer_reader_position',
  prayerReaderNusach: '@mitzvahapp/prayer_reader_nusach',
  podcastProgressPrefix: '@mitzvahapp/podcast_progress',
  podcastPlaybackSpeed: '@mitzvahapp/podcast_playback_speed',
  podcastDownloads: '@mitzvahapp/podcast_downloads',
  minyanProximityPreferences: '@mitzvahapp/minyan_proximity_preferences',
  minyanProximityNotificationState: '@mitzvahapp/minyan_proximity_notification_state',
} as const;

export function onboardingStorageKey(userId: string): string {
  return `${STORAGE_KEYS.onboardingComplete}:${userId}`;
}

export function preferencesStorageKey(userId: string): string {
  return `${STORAGE_KEYS.preferences}:${userId}`;
}

export function completionsStorageKey(userId: string): string {
  return `${STORAGE_KEYS.completions}:${userId}`;
}

export function quizAttemptsStorageKey(userId: string): string {
  return `${STORAGE_KEYS.quizAttempts}:${userId}`;
}

export function badgesStorageKey(userId: string): string {
  return `${STORAGE_KEYS.badges}:${userId}`;
}
