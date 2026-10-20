import { getHolidayKeyForMitzvahId } from '@/constants/eventDescriptors';
import type { Mitzvah, MitzvahCategory } from '@/types/mitzvah';
import { MITZVAH_PRAYERS, type MitzvahPrayerContent } from '@/constants/mitzvahPrayers';

export { getHolidayKeyForMitzvahId };

export const MITZVAH_CATEGORY_DETAIL_LABELS: Record<MitzvahCategory, string> = {
  daily: 'מצווה יומית',
  fast: 'יום צום',
  holiday: 'חג',
};

export const MITZVAH_ICONS: Record<string, string> = {
  tefillin: '📿',
  shacharit: '🌅',
  mincha: '☀️',
  arvit: '🌙',
  'kriat-shema': '📖',
  'yom-kippur-fast': '🕯️',
  'tisha-bav': '🕯️',
  'taanit-gedalia': '🕯️',
  'asarah-btevet': '🕯️',
  'shivah-asar-btamuz': '🕯️',
  'taanit-esther': '🕯️',
  'rosh-hashana': '🍎',
  'yom-kippur': '🕯️',
  sukkot: '🏕️',
  'shmini-atzeret': '📜',
  chanukah: '🕎',
  'tu-bishvat': '🌳',
  purim: '🎭',
  pesach: '🍷',
  'lag-baomer': '🔥',
  shavuot: '📜',
};

export const CATEGORY_ICONS: Record<MitzvahCategory, string> = {
  daily: '📿',
  fast: '🕯️',
  holiday: '🎉',
};

export function getMitzvahCategoryLabel(category: MitzvahCategory): string {
  return MITZVAH_CATEGORY_DETAIL_LABELS[category];
}

export function getMitzvahIcon(mitzvahId: string, category: MitzvahCategory): string {
  return MITZVAH_ICONS[mitzvahId] ?? CATEGORY_ICONS[category];
}

export function getMitzvahContentText(mitzvah: Mitzvah): string {
  return mitzvah.fullContentHebrew;
}

export function getMitzvahExplanation(mitzvah: Mitzvah): string {
  return mitzvah.explanationHebrew ?? mitzvah.description;
}

export function getMitzvahPrayer(mitzvah: Mitzvah): MitzvahPrayerContent | null {
  const prayerKey = mitzvah.prayerId ?? mitzvah.id;
  return MITZVAH_PRAYERS[prayerKey] ?? null;
}
