import type { PrayerSectionAvailability } from '@/types/prayer';

export interface ArvitSectionMeta {
  availability: PrayerSectionAvailability;
  availabilityNote?: string;
}

export const ARVIT_SECTION_META: Record<string, ArvitSectionMeta> = {
  barchu: { availability: 'always' },
  'arvit-shema': { availability: 'always' },
  amida: { availability: 'always' },
  alenu: { availability: 'always' },
};

export function getArvitSectionMeta(sectionId: string): ArvitSectionMeta {
  return ARVIT_SECTION_META[sectionId] ?? { availability: 'always' };
}
