import tefillinEdot from '@/content/prayers/edot-hamizrach/tefillin.json';
import {
  RITUAL_GUIDE_CATALOG_BY_ID,
  RITUAL_GUIDE_CATALOG_ITEMS,
} from '@/constants/ritualGuideCatalog';
import type { PrayerNusach } from '@/types/prayer';
import { ALL_NUSACHIM } from '@/types/prayer';
import type {
  RitualGuide,
  RitualGuideCatalogItem,
  RitualGuideSection,
} from '@/types/ritualGuide';

const RITUAL_GUIDE_CATALOG: Record<PrayerNusach, Record<string, RitualGuide>> = {
  edot_hamizrach: {
    tefillin: tefillinEdot as RitualGuide,
  },
  ashkenaz: {},
  sefard: {},
};

const MITZVAH_RITUAL_GUIDE_IDS: Record<string, string> = {
  tefillin: 'tefillin',
};

const HEBREW_TEXT_PATTERN = /[\u0590-\u05FF]/;
const HTML_TAG_PATTERN = /<[^>]+>/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasHebrewContent(text: string): boolean {
  return HEBREW_TEXT_PATTERN.test(text);
}

function hasUnexpectedHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text);
}

function validateSectionOrdering(sections: RitualGuideSection[]): boolean {
  const sortedOrders = [...sections]
    .map((section) => section.order)
    .sort((left, right) => left - right);

  return sortedOrders.every((order, index) => order === index + 1);
}

function validateUniqueSectionIds(sections: RitualGuideSection[]): boolean {
  const ids = sections.map((section) => section.id);
  return new Set(ids).size === ids.length;
}

export function validateRitualGuideSection(
  section: unknown,
): section is RitualGuideSection {
  if (!section || typeof section !== 'object') {
    return false;
  }

  const candidate = section as Partial<RitualGuideSection>;

  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.title) ||
    typeof candidate.order !== 'number' ||
    !Array.isArray(candidate.text) ||
    (candidate.kind !== 'instruction' &&
      candidate.kind !== 'text' &&
      candidate.kind !== 'step' &&
      candidate.kind !== 'action' &&
      candidate.kind !== 'blessing')
  ) {
    return false;
  }

  const instructionValid =
    candidate.instruction === undefined ||
    (typeof candidate.instruction === 'string' &&
      candidate.instruction.trim().length > 0);

  if (!instructionValid) {
    return false;
  }

  const textValid = candidate.text.every(
    (paragraph) =>
      typeof paragraph === 'string' &&
      (paragraph.trim().length === 0 ||
        (hasHebrewContent(paragraph) && !hasUnexpectedHtml(paragraph))),
  );

  const instructionHebrew =
    candidate.instruction &&
    hasHebrewContent(candidate.instruction) &&
    !hasUnexpectedHtml(candidate.instruction);

  const hasContent =
    candidate.text.some((paragraph) => paragraph.trim().length > 0) ||
    Boolean(instructionHebrew);

  return textValid && hasContent;
}

export function validateRitualGuide(document: unknown): document is RitualGuide {
  if (!document || typeof document !== 'object') {
    return false;
  }

  const candidate = document as Partial<RitualGuide>;

  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.title) ||
    candidate.language !== 'he' ||
    typeof candidate.version !== 'number' ||
    candidate.availability !== 'complete' ||
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

  if (!candidate.sections.every((section) => validateRitualGuideSection(section))) {
    return false;
  }

  if (!validateSectionOrdering(candidate.sections)) {
    return false;
  }

  if (!validateUniqueSectionIds(candidate.sections)) {
    return false;
  }

  const catalogItem = RITUAL_GUIDE_CATALOG_BY_ID[candidate.id];
  if (!catalogItem) {
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

function getValidatedRitualGuide(
  guideId: string,
  nusach: PrayerNusach,
): RitualGuide | null {
  const document = RITUAL_GUIDE_CATALOG[nusach]?.[guideId];
  if (!document || !validateRitualGuide(document)) {
    return null;
  }

  return document;
}

export function getRitualGuide(
  guideId: string,
  nusach: PrayerNusach = 'edot_hamizrach',
): RitualGuide | null {
  return getValidatedRitualGuide(guideId, nusach);
}

export function getOrderedRitualSections(
  guide: RitualGuide,
): RitualGuideSection[] {
  return [...guide.sections].sort((left, right) => left.order - right.order);
}

export function hasLocalRitualGuide(guideId: string): boolean {
  return ALL_NUSACHIM.some(
    (nusach) => getValidatedRitualGuide(guideId, nusach) !== null,
  );
}

export function getRitualGuideIdForMitzvah(mitzvahId: string): string | null {
  return MITZVAH_RITUAL_GUIDE_IDS[mitzvahId] ?? null;
}

export function hasLocalRitualGuideForMitzvah(mitzvahId: string): boolean {
  const guideId = getRitualGuideIdForMitzvah(mitzvahId);
  return guideId ? hasLocalRitualGuide(guideId) : false;
}

export function canOpenRitualGuide(guideId: string): boolean {
  return hasLocalRitualGuide(guideId);
}

export function getAvailableRitualGuideNusachim(
  guideId: string,
): PrayerNusach[] {
  return ALL_NUSACHIM.filter(
    (nusach) => getValidatedRitualGuide(guideId, nusach) !== null,
  );
}

export function listRitualGuideCatalog(): RitualGuideCatalogItem[] {
  return [...RITUAL_GUIDE_CATALOG_ITEMS];
}

export function getRitualGuideCatalogItem(
  guideId: string,
): RitualGuideCatalogItem | null {
  return RITUAL_GUIDE_CATALOG_BY_ID[guideId] ?? null;
}

export function getRitualGuideCatalogItemForMitzvah(
  mitzvahId: string,
): RitualGuideCatalogItem | null {
  const guideId = getRitualGuideIdForMitzvah(mitzvahId);
  return guideId ? getRitualGuideCatalogItem(guideId) : null;
}

export function listAvailableRitualGuideNusachimWithStatus(guideId: string): Array<{
  nusach: PrayerNusach;
  available: boolean;
}> {
  return ALL_NUSACHIM.map((nusach) => ({
    nusach,
    available: getValidatedRitualGuide(guideId, nusach) !== null,
  }));
}
