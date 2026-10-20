import type { PrayerSectionAvailability } from '@/types/prayer';

export interface ShacharitSectionMeta {
  availability: PrayerSectionAvailability;
  availabilityNote?: string;
}

export interface ShacharitTocCategory {
  id: string;
  title: string;
  sectionIds: string[];
}

export const SHACHARIT_SECTION_META: Record<string, ShacharitSectionMeta> = {
  'modeh-ani': { availability: 'always' },
  'birkot-hashachar': { availability: 'always' },
  'torah-blessings': { availability: 'always' },
  'petichat-eliyahu': { availability: 'always' },
  'hanas-prayer': { availability: 'always' },
  'morning-prayer': { availability: 'always' },
  'korbanot': { availability: 'always' },
  hodu: { availability: 'always' },
  'pesukei-dzimra': { availability: 'always' },
  'kriat-shema': { availability: 'always' },
  amida: { availability: 'always' },
  tachanun: {
    availability: 'conditional',
    availabilityNote: 'לא נאמר בשבת, בראש חודש ובימים טובים',
  },
  'torah-reading': {
    availability: 'conditional',
    availabilityNote: 'מוצג בימים שבהם יש קריאת התורה',
  },
  ashrei: { availability: 'always' },
  'uva-lesion': { availability: 'always' },
  'beit-yaakov': { availability: 'always' },
  'shir-shel-yom': {
    availability: 'conditional',
    availabilityNote: 'משתנה לפי יום השבוע',
  },
  kaveh: { availability: 'always' },
  alenu: { availability: 'always' },
};

export const SHACHARIT_TOC_CATEGORIES: ShacharitTocCategory[] = [
  {
    id: 'opening',
    title: 'פתיחה',
    sectionIds: ['modeh-ani', 'birkot-hashachar', 'torah-blessings'],
  },
  {
    id: 'tefillot-korbanot',
    title: 'תפילות וקרבנות',
    sectionIds: [
      'petichat-eliyahu',
      'hanas-prayer',
      'morning-prayer',
      'korbanot',
    ],
  },
  {
    id: 'pesukei-dzimra',
    title: 'פסוקי דזמרה',
    sectionIds: ['hodu', 'pesukei-dzimra'],
  },
  {
    id: 'kriat-shema',
    title: 'קריאת שמע',
    sectionIds: ['kriat-shema'],
  },
  {
    id: 'amida',
    title: 'תפילת העמידה',
    sectionIds: ['amida'],
  },
  {
    id: 'tachanun-continuation',
    title: 'תחנון והמשך',
    sectionIds: ['tachanun', 'ashrei', 'uva-lesion', 'beit-yaakov'],
  },
  {
    id: 'additions',
    title: 'תוספות',
    sectionIds: ['shir-shel-yom', 'kaveh', 'alenu', 'torah-reading'],
  },
];

export const SHACHARIT_SECTION_ORDER = SHACHARIT_TOC_CATEGORIES.flatMap(
  (category) => category.sectionIds,
);

export function getShacharitSectionMeta(sectionId: string): ShacharitSectionMeta {
  return (
    SHACHARIT_SECTION_META[sectionId] ?? {
      availability: 'always' as PrayerSectionAvailability,
    }
  );
}
