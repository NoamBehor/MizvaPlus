export type PrayerNusach = 'edot_hamizrach' | 'ashkenaz' | 'sefard';

export type PrayerAvailability = 'complete' | 'partial' | 'pending';

/** Liturgical time/context — prevents accidental content mixing across prayers. */
export type PrayerContext =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'bedtime'
  | 'ritual';

export interface PrayerCatalogItem {
  id: string;
  title: string;
  nusach: string;
  context: PrayerContext;
  availability: PrayerAvailability;
  sections: number;
}

export interface PrayerSourceMetadata {
  name?: string;
  provider?: string;
  reference?: string;
  accessedAt?: string;
  license?: string;
  versionTitle?: string | null;
  verifiedAt?: string;
  auditSummary?: string;
  auditError?: string;
}

export type PrayerSectionAvailability = 'always' | 'conditional' | 'special_day';

export interface PrayerSection {
  id: string;
  title: string;
  text: string[];
  order: number;
  availability?: PrayerSectionAvailability;
  availabilityNote?: string;
  source?: PrayerSourceMetadata;
}

export interface EnrichedPrayerSection extends PrayerSection {
  availability: PrayerSectionAvailability;
  availabilityNote?: string;
  applicableToday: boolean;
  availabilityLabel: string | null;
}

export interface PrayerDocument {
  id: string;
  title: string;
  nusach: PrayerNusach;
  language: 'he';
  version: number;
  availability: Exclude<PrayerAvailability, 'pending'>;
  /** Liturgical time-of-day context for this document. */
  context: PrayerContext;
  /**
   * Explicit document identifier within a context family.
   * e.g. shacharit-shema, arvit-shema, kriat-shema, bedtime-shema
   */
  documentContext: string;
  sections: PrayerSection[];
  source?: PrayerSourceMetadata;
}

export interface PrayerReadingPosition {
  prayerId?: string;
  ritualGuideId?: string;
  nusach: PrayerNusach;
  scrollY: number;
  updatedAt: string;
}

export const PRAYER_FONT_SIZES = [18, 20, 22, 24, 26, 28] as const;

export type PrayerFontSize = (typeof PRAYER_FONT_SIZES)[number];

export const DEFAULT_PRAYER_FONT_SIZE: PrayerFontSize = 22;

export const NUSACH_LABELS: Record<PrayerNusach, string> = {
  edot_hamizrach: 'עדות המזרח',
  ashkenaz: 'אשכנז',
  sefard: 'ספרד',
};

export const ALL_NUSACHIM: PrayerNusach[] = [
  'edot_hamizrach',
  'ashkenaz',
  'sefard',
];
