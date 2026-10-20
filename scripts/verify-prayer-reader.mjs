/**
 * Prayer Reader verification — offline local prayer content and reader UI.
 * Run: npm run verify:prayer-reader
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcRoot = join(root, 'src');

const results = [];
const PLACEHOLDER_PATTERN =
  /\b(TODO|TBD|placeholder|lorem ipsum|excerpt)\b|\.{3}$/i;
const ALLOWED_LICENSES = new Set(['CC0', 'Public Domain', 'public domain', 'unverified']);
const SHACHARIT_ALWAYS_SECTIONS = [
  'modeh-ani',
  'birkot-hashachar',
  'torah-blessings',
  'pesukei-dzimra',
  'kriat-shema',
  'amida',
  'alenu',
];
const SHACHARIT_CONDITIONAL_SECTIONS = [
  'tachanun',
  'torah-reading',
  'shir-shel-yom',
];
const TEFILLIN_PROCEDURAL_ORDER = [
  'hachana',
  'leshem-yichud',
  'tefillin-shel-yad',
  'tefillin-shel-rosh',
  'seder-hakrichot',
  'parshiot',
];
const MINCHA_SECTION_IDS = ['korbanot', 'amida', 'tachanun', 'alenu'];
const ARVIT_SECTION_IDS = ['barchu', 'arvit-shema', 'amida', 'alenu'];
const KRIAT_SHEMA_SECTION_IDS = [
  'birkot-kriat-shema',
  'parshat-shema',
  'vehaya-im-shamoa',
];

function stripNikudAndCantillation(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function paragraphLooksLikeTefillinBlessing(paragraph) {
  const stripped = stripNikudAndCantillation(paragraph);
  return (
    stripped.includes('להניח תפילין') ||
    (stripped.includes('ברוך אתה') &&
      stripped.includes('תפילין') &&
      stripped.includes('צונו'))
  );
}

function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const status = pass ? 'PASS' : 'FAIL';
  console.log(`${status} - ${name}${detail ? ` (${detail})` : ''}`);
}

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function readSrc(relPath) {
  return readFileSync(join(srcRoot, relPath), 'utf8');
}

function parseJson(relPath) {
  return JSON.parse(read(relPath));
}

function hasNikud(text) {
  return /[\u0591-\u05C7]/.test(text);
}

function hasHebrew(text) {
  return /[\u0590-\u05FF]/.test(text);
}

function hasUnexpectedHtml(text) {
  return /<[^>]+>/.test(text);
}

function walkPrayerSourceFiles() {
  const files = [
    'src/constants/prayerCatalog.ts',
    'src/constants/ritualGuideCatalog.ts',
    'src/constants/shacharitStructure.ts',
    'src/services/texts/prayerContentService.ts',
    'src/services/texts/prayerSectionContext.ts',
    'src/services/texts/ritualContentService.ts',
    'src/services/texts/prayerReaderPreferences.ts',
    'src/screens/prayer/PrayerReaderScreen.tsx',
    'src/screens/mitzvot/MitzvahDetailScreen.tsx',
    'src/navigation/RootNavigator.tsx',
    'src/navigation/types.ts',
    'src/types/prayer.ts',
    'src/types/ritualGuide.ts',
  ];

  return files.map((file) => read(file)).join('\n');
}

function listBundledPrayerJsonFiles() {
  const prayersRoot = join(root, 'src/content/prayers');
  const files = [];

  for (const nusachFolder of readdirSync(prayersRoot)) {
    const folderPath = join(prayersRoot, nusachFolder);
    if (!statSync(folderPath).isDirectory()) {
      continue;
    }

    for (const fileName of readdirSync(folderPath)) {
      if (fileName.endsWith('.json') && fileName !== 'tefillin.json') {
        files.push(`src/content/prayers/${nusachFolder}/${fileName}`);
      }
    }
  }

  return files.sort();
}

function validateBundledDocument(relPath, catalogById) {
  const prefix = relPath.split('/').pop().replace('.json', '');
  let document;

  try {
    document = parseJson(relPath);
  } catch (error) {
    record(`${prefix}: valid JSON`, false, String(error));
    return;
  }

  record(`${prefix}: valid JSON`, true);

  const catalogItem = catalogById[document.id];
  record(`${prefix}: id present`, typeof document.id === 'string' && document.id.length > 0);
  record(`${prefix}: title present`, typeof document.title === 'string' && document.title.length > 0);
  record(`${prefix}: nusach present`, typeof document.nusach === 'string' && document.nusach.length > 0);
  record(`${prefix}: availability present`, document.availability === 'complete' || document.availability === 'partial');
  record(`${prefix}: catalog entry exists`, Boolean(catalogItem));
  record(
    `${prefix}: availability matches catalog`,
    catalogItem ? catalogItem.availability === document.availability : false,
  );
  record(
    `${prefix}: title matches catalog`,
    catalogItem ? catalogItem.title === document.title : false,
  );
  record(
    `${prefix}: section count matches catalog`,
    catalogItem ? catalogItem.sections === document.sections.length : false,
  );

  const sectionIds = document.sections.map((section) => section.id);
  const uniqueSectionIds = new Set(sectionIds);
  record(`${prefix}: no duplicate section IDs`, uniqueSectionIds.size === sectionIds.length);

  const sortedOrders = [...document.sections]
    .map((section) => section.order)
    .sort((left, right) => left - right);
  const orderedCorrectly = sortedOrders.every((order, index) => order === index + 1);
  record(`${prefix}: section ordering`, orderedCorrectly);

  const nonEmptyText = document.sections.every(
    (section) =>
      Array.isArray(section.text) &&
      section.text.length > 0 &&
      section.text.every((paragraph) => typeof paragraph === 'string' && paragraph.trim().length > 0),
  );
  record(`${prefix}: non-empty text`, nonEmptyText);

  const hebrewText = document.sections.every((section) =>
    section.text.every((paragraph) => hasHebrew(paragraph)),
  );
  record(`${prefix}: Hebrew content`, hebrewText);

  const noHtml = document.sections.every((section) =>
    section.text.every((paragraph) => !hasUnexpectedHtml(paragraph)),
  );
  record(`${prefix}: no unexpected HTML`, noHtml);

  const noPlaceholders = document.sections.every((section) =>
    section.text.every((paragraph) => !PLACEHOLDER_PATTERN.test(paragraph)),
  );
  record(`${prefix}: no placeholder content`, noPlaceholders);

  const nikudPreserved = document.sections.some((section) =>
    section.text.some((paragraph) => hasNikud(paragraph)),
  );
  record(`${prefix}: nikud preserved`, nikudPreserved);

  const serialized = JSON.stringify(document);
  record(`${prefix}: no excerpt metadata`, !serialized.includes('"excerpt"'));
}

function validateRitualGuideDocument(relPath, catalogById) {
  const prefix = relPath.split('/').pop().replace('.json', '');
  let document;

  try {
    document = parseJson(relPath);
  } catch (error) {
    record(`${prefix}: valid JSON`, false, String(error));
    return;
  }

  record(`${prefix}: valid JSON`, true);

  const catalogItem = catalogById[document.id];
  record(`${prefix}: catalog entry exists`, Boolean(catalogItem));
  record(`${prefix}: availability complete`, document.availability === 'complete');
  record(`${prefix}: nusach edot_hamizrach`, document.nusach === 'edot_hamizrach');
  record(
    `${prefix}: section count matches catalog`,
    catalogItem ? catalogItem.sections === document.sections.length : false,
  );

  const sectionIds = document.sections.map((section) => section.id);
  record(`${prefix}: no duplicate section IDs`, new Set(sectionIds).size === sectionIds.length);

  const orderedCorrectly = [...document.sections]
    .map((section) => section.order)
    .sort((left, right) => left - right)
    .every((order, index) => order === index + 1);
  record(`${prefix}: section ordering`, orderedCorrectly);

  const hasBlessing = document.sections.some((section) =>
    section.text.some((paragraph) => paragraph.includes('לְהָנִיחַ תְּפִלִּין')),
  );
  record(`${prefix}: blessing text present`, hasBlessing);

  const hasStepSections = document.sections.some((section) => section.kind === 'step');
  record(`${prefix}: step sections present`, hasStepSections);

  const noHtml = document.sections.every((section) => {
    const instructionClean =
      !section.instruction || !hasUnexpectedHtml(section.instruction);
    const textClean = section.text.every((paragraph) => !hasUnexpectedHtml(paragraph));
    return instructionClean && textClean;
  });
  record(`${prefix}: no unexpected HTML`, noHtml);

  const hasContent = document.sections.every((section) => {
    const instructionText = section.instruction?.trim() ?? '';
    const textParagraphs = section.text.filter((paragraph) => paragraph.trim().length > 0);
    return instructionText.length > 0 || textParagraphs.length > 0;
  });
  record(`${prefix}: non-empty sections`, hasContent);
}

// ─── Catalog registry ────────────────────────────────────────────────────────

const catalogSource = readSrc('constants/prayerCatalog.ts');
const ritualCatalogSource = readSrc('constants/ritualGuideCatalog.ts');
const serviceSource = readSrc('services/texts/prayerContentService.ts');
const ritualServiceSource = readSrc('services/texts/ritualContentService.ts');
const preferencesSource = readSrc('services/texts/prayerReaderPreferences.ts');
const storageSource = read('src/utils/storage.ts');
const shacharitStructureSource = readSrc('constants/shacharitStructure.ts');
const prayerSectionContextSource = readSrc('services/texts/prayerSectionContext.ts');
const readerSource = readSrc('screens/prayer/PrayerReaderScreen.tsx');
const navigatorSource = read('src/navigation/RootNavigator.tsx');
const navTypesSource = read('src/navigation/types.ts');
const detailSource = readSrc('screens/mitzvot/MitzvahDetailScreen.tsx');
const typesSource = readSrc('types/prayer.ts');
const ritualTypesSource = readSrc('types/ritualGuide.ts');
const docsSource = read('docs/prayer-content.md');

record('catalog: registry file exists', catalogSource.includes('PRAYER_CATALOG_ITEMS'));
record('catalog: PrayerCatalogItem type exported', typesSource.includes('interface PrayerCatalogItem'));
record('catalog: availability type exported', typesSource.includes("'complete' | 'partial' | 'pending'"));
record('catalog: kriat-shema partial', catalogSource.includes("id: 'kriat-shema'") && /kriat-shema[\s\S]*?availability: 'partial'/.test(catalogSource));
record('catalog: context field on items', catalogSource.includes("context: 'morning'") && catalogSource.includes("context: 'afternoon'") && catalogSource.includes("context: 'evening'"));
record(
  'catalog: shacharit complete',
  catalogSource.includes("id: 'shacharit'") &&
    /shacharit[\s\S]*?availability: 'complete'/.test(catalogSource),
);
record('catalog: mincha complete', catalogSource.includes("id: 'mincha'") && /mincha[\s\S]*?availability: 'complete'/.test(catalogSource));
record('catalog: arvit complete', catalogSource.includes("id: 'arvit'") && /arvit[\s\S]*?availability: 'complete'/.test(catalogSource));
record(
  'catalog: birkat-hamazon pending',
  catalogSource.includes("id: 'birkat-hamazon'") &&
    /birkat-hamazon[\s\S]*?availability: 'pending'/.test(catalogSource),
);

const catalogItems = [
  { id: 'kriat-shema', title: 'קריאת שמע', availability: 'partial', sections: 3 },
  { id: 'shacharit', title: 'תפילת שחרית', availability: 'complete', sections: 19 },
  { id: 'mincha', title: 'תפילת מנחה', availability: 'complete', sections: 4 },
  { id: 'arvit', title: 'תפילת ערבית', availability: 'complete', sections: 4 },
  { id: 'birkat-hamazon', title: 'ברכת המזון', availability: 'pending', sections: 0 },
];
const catalogById = Object.fromEntries(catalogItems.map((item) => [item.id, item]));

const ritualCatalogItems = [
  {
    id: 'tefillin',
    title: 'סדר הנחת תפילין וברכות',
    mitzvahId: 'tefillin',
    sections: 6,
  },
];
const ritualCatalogById = Object.fromEntries(
  ritualCatalogItems.map((item) => [item.id, item]),
);

record('ritual catalog: registry exists', ritualCatalogSource.includes('RITUAL_GUIDE_CATALOG_ITEMS'));
record('ritual types exported', ritualTypesSource.includes('interface RitualGuide'));
record('service: listPrayerCatalog exported', serviceSource.includes('export function listPrayerCatalog'));
record('service: getPrayer exported', serviceSource.includes('export function getPrayer'));
record('service: canOpenPrayerReader exported', serviceSource.includes('export function canOpenPrayerReader'));
record('service: no runtime fetch', !serviceSource.includes('fetch(') && !serviceSource.includes('sefaria'));
record('ritual service: getRitualGuide exported', ritualServiceSource.includes('export function getRitualGuide'));
record('ritual service: canOpenRitualGuide exported', ritualServiceSource.includes('export function canOpenRitualGuide'));
record('ritual service: no runtime fetch', !ritualServiceSource.includes('fetch(') && !ritualServiceSource.includes('sefaria'));

// ─── Bundled documents ───────────────────────────────────────────────────────

const bundledFiles = listBundledPrayerJsonFiles();
record('content: bundled prayer JSON files discovered', bundledFiles.length === 4, bundledFiles.join(', '));
record('content: tefillin guide bundled', existsSync(join(root, 'src/content/prayers/edot-hamizrach/tefillin.json')));
record('content: mincha bundled', existsSync(join(root, 'src/content/prayers/edot-hamizrach/mincha.json')));
record('content: arvit bundled', existsSync(join(root, 'src/content/prayers/edot-hamizrach/arvit.json')));

for (const relPath of bundledFiles) {
  validateBundledDocument(relPath, catalogById);
}

validateRitualGuideDocument(
  'src/content/prayers/edot-hamizrach/tefillin.json',
  ritualCatalogById,
);

const shacharitDocument = parseJson('src/content/prayers/edot-hamizrach/shacharit.json');
const kriatShemaDocument = parseJson('src/content/prayers/edot-hamizrach/kriat-shema.json');
record('shacharit: availability complete', shacharitDocument.availability === 'complete');
record('shacharit: more than one section', shacharitDocument.sections.length > 1);
record(
  'shacharit: expected major sections present',
  ['birkot-hashachar', 'pesukei-dzimra', 'kriat-shema', 'amida', 'alenu'].every((sectionId) =>
    shacharitDocument.sections.some((section) => section.id === sectionId),
  ),
);
record(
  'shacharit: no modim excerpt marker',
  shacharitDocument.sections[0].id !== 'modim' || shacharitDocument.sections.length > 1,
);
record(
  'shacharit: source metadata present',
  Boolean(shacharitDocument.source?.provider && shacharitDocument.source?.reference),
);
record(
  'shacharit: source license recorded',
  Boolean(shacharitDocument.source?.license) &&
    ALLOWED_LICENSES.has(shacharitDocument.source.license),
);
record(
  'shacharit: per-section source audit complete',
  shacharitDocument.sections.every(
    (section) =>
      section.source?.provider === 'Sefaria' &&
      section.source?.reference &&
      section.source?.verifiedAt &&
      section.source?.license !== 'unverified',
  ),
);
record(
  'shacharit: production source audit summary',
  shacharitDocument.source?.auditSummary?.includes('All sections verified'),
);
record(
  'shacharit: source version title recorded',
  Boolean(shacharitDocument.source?.versionTitle),
);
record(
  'shacharit: availability complete',
  shacharitDocument.availability === 'complete',
);
record(
  'kriat-shema: availability partial',
  kriatShemaDocument.availability === 'partial',
);
record(
  'kriat-shema: morning context',
  kriatShemaDocument.context === 'morning',
);
record(
  'kriat-shema: documentContext shacharit-shema',
  kriatShemaDocument.documentContext === 'shacharit-shema',
);
record(
  'kriat-shema: expected section structure',
  KRIAT_SHEMA_SECTION_IDS.every(
    (sectionId, index) => kriatShemaDocument.sections[index]?.id === sectionId,
  ),
);
const kriatShemaBirkot = kriatShemaDocument.sections.find(
  (section) => section.id === 'birkot-kriat-shema',
);
record(
  'kriat-shema: no tefillin blessing in birkot',
  kriatShemaBirkot
    ? !kriatShemaBirkot.text.some((paragraph) =>
        paragraphLooksLikeTefillinBlessing(paragraph),
      )
    : false,
);
record(
  'kriat-shema: source metadata present',
  Boolean(kriatShemaDocument.source?.provider && kriatShemaDocument.source?.reference),
);
record(
  'kriat-shema: source license verified',
  Boolean(kriatShemaDocument.source?.license) &&
    kriatShemaDocument.source.license !== 'unverified',
);
record(
  'kriat-shema: provenance audit date recorded',
  Boolean(kriatShemaDocument.source?.verifiedAt),
);
record(
  'kriat-shema: not marked production-complete',
  kriatShemaDocument.availability !== 'complete',
);

const minchaDocument = parseJson('src/content/prayers/edot-hamizrach/mincha.json');
record('mincha: availability complete', minchaDocument.availability === 'complete');
record('mincha: afternoon context', minchaDocument.context === 'afternoon');
record(
  'mincha: expected section structure',
  MINCHA_SECTION_IDS.every(
    (sectionId, index) => minchaDocument.sections[index]?.id === sectionId,
  ),
);
record(
  'mincha: source metadata present',
  Boolean(minchaDocument.source?.provider && minchaDocument.source?.reference),
);
record(
  'mincha: source license recorded',
  Boolean(minchaDocument.source?.license) &&
    ALLOWED_LICENSES.has(minchaDocument.source.license),
);

const arvitDocument = parseJson('src/content/prayers/edot-hamizrach/arvit.json');
record('arvit: availability complete', arvitDocument.availability === 'complete');
record('arvit: evening context', arvitDocument.context === 'evening');
record(
  'arvit: arvit-shema distinct section id',
  arvitDocument.sections.some((section) => section.id === 'arvit-shema'),
);
record(
  'arvit: expected section structure',
  ARVIT_SECTION_IDS.every(
    (sectionId, index) => arvitDocument.sections[index]?.id === sectionId,
  ),
);
record(
  'arvit: source metadata present',
  Boolean(arvitDocument.source?.provider && arvitDocument.source?.reference),
);
record(
  'arvit: source license recorded',
  Boolean(arvitDocument.source?.license) &&
    ALLOWED_LICENSES.has(arvitDocument.source.license),
);
record(
  'shacharit: structure metadata exported',
  shacharitStructureSource.includes('SHACHARIT_SECTION_META') &&
    shacharitStructureSource.includes('SHACHARIT_TOC_CATEGORIES'),
);
record(
  'shacharit: always sections classified',
  SHACHARIT_ALWAYS_SECTIONS.every(
    (sectionId) =>
      shacharitStructureSource.includes(sectionId) &&
      /availability:\s*'always'/.test(
        shacharitStructureSource.slice(
          shacharitStructureSource.indexOf(sectionId),
          shacharitStructureSource.indexOf(sectionId) + 120,
        ),
      ),
  ),
);
record(
  'shacharit: conditional sections classified',
  SHACHARIT_CONDITIONAL_SECTIONS.every((sectionId) =>
    shacharitStructureSource.includes(sectionId) &&
    shacharitStructureSource.includes('conditional'),
  ),
);
record(
  'shacharit: section context helpers exported',
  prayerSectionContextSource.includes('export function isSectionApplicableToday') &&
    prayerSectionContextSource.includes('export function getSectionAvailabilityNote'),
);
record(
  'shacharit: toc categories cover all sections',
  shacharitDocument.sections.every((section) =>
    shacharitStructureSource.includes(`'${section.id}'`),
  ),
);

const tefillinDocument = parseJson('src/content/prayers/edot-hamizrach/tefillin.json');
record(
  'tefillin: procedural order explicit',
  TEFILLIN_PROCEDURAL_ORDER.every(
    (sectionId, index) => tefillinDocument.sections[index]?.id === sectionId,
  ),
);
record(
  'tefillin: yad before rosh',
  tefillinDocument.sections.findIndex((section) => section.id === 'tefillin-shel-yad') <
    tefillinDocument.sections.findIndex((section) => section.id === 'tefillin-shel-rosh'),
);
record(
  'tefillin: action sections present',
  tefillinDocument.sections.some((section) => section.kind === 'action'),
);
record(
  'tefillin: blessing on shel yad',
  tefillinDocument.sections
    .find((section) => section.id === 'tefillin-shel-yad')
    ?.text.some((paragraph) => paragraph.includes('לְהָנִיחַ תְּפִלִּין')),
);
record(
  'tefillin: nusach-qualified instructions',
  tefillinDocument.sections.some((section) =>
    section.instruction?.includes('לפי נוסח עדות המזרח'),
  ),
);
record(
  'tefillin: source metadata present',
  Boolean(tefillinDocument.source?.provider && tefillinDocument.source?.reference),
);
record(
  'tefillin: source license recorded',
  Boolean(tefillinDocument.source?.license) &&
    ALLOWED_LICENSES.has(tefillinDocument.source.license),
);
record(
  'tefillin: source version title recorded',
  Boolean(tefillinDocument.source?.versionTitle),
);
record(
  'tefillin: per-section source audit complete',
  tefillinDocument.sections.every(
    (section) =>
      section.source?.provider === 'Sefaria' &&
      section.source?.reference &&
      section.source?.verifiedAt &&
      section.source?.license !== 'unverified',
  ),
);
record(
  'tefillin: production source audit summary',
  tefillinDocument.source?.auditSummary?.includes('Verified against Sefaria'),
);

// ─── Preferences ─────────────────────────────────────────────────────────────

record(
  'preferences: font size storage keys',
  storageSource.includes('prayerReaderFontSize') &&
    storageSource.includes('prayerReaderPosition') &&
    storageSource.includes('prayerReaderNusach'),
);
record(
  'preferences: font size helpers exported',
  preferencesSource.includes('export async function getPrayerFontSize') &&
    preferencesSource.includes('export async function setPrayerFontSize'),
);
record(
  'preferences: reading position helpers exported',
  preferencesSource.includes('export async function getPrayerReadingPosition') &&
    preferencesSource.includes('export async function savePrayerReadingPosition'),
);
record('preferences: no Supabase usage', !preferencesSource.includes('supabase'));

// ─── Reader screen ───────────────────────────────────────────────────────────

record('reader screen exists', readerSource.includes('export function PrayerReaderScreen'));
record(
  'reader: RTL text styles',
  readerSource.includes('prayerRtlText') ||
    readerSource.includes('prayerRtlBlock') ||
    readerSource.includes("writingDirection: 'rtl'"),
);
record('reader: font controls A-/A+', readerSource.includes('A-') && readerSource.includes('A+'));
record(
  'reader: section navigator',
  readerSource.includes('SectionNavigator') && readerSource.includes('scrollToSection'),
);
record(
  'reader: table of contents modal',
  readerSource.includes('SectionTableOfContents') &&
    readerSource.includes('תוכן העניינים'),
);
record(
  'reader: conditional section styling',
  readerSource.includes('availabilityNote') && readerSource.includes('applicableToday'),
);
const themeSource = readSrc('constants/theme.ts');
const layoutSource = readSrc('constants/prayerReaderLayout.ts');
record(
  'reader: prayerSectionSurface semantic token',
  themeSource.includes('prayerSectionSurface') &&
    readerSource.includes('surfaces.prayerSectionSurface'),
);
record(
  'reader: major section surface cards',
  layoutSource.includes('PRAYER_MAJOR_SURFACE_SECTION_IDS') &&
    readerSource.includes('isMajorPrayerSurfaceSection') &&
    readerSource.includes('borderRadius.lg'),
);
record(
  'reader: no hardcoded reader background hex',
  !readerSource.includes("const READER_BACKGROUND = '#FDFCF9'") &&
    readerSource.includes('surfaces.prayerReaderBackground'),
);
record(
  'reader: major section title hierarchy',
  readerSource.includes("fontWeight: showMajorSurface ? '700' : '600'") &&
    readerSource.includes('color: colors.text'),
);
record(
  'reader: ritual kind labels',
  readerSource.includes('getRitualKindLabel') &&
    readerSource.includes('פעולה') &&
    readerSource.includes('ברכה'),
);
record('reader: resume banner', readerSource.includes('המשך מהמקום האחרון'));
record(
  'reader: ritual guide section block',
  readerSource.includes('RitualGuideSectionBlock') && readerSource.includes('stepNumber'),
);
record(
  'reader: no loading network state',
  !readerSource.includes('טוען') && !readerSource.includes('fetch('),
);
record('navigation: PrayerReader registered', navigatorSource.includes('name="PrayerReader"'));
record(
  'navigation: route params',
  navTypesSource.includes('ritualGuideId?: string') &&
    navTypesSource.includes('prayerId?: string'),
);
record('font sizes defined', typesSource.includes('[18, 20, 22, 24, 26, 28]'));

// ─── Mitzvah detail UI ───────────────────────────────────────────────────────

record(
  'mitzvah detail: complete CTA label',
  detailSource.includes('פתח את סדר התפילה המלא'),
);
record(
  'mitzvah detail: partial CTA label',
  detailSource.includes("'פתח את סדר התפילה'"),
);
record('mitzvah detail: partial badge', detailSource.includes('תוכן חלקי'));
record(
  'mitzvah detail: pending message',
  detailSource.includes('סדר התפילה המלא יהיה זמין לאחר הוספת תוכן מאומת'),
);
record(
  'mitzvah detail: tefillin guide CTA',
  detailSource.includes('פתח סדר הנחת תפילין וברכות'),
);
record(
  'mitzvah detail: uses canOpenRitualGuide',
  detailSource.includes('canOpenRitualGuide'),
);
record(
  'mitzvah detail: navigates to reader',
  detailSource.includes("navigation.navigate('PrayerReader'"),
);
record(
  'mitzvah detail: no embedded prayer snippet',
  !detailSource.includes('PrayerText') && !detailSource.includes('getMitzvahPrayer'),
);
record(
  'mitzvah detail: no outer audio controls',
  !detailSource.includes('MitzvahAudioControls'),
);
const readerAudioSource = readSrc('components/prayer/PrayerReaderAudioControls.tsx');
record(
  'reader: in-reader audio controls',
  readerSource.includes('PrayerReaderAudioControls') &&
    readerAudioSource.includes('▶ השמע') &&
    readerAudioSource.includes('■ עצור'),
);
record(
  'reader: audio stop on blur',
  readerSource.includes('stopSpeaking'),
);
record(
  'types: PrayerContext exported',
  typesSource.includes("export type PrayerContext"),
);
record(
  'types: document context on PrayerDocument',
  typesSource.includes('documentContext: string'),
);
record(
  'service: mincha import registered',
  serviceSource.includes("mincha: minchaEdot"),
);
record(
  'service: arvit import registered',
  serviceSource.includes("arvit: arvitEdot"),
);

// ─── Offline / security static scan ──────────────────────────────────────────

const prayerSources = walkPrayerSourceFiles();
record(
  'offline: no sefaria runtime dependency',
  !prayerSources.includes('sefaria.org') && !prayerSources.includes('fetch('),
);
record(
  'security: no auth dependency in reader path',
  !readerSource.includes('useUserStore') && !readerSource.includes('supabase'),
);
record(
  'security: no API key requirement',
  !prayerSources.toLowerCase().includes('api_key') &&
    !prayerSources.toLowerCase().includes('apikey'),
);

// ─── Missing prayer safe state ───────────────────────────────────────────────

record(
  'missing prayer safe empty state',
  readerSource.includes('התוכן המקומי לתפילה זו אינו זמין עדיין'),
);
record(
  'nusach availability labels',
  readerSource.includes('בקרוב') && readerSource.includes('NUSACH_LABELS'),
);

// ─── Documentation ───────────────────────────────────────────────────────────

record('docs: prayer content contract exists', docsSource.includes('src/content/prayers/{nusach}/{prayerId}.json'));
record('docs: schema documented', docsSource.includes('"availability": "complete"'));
record('docs: verification requirements documented', docsSource.includes('npm run verify:prayer-reader'));
record('docs: source attribution documented', docsSource.includes('Do not invent prayer text'));
record(
  'types: PrayerSectionAvailability exported',
  typesSource.includes("export type PrayerSectionAvailability"),
);
record(
  'types: PrayerSourceMetadata verifiedAt exported',
  typesSource.includes('verifiedAt?: string'),
);

// ─── Summary ─────────────────────────────────────────────────────────────────

const failed = results.filter((entry) => !entry.pass);
console.log('\n--- Summary ---');
console.log(`Total: ${results.length}`);
console.log(`Passed: ${results.length - failed.length}`);
console.log(`Failed: ${failed.length}`);

if (failed.length > 0) {
  console.log('\nFailed checks:');
  for (const entry of failed) {
    console.log(`- ${entry.name}${entry.detail ? `: ${entry.detail}` : ''}`);
  }
  process.exit(1);
}

console.log('\nPrayer Reader infrastructure: PASS');
console.log('Prayer availability: kriat-shema=partial, shacharit=complete, mincha=complete, arvit=complete');
console.log('Ritual guide availability: tefillin=complete');
console.log('Prayer content pending verified source: birkat-hamazon');
