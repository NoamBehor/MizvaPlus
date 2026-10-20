import type { RitualGuideCatalogItem } from '@/types/ritualGuide';

export const RITUAL_GUIDE_CATALOG_ITEMS: RitualGuideCatalogItem[] = [
  {
    id: 'tefillin',
    title: 'סדר הנחת תפילין וברכות',
    mitzvahId: 'tefillin',
    nusach: 'edot_hamizrach',
    sections: 6,
  },
];

export const RITUAL_GUIDE_CATALOG_BY_ID: Record<string, RitualGuideCatalogItem> =
  Object.fromEntries(
    RITUAL_GUIDE_CATALOG_ITEMS.map((item) => [item.id, item]),
  ) as Record<string, RitualGuideCatalogItem>;
