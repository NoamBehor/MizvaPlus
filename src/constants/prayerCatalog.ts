import type { PrayerCatalogItem } from '@/types/prayer';

/**
 * Canonical prayer content registry.
 * Availability must match bundled JSON metadata where local content exists.
 */
export const PRAYER_CATALOG_ITEMS: PrayerCatalogItem[] = [
  {
    id: 'kriat-shema',
    title: 'קריאת שמע',
    nusach: 'edot_hamizrach',
    context: 'morning',
    availability: 'partial',
    sections: 3,
  },
  {
    id: 'shacharit',
    title: 'תפילת שחרית',
    nusach: 'edot_hamizrach',
    context: 'morning',
    availability: 'complete',
    sections: 19,
  },
  {
    id: 'mincha',
    title: 'תפילת מנחה',
    nusach: 'edot_hamizrach',
    context: 'afternoon',
    availability: 'complete',
    sections: 4,
  },
  {
    id: 'arvit',
    title: 'תפילת ערבית',
    nusach: 'edot_hamizrach',
    context: 'evening',
    availability: 'complete',
    sections: 4,
  },
  {
    id: 'birkat-hamazon',
    title: 'ברכת המזון',
    nusach: 'edot_hamizrach',
    context: 'ritual',
    availability: 'pending',
    sections: 0,
  },
];

export const PRAYER_CATALOG_BY_ID: Record<string, PrayerCatalogItem> =
  Object.fromEntries(
    PRAYER_CATALOG_ITEMS.map((item) => [item.id, item]),
  ) as Record<string, PrayerCatalogItem>;
