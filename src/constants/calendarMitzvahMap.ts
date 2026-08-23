/**
 * Maps Hebcal event keys / descriptors to app mitzvah IDs.
 * Keys are normalized lowercase event identifiers from @hebcal/core.
 */
export const HEBCAL_EVENT_TO_MITZVAH_IDS: Record<string, string[]> = {
  'rosh hashana': ['rosh-hashana'],
  'rosh hashanah': ['rosh-hashana'],
  'yom kippur': ['yom-kippur', 'yom-kippur-fast'],
  'erev rosh hashana': ['rosh-hashana'],
  'sukkot': ['sukkot'],
  'erev sukkot': ['sukkot'],
  'shmini atzeret': ['shmini-atzeret'],
  'simchat torah': ['shmini-atzeret'],
  'chanukah': ['chanukah'],
  'hanukkah': ['chanukah'],
  'tu bishvat': ['tu-bishvat'],
  "tu bi'shvat": ['tu-bishvat'],
  'purim': ['purim'],
  'pesach': ['pesach'],
  'passover': ['pesach'],
  'erev pesach': ['pesach'],
  'lag baomer': ['lag-baomer'],
  "lag ba'omer": ['lag-baomer'],
  'shavuot': ['shavuot'],
  'erev shavuot': ['shavuot'],
  'tisha bav': ['tisha-bav'],
  "tish'a b'av": ['tisha-bav'],
  'asara btevet': ['asarah-btevet'],
  'asarah btevet': ['asarah-btevet'],
  'taanit esther': ['taanit-esther'],
  "ta'anit esther": ['taanit-esther'],
  'taanit gedaliah': ['taanit-gedalia'],
  "ta'anit gedaliah": ['taanit-gedalia'],
  'tzom gedaliah': ['taanit-gedalia'],
  'shiva asar btmuz': ['shivah-asar-btamuz'],
  '17 tammuz': ['shivah-asar-btamuz'],
  'shivah asar btamuz': ['shivah-asar-btamuz'],
};

export const FAST_MITZVAH_IDS = new Set([
  'yom-kippur-fast',
  'tisha-bav',
  'taanit-gedalia',
  'asarah-btevet',
  'shivah-asar-btamuz',
  'taanit-esther',
]);

export const HOLIDAY_MITZVAH_IDS = new Set([
  'rosh-hashana',
  'yom-kippur',
  'sukkot',
  'shmini-atzeret',
  'chanukah',
  'tu-bishvat',
  'purim',
  'pesach',
  'lag-baomer',
  'shavuot',
]);

export function normalizeEventKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getMitzvahIdsForEventTitle(title: string): string[] {
  const normalized = normalizeEventKey(title);
  return HEBCAL_EVENT_TO_MITZVAH_IDS[normalized] ?? [];
}
