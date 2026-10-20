import type { PrayerNusach } from '@/types/prayer';

export type RitualGuideSectionKind =
  | 'instruction'
  | 'text'
  | 'step'
  | 'action'
  | 'blessing';

export interface RitualGuideSourceMetadata {
  provider: string;
  reference?: string;
  accessedAt?: string;
  license?: string;
  versionTitle?: string;
  verifiedAt?: string;
}

export interface RitualGuideSection {
  id: string;
  title: string;
  order: number;
  kind: RitualGuideSectionKind;
  instruction?: string;
  text: string[];
}

export interface RitualGuide {
  id: string;
  title: string;
  nusach: PrayerNusach;
  language: 'he';
  version: number;
  availability: 'complete';
  sections: RitualGuideSection[];
  source?: RitualGuideSourceMetadata;
}

export interface RitualGuideCatalogItem {
  id: string;
  title: string;
  mitzvahId: string;
  nusach: string;
  sections: number;
}
