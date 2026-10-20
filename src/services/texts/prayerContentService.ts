import arvitEdot from '@/content/prayers/edot-hamizrach/arvit.json';
import kriatShemaEdot from '@/content/prayers/edot-hamizrach/kriat-shema.json';
import minchaEdot from '@/content/prayers/edot-hamizrach/mincha.json';
import shacharitEdot from '@/content/prayers/edot-hamizrach/shacharit.json';
import { getArvitSectionMeta } from '@/constants/arvitStructure';
import { getMinchaSectionMeta } from '@/constants/minchaStructure';
import {
  PRAYER_CATALOG_BY_ID,
  PRAYER_CATALOG_ITEMS,
} from '@/constants/prayerCatalog';
import { getShacharitSectionMeta } from '@/constants/shacharitStructure';
import {
  getSectionAvailabilityLabel,
  getSectionAvailabilityNote,
  isSectionApplicableToday,
} from '@/services/texts/prayerSectionContext';
import type { CalendarDayInfo } from '@/types/calendar';
import type {
  EnrichedPrayerSection,
  PrayerAvailability,
  PrayerCatalogItem,
  PrayerDocument,
  PrayerNusach,
  PrayerSection,
  PrayerSectionAvailability,
} from '@/types/prayer';
import { ALL_NUSACHIM } from '@/types/prayer';

const PRAYER_CATALOG: Record<PrayerNusach, Record<string, PrayerDocument>> = {
  edot_hamizrach: {
    'kriat-shema': kriatShemaEdot as PrayerDocument,
    shacharit: shacharitEdot as PrayerDocument,
    mincha: minchaEdot as PrayerDocument,
    arvit: arvitEdot as PrayerDocument,
  },
  ashkenaz: {},
  sefard: {},
};

const MITZVAH_PRAYER_IDS: Record<string, string> = {
  'kriat-shema': 'kriat-shema',
  shacharit: 'shacharit',
  mincha: 'mincha',
  arvit: 'arvit',
};

const HEBREW_TEXT_PATTERN = /[\u0590-\u05FF]/;
const NIKUD_PATTERN = /[\u0591-\u05C7]/;
const HTML_TAG_PATTERN = /<[^>]+>/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => isNonEmptyString(entry))
  );
}

function hasHebrewContent(text: string): boolean {
  return HEBREW_TEXT_PATTERN.test(text);
}

function hasUnexpectedHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text);
}

function hasNikud(text: string): boolean {
  return NIKUD_PATTERN.test(text);
}

function validateSectionOrdering(sections: PrayerSection[]): boolean {
  if (sections.length === 0) {
    return false;
  }

  const sortedOrders = [...sections]
    .map((section) => section.order)
    .sort((left, right) => left - right);

  return sortedOrders.every((order, index) => order === index + 1);
}

function validateUniqueSectionIds(sections: PrayerSection[]): boolean {
  const ids = sections.map((section) => section.id);
  return new Set(ids).size === ids.length;
}

export function validatePrayerSection(section: unknown): section is PrayerSection {
  if (!section || typeof section !== 'object') {
    return false;
  }

  const candidate = section as Partial<PrayerSection>;

  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.title) ||
    typeof candidate.order !== 'number' ||
    !isStringArray(candidate.text)
  ) {
    return false;
  }

  return candidate.text.every(
    (paragraph) =>
      hasHebrewContent(paragraph) && !hasUnexpectedHtml(paragraph),
  );
}

export function validatePrayerDocument(
  document: unknown,
): document is PrayerDocument {
  if (!document || typeof document !== 'object') {
    return false;
  }

  const candidate = document as Partial<PrayerDocument>;

  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.title) ||
    candidate.language !== 'he' ||
    typeof candidate.version !== 'number' ||
    !Array.isArray(candidate.sections) ||
    candidate.sections.length === 0
  ) {
    return false;
  }

  if (
    candidate.nusach !== 'edot_hamizrach' &&
    candidate.nusach !== 'ashkenaz' &&
    candidate.nusach !== 'sefard'
  ) {
    return false;
  }

  if (candidate.availability !== 'complete' && candidate.availability !== 'partial') {
    return false;
  }

  if (
    candidate.context !== 'morning' &&
    candidate.context !== 'afternoon' &&
    candidate.context !== 'evening' &&
    candidate.context !== 'bedtime' &&
    candidate.context !== 'ritual'
  ) {
    return false;
  }

  if (!isNonEmptyString(candidate.documentContext)) {
    return false;
  }

  if (!candidate.sections.every((section) => validatePrayerSection(section))) {
    return false;
  }

  if (!validateSectionOrdering(candidate.sections)) {
    return false;
  }

  if (!validateUniqueSectionIds(candidate.sections)) {
    return false;
  }

  const catalogItem = PRAYER_CATALOG_BY_ID[candidate.id];
  if (!catalogItem) {
    return false;
  }

  if (catalogItem.availability !== candidate.availability) {
    return false;
  }

  if (candidate.sections.length !== catalogItem.sections) {
    return false;
  }

  if (candidate.title !== catalogItem.title) {
    return false;
  }

  return true;
}

function getValidatedPrayer(
  prayerId: string,
  nusach: PrayerNusach,
): PrayerDocument | null {
  const document = PRAYER_CATALOG[nusach]?.[prayerId];
  if (!document || !validatePrayerDocument(document)) {
    return null;
  }

  return document;
}

export function getPrayer(
  prayerId: string,
  nusach: PrayerNusach = 'edot_hamizrach',
): PrayerDocument | null {
  return getValidatedPrayer(prayerId, nusach);
}

export function getOrderedSections(prayer: PrayerDocument): PrayerSection[] {
  return [...prayer.sections].sort((left, right) => left.order - right.order);
}

function resolveSectionAvailability(
  prayerId: string,
  section: PrayerSection,
): { availability: PrayerSectionAvailability; availabilityNote?: string } {
  if (section.availability) {
    return {
      availability: section.availability,
      availabilityNote: section.availabilityNote,
    };
  }

  if (prayerId === 'shacharit') {
    const meta = getShacharitSectionMeta(section.id);
    return {
      availability: meta.availability,
      availabilityNote: meta.availabilityNote,
    };
  }

  if (prayerId === 'mincha') {
    const meta = getMinchaSectionMeta(section.id);
    return {
      availability: meta.availability,
      availabilityNote: meta.availabilityNote,
    };
  }

  if (prayerId === 'arvit') {
    const meta = getArvitSectionMeta(section.id);
    return {
      availability: meta.availability,
      availabilityNote: meta.availabilityNote,
    };
  }

  return { availability: 'always' };
}

export function enrichPrayerSections(
  prayer: PrayerDocument,
  dayInfo: CalendarDayInfo | null = null,
): EnrichedPrayerSection[] {
  return getOrderedSections(prayer).map((section) => {
    const { availability, availabilityNote } = resolveSectionAvailability(
      prayer.id,
      section,
    );
    const applicableToday = isSectionApplicableToday(section.id, dayInfo);
    const contextualNote =
      getSectionAvailabilityNote(section.id, dayInfo) ?? availabilityNote;

    return {
      ...section,
      availability,
      availabilityNote: contextualNote,
      applicableToday,
      availabilityLabel: getSectionAvailabilityLabel(availability),
    };
  });
}

export function getAvailableNusachim(prayerId: string): PrayerNusach[] {
  return ALL_NUSACHIM.filter((nusach) => getValidatedPrayer(prayerId, nusach) !== null);
}

export function getUnavailableNusachim(prayerId: string): PrayerNusach[] {
  return ALL_NUSACHIM.filter((nusach) => getValidatedPrayer(prayerId, nusach) === null);
}

export function hasLocalPrayerDocument(prayerId: string): boolean {
  return ALL_NUSACHIM.some((nusach) => getValidatedPrayer(prayerId, nusach) !== null);
}

export function getPrayerIdForMitzvah(mitzvahId: string): string | null {
  return MITZVAH_PRAYER_IDS[mitzvahId] ?? null;
}

export function hasLocalPrayerForMitzvah(mitzvahId: string): boolean {
  const prayerId = getPrayerIdForMitzvah(mitzvahId);
  return prayerId ? hasLocalPrayerDocument(prayerId) : false;
}

export function listBundledPrayerIds(): string[] {
  const ids = new Set<string>();

  for (const nusach of ALL_NUSACHIM) {
    for (const prayerId of Object.keys(PRAYER_CATALOG[nusach])) {
      if (getValidatedPrayer(prayerId, nusach)) {
        ids.add(prayerId);
      }
    }
  }

  return [...ids].sort();
}

export function listAvailableNusachimWithStatus(prayerId: string): Array<{
  nusach: PrayerNusach;
  available: boolean;
}> {
  return ALL_NUSACHIM.map((nusach) => ({
    nusach,
    available: getValidatedPrayer(prayerId, nusach) !== null,
  }));
}

export function listPrayerCatalog(): PrayerCatalogItem[] {
  return [...PRAYER_CATALOG_ITEMS];
}

export function getPrayerCatalogItem(prayerId: string): PrayerCatalogItem | null {
  return PRAYER_CATALOG_BY_ID[prayerId] ?? null;
}

export function getPrayerCatalogItemForMitzvah(
  mitzvahId: string,
): PrayerCatalogItem | null {
  const prayerId = getPrayerIdForMitzvah(mitzvahId);
  return prayerId ? getPrayerCatalogItem(prayerId) : null;
}

export function getPrayerAvailability(prayerId: string): PrayerAvailability {
  return getPrayerCatalogItem(prayerId)?.availability ?? 'pending';
}

export function canOpenPrayerReader(prayerId: string): boolean {
  const availability = getPrayerAvailability(prayerId);
  return (
    (availability === 'complete' || availability === 'partial') &&
    hasLocalPrayerDocument(prayerId)
  );
}

export function prayerExpectsNikud(prayerId: string): boolean {
  return getPrayerAvailability(prayerId) !== 'pending';
}

export { hasHebrewContent, hasNikud, hasUnexpectedHtml };
