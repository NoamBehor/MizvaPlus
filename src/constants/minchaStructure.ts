import type { PrayerSectionAvailability } from '@/types/prayer';

export interface MinchaSectionMeta {
  availability: PrayerSectionAvailability;
  availabilityNote?: string;
}

export const MINCHA_SECTION_META: Record<string, MinchaSectionMeta> = {
  korbanot: { availability: 'always' },
  amida: { availability: 'always' },
  tachanun: {
    availability: 'conditional',
    availabilityNote: 'לא נאמר בשבת, בראש חודש ובימים טובים',
  },
  alenu: { availability: 'always' },
};

export function getMinchaSectionMeta(sectionId: string): MinchaSectionMeta {
  return MINCHA_SECTION_META[sectionId] ?? { availability: 'always' };
}
