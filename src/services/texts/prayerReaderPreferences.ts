import {
  DEFAULT_PRAYER_FONT_SIZE,
  PRAYER_FONT_SIZES,
  type PrayerFontSize,
  type PrayerNusach,
  type PrayerReadingPosition,
} from '@/types/prayer';
import { getJson, setJson, STORAGE_KEYS } from '@/utils/storage';

function isPrayerFontSize(value: number): value is PrayerFontSize {
  return (PRAYER_FONT_SIZES as readonly number[]).includes(value);
}

export async function getPrayerFontSize(): Promise<PrayerFontSize> {
  const stored = await getJson<number>(STORAGE_KEYS.prayerReaderFontSize);
  if (typeof stored === 'number' && isPrayerFontSize(stored)) {
    return stored;
  }

  return DEFAULT_PRAYER_FONT_SIZE;
}

export async function setPrayerFontSize(size: PrayerFontSize): Promise<void> {
  await setJson(STORAGE_KEYS.prayerReaderFontSize, size);
}

export function getNextSmallerFontSize(
  current: PrayerFontSize,
): PrayerFontSize | null {
  const index = PRAYER_FONT_SIZES.indexOf(current);
  if (index <= 0) {
    return null;
  }

  return PRAYER_FONT_SIZES[index - 1];
}

export function getNextLargerFontSize(
  current: PrayerFontSize,
): PrayerFontSize | null {
  const index = PRAYER_FONT_SIZES.indexOf(current);
  if (index < 0 || index >= PRAYER_FONT_SIZES.length - 1) {
    return null;
  }

  return PRAYER_FONT_SIZES[index + 1];
}

export async function getPrayerReadingPosition(): Promise<PrayerReadingPosition | null> {
  const stored = await getJson<PrayerReadingPosition>(
    STORAGE_KEYS.prayerReaderPosition,
  );

  if (
    !stored ||
    typeof stored.scrollY !== 'number' ||
    typeof stored.updatedAt !== 'string' ||
    (typeof stored.prayerId !== 'string' &&
      typeof stored.ritualGuideId !== 'string')
  ) {
    return null;
  }

  if (
    stored.nusach !== 'edot_hamizrach' &&
    stored.nusach !== 'ashkenaz' &&
    stored.nusach !== 'sefard'
  ) {
    return null;
  }

  return stored;
}

export async function savePrayerReadingPosition(
  position: Omit<PrayerReadingPosition, 'updatedAt'>,
): Promise<void> {
  const payload: PrayerReadingPosition = {
    ...position,
    updatedAt: new Date().toISOString(),
  };

  await setJson(STORAGE_KEYS.prayerReaderPosition, payload);
}

export async function getPreferredNusach(): Promise<PrayerNusach> {
  const stored = await getJson<PrayerNusach>(STORAGE_KEYS.prayerReaderNusach);
  if (
    stored === 'edot_hamizrach' ||
    stored === 'ashkenaz' ||
    stored === 'sefard'
  ) {
    return stored;
  }

  return 'edot_hamizrach';
}

export async function setPreferredNusach(nusach: PrayerNusach): Promise<void> {
  await setJson(STORAGE_KEYS.prayerReaderNusach, nusach);
}
