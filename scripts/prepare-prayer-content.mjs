/**
 * Content preparation — fetches verified Sefaria text for local bundling.
 * NOT used at runtime. Run manually: node scripts/prepare-prayer-content.mjs
 *
 * Requires CC0 (or Public Domain) license on the Hebrew version.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, 'src/content/prayers/edot-hamizrach');

const ALLOWED_LICENSES = new Set(['CC0', 'Public Domain', 'public domain']);
const ACCESS_DATE = '2026-09-14';
const SOURCE_PROVIDER = 'Sefaria';
const SOURCE_VERSION = 'Shaliehsaboo Edition';

const SHACHARIT_SECTION_AVAILABILITY = {
  'modeh-ani': { availability: 'always' },
  'birkot-hashachar': { availability: 'always' },
  'torah-blessings': { availability: 'always' },
  'petichat-eliyahu': { availability: 'always' },
  'hanas-prayer': { availability: 'always' },
  'morning-prayer': { availability: 'always' },
  korbanot: { availability: 'always' },
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

const SHACHARIT_SECTIONS = [
  {
    id: 'modeh-ani',
    title: 'מודה אני',
    ref: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Modeh_Ani',
  },
  {
    id: 'birkot-hashachar',
    title: 'ברכות השחר',
    ref: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Morning_Blessings',
  },
  {
    id: 'torah-blessings',
    title: 'ברכות התורה',
    ref: 'Siddur_Edot_HaMizrach,_Preparatory_Prayers,_Torah_Blessings',
  },
  {
    id: 'petichat-eliyahu',
    title: 'פתיחת אליהו',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Petichat_Eliyahu',
  },
  {
    id: 'hanas-prayer',
    title: 'ותתפלל חנה',
    ref: "Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Hanna's_Prayer",
  },
  {
    id: 'morning-prayer',
    title: 'תפילת שחרית — פרשת העקדה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Morning_Prayer',
  },
  {
    id: 'korbanot',
    title: 'סדר הקרבנות / פטום הקטורת',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Incense_Offering',
  },
  {
    id: 'hodu',
    title: 'הודו',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Hodu',
  },
  {
    id: 'pesukei-dzimra',
    title: 'פסוקי דזמרה',
    ref: "Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Pesukei_D'Zimra",
  },
  {
    id: 'kriat-shema',
    title: 'קריאת שמע וברכותיה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_The_Shema',
  },
  {
    id: 'amida',
    title: 'תפילת העמידה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Amida',
  },
  {
    id: 'tachanun',
    title: 'תחנון / וידוי',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Vidui',
  },
  {
    id: 'torah-reading',
    title: 'קריאת התורה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Torah_Reading',
  },
  {
    id: 'ashrei',
    title: 'אשרי',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Ashrei',
  },
  {
    id: 'uva-lesion',
    title: 'ובא לציון',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Uva_LeSion',
  },
  {
    id: 'beit-yaakov',
    title: 'בית יעקב',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Beit_Yaakov',
  },
  {
    id: 'shir-shel-yom',
    title: 'שיר של יום',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Song_of_the_Day',
  },
  {
    id: 'kaveh',
    title: 'קוה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Kaveh',
  },
  {
    id: 'alenu',
    title: 'עלינו לשבח',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Alenu',
  },
];

const TEFILLIN_REF =
  'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Order_of_Tefillin';

function stripHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitParagraphs(rawParagraphs) {
  const paragraphs = [];

  for (const raw of rawParagraphs) {
    const cleaned = stripHtml(raw);
    if (!cleaned) {
      continue;
    }

    const parts = cleaned
      .split(/\n{2,}/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter((part) => part.length > 0);

    paragraphs.push(...parts);
  }

  return paragraphs;
}

function isInstructionParagraph(text) {
  return (
    text.startsWith('אחר ') ||
    text.startsWith('קודם ') ||
    text.startsWith('לפני ') ||
    text.startsWith('אם ') ||
    text.includes('יגמור הנחת') ||
    text.includes('יכרוך') ||
    text.includes('יאמר פרשת')
  );
}

async function assertLicense(ref) {
  const versionsUrl = `https://www.sefaria.org/api/texts/versions/${ref}`;
  const response = await fetch(versionsUrl);

  if (!response.ok) {
    throw new Error(`Failed to load versions for ${ref}: ${response.status}`);
  }

  const versions = await response.json();
  if (!Array.isArray(versions)) {
    throw new Error(`Unexpected versions payload for ${ref}`);
  }

  const hebrewVersions = versions.filter((version) => version.language === 'he');

  if (hebrewVersions.length === 0) {
    throw new Error(`No Hebrew version found for ${ref}`);
  }

  const licensed =
    hebrewVersions.find(
      (version) =>
        version.versionTitle?.trim() === SOURCE_VERSION &&
        ALLOWED_LICENSES.has(version.license),
    ) ??
    hebrewVersions.find((version) => ALLOWED_LICENSES.has(version.license));

  if (!licensed) {
    const licenses = hebrewVersions
      .map((version) => `${version.versionTitle ?? 'unknown'}:${version.license}`)
      .join(', ');
    throw new Error(
      `Blocked: ${ref} has no acceptable Hebrew version/license (found: ${licenses})`,
    );
  }

  if (!ALLOWED_LICENSES.has(licensed.license)) {
    throw new Error(
      `Blocked: ${ref} license "${licensed.license}" is not approved for bundling`,
    );
  }

  return licensed;
}

function buildSourceMetadata(reference, licensedVersion) {
  const license = licensedVersion.license ?? 'unverified';

  if (!ALLOWED_LICENSES.has(license)) {
    throw new Error(
      `Blocked: refusing to write content for ${reference} with unverified license`,
    );
  }

  return {
    provider: SOURCE_PROVIDER,
    reference,
    accessedAt: ACCESS_DATE,
    license,
    versionTitle: licensedVersion.versionTitle?.trim() ?? SOURCE_VERSION,
    verifiedAt: ACCESS_DATE,
  };
}

async function fetchSection(ref) {
  await assertLicense(ref);

  const textUrl = `https://www.sefaria.org/api/texts/${ref}?context=0&commentary=0&pad=0`;
  const response = await fetch(textUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${ref}: ${response.status}`);
  }

  const payload = await response.json();
  const rawParagraphs = Array.isArray(payload.he)
    ? payload.he
    : payload.he
      ? [payload.he]
      : [];

  if (rawParagraphs.length === 0) {
    throw new Error(`No Hebrew text returned for ${ref}`);
  }

  return splitParagraphs(rawParagraphs);
}

async function buildShacharitDocument() {
  const sections = [];
  const rootRef = 'Siddur_Edot_HaMizrach,_Weekday_Shacharit';
  const sourceLicense = await assertLicense(SHACHARIT_SECTIONS[0].ref);

  for (const [index, section] of SHACHARIT_SECTIONS.entries()) {
    const text = await fetchSection(section.ref);

    if (text.length === 0) {
      throw new Error(`Empty section after cleaning: ${section.id}`);
    }

    const availabilityMeta = SHACHARIT_SECTION_AVAILABILITY[section.id];
    if (!availabilityMeta) {
      throw new Error(`Missing availability metadata for section: ${section.id}`);
    }

    sections.push({
      id: section.id,
      title: section.title,
      order: index + 1,
      availability: availabilityMeta.availability,
      ...(availabilityMeta.availabilityNote
        ? { availabilityNote: availabilityMeta.availabilityNote }
        : {}),
      text,
    });

    console.log(`  ✓ ${section.id} (${text.length} paragraphs)`);
  }

  return {
    id: 'shacharit',
    title: 'תפילת שחרית',
    nusach: 'edot_hamizrach',
    language: 'he',
    version: 2,
    availability: 'complete',
    source: buildSourceMetadata(rootRef, sourceLicense),
    sections,
  };
}

async function buildTefillinGuide() {
  const sourceLicense = await assertLicense(TEFILLIN_REF);
  const textUrl = `https://www.sefaria.org/api/texts/${TEFILLIN_REF}?context=0&commentary=0&pad=0`;
  const response = await fetch(textUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch tefillin guide: ${response.status}`);
  }

  const payload = await response.json();
  const rawParagraphs = Array.isArray(payload.he) ? payload.he : [payload.he];
  const cleaned = splitParagraphs(rawParagraphs);

  if (cleaned.length < 3) {
    throw new Error('Tefillin guide content appears truncated');
  }

  const blessingParagraph = cleaned[2] ?? '';
  const blessingParts = blessingParagraph.split(' אם הפסיק');
  const mainBlessing = blessingParts[0]?.trim() ?? '';
  const roshInterruption =
    blessingParts.length > 1 ? `אם הפסיק${blessingParts[1]}` : '';

  const sections = [
    {
      id: 'hachana',
      title: 'הכנה',
      kind: 'instruction',
      order: 1,
      instruction:
        'לפי נוסח עדות המזרח: בדוק שהתפילין תקינים, שהרצועות מסודרות, ושהנחת התפילין נעשית בזמן שחרית בימי חול.',
      text: cleaned[0] ? [cleaned[0]] : [],
    },
    {
      id: 'leshem-yichud',
      title: 'לשם יחוד',
      kind: 'text',
      order: 2,
      text: cleaned[1] ? [cleaned[1]] : [],
    },
    {
      id: 'tefillin-shel-yad',
      title: 'תפילין של יד',
      kind: 'action',
      order: 3,
      instruction:
        'לפי נוסח עדות המזרח: הנח תחילה תפילין של יד על הזרוע השמאלית (איטר יד ימין מניח על זרוע ימין), כשהקשירה פונה ללב, ואחר כך תפילין של ראש.',
      text: mainBlessing ? [mainBlessing] : [],
    },
    {
      id: 'tefillin-shel-rosh',
      title: 'תפילין של ראש',
      kind: 'action',
      order: 4,
      instruction:
        'לפי נוסח עדות המזרח: הנח תפילין של ראש במקום המיועד, מעל הקו האמצעי של המצח.',
      text: roshInterruption ? [roshInterruption] : [],
    },
    {
      id: 'seder-hakrichot',
      title: 'סדר הכריכות',
      kind: 'step',
      order: 5,
      instruction:
        cleaned.find((paragraph) => isInstructionParagraph(paragraph)) ?? '',
      text: [],
    },
    {
      id: 'parshiot',
      title: 'פרשיות נלוות',
      kind: 'text',
      order: 6,
      instruction:
        'לפי נוסח עדות המזרח: אחר הנחת התפילין מופיעה כאן פרשת והיה כי יביאך בלבד. פרשיות נוספות אינן כלולות בקטע זה.',
      text: cleaned.filter(
        (paragraph) =>
          !isInstructionParagraph(paragraph) &&
          paragraph !== cleaned[0] &&
          paragraph !== cleaned[1] &&
          paragraph !== cleaned[2] &&
          !paragraph.includes('פרשת קדש'),
      ),
    },
  ].map((section) => ({
    ...section,
    text: section.text.filter((paragraph) => paragraph.length > 0),
  }));

  for (const section of sections) {
    const hasContent =
      (section.instruction && section.instruction.length > 0) ||
      section.text.length > 0;

    if (!hasContent) {
      throw new Error(`Empty tefillin section: ${section.id}`);
    }
  }

  return {
    id: 'tefillin',
    title: 'סדר הנחת תפילין וברכות',
    nusach: 'edot_hamizrach',
    language: 'he',
    version: 2,
    availability: 'complete',
    source: buildSourceMetadata(TEFILLIN_REF, sourceLicense),
    sections,
  };
}

const MINCHA_SECTIONS = [
  {
    id: 'korbanot',
    title: 'סדר הקרבנות',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Offerings',
    availability: 'always',
  },
  {
    id: 'amida',
    title: 'תפילת העמידה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Amida',
    availability: 'always',
  },
  {
    id: 'tachanun',
    title: 'תחנון / וידוי',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Vidui',
    availability: 'conditional',
    availabilityNote: 'לא נאמר בשבת, בראש חודש ובימים טובים',
  },
  {
    id: 'alenu',
    title: 'עלינו לשבח',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Mincha,_Alenu',
    availability: 'always',
  },
];

const ARVIT_SECTIONS = [
  {
    id: 'barchu',
    title: 'ברכו',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_Barchu',
    availability: 'always',
  },
  {
    id: 'arvit-shema',
    title: 'קריאת שמע וברכותיה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_The_Shema',
    availability: 'always',
  },
  {
    id: 'amida',
    title: 'תפילת העמידה',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_Amidah',
    availability: 'always',
  },
  {
    id: 'alenu',
    title: 'עלינו לשבח',
    ref: 'Siddur_Edot_HaMizrach,_Weekday_Arvit,_Alenu',
    availability: 'always',
  },
];

const KRIAT_SHEMA_REF =
  'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_The_Shema';

function stripNikudAndCantillation(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function findShemaParagraphIndex(paragraphs) {
  return paragraphs.findIndex((paragraph) => {
    const stripped = stripNikudAndCantillation(paragraph.trim());
    return (
      stripped.includes('שמע ישראל') &&
      stripped.includes('אחד') &&
      stripped.length < 80
    );
  });
}

function findVehayaParagraphIndex(paragraphs) {
  return paragraphs.findIndex((paragraph) => {
    const stripped = stripNikudAndCantillation(paragraph.trim());
    return (
      stripped.startsWith('והיה') &&
      stripped.includes('אם') &&
      stripped.includes('שמע')
    );
  });
}

function splitShacharitShemaParagraphs(paragraphs) {
  const shemaIndex = findShemaParagraphIndex(paragraphs);
  const vehayaIndex = findVehayaParagraphIndex(paragraphs);

  if (shemaIndex < 0 || vehayaIndex < 0 || vehayaIndex <= shemaIndex) {
    throw new Error('Unable to split Kriat Shema paragraphs from source');
  }

  const birkot = paragraphs
    .slice(0, shemaIndex)
    .filter((paragraph) => !paragraph.startsWith('ק"ש'));

  const parshatShema = paragraphs.slice(shemaIndex, vehayaIndex);
  const vehaya = paragraphs.slice(vehayaIndex);

  if (birkot.length === 0 || parshatShema.length === 0 || vehaya.length === 0) {
    throw new Error('Kriat Shema split produced empty sections');
  }

  const tefillinBlessingInBirkot = birkot.some((paragraph) => {
    const stripped = stripNikudAndCantillation(paragraph);
    return (
      stripped.includes('להניח תפילין') ||
      stripped.includes('לקשור תפילין')
    );
  });

  if (tefillinBlessingInBirkot) {
    throw new Error(
      'Kriat Shema birkot section contains unrelated Tefillin blessing text',
    );
  }

  return { birkot, parshatShema, vehaya };
}

async function buildPrayerDocumentFromSections({
  id,
  title,
  context,
  documentContext,
  availability,
  version,
  rootRef,
  sections,
}) {
  const sourceLicense = await assertLicense(sections[0].ref);
  const builtSections = [];

  for (const [index, section] of sections.entries()) {
    const text = await fetchSection(section.ref);

    if (text.length === 0) {
      throw new Error(`Empty section after cleaning: ${section.id}`);
    }

    builtSections.push({
      id: section.id,
      title: section.title,
      order: index + 1,
      availability: section.availability,
      ...(section.availabilityNote
        ? { availabilityNote: section.availabilityNote }
        : {}),
      text,
      source: buildSourceMetadata(section.ref, sourceLicense),
    });

    console.log(`  ✓ ${section.id} (${text.length} paragraphs)`);
  }

  return {
    id,
    title,
    nusach: 'edot_hamizrach',
    language: 'he',
    version,
    availability,
    context,
    documentContext,
    source: {
      ...buildSourceMetadata(rootRef, sourceLicense),
      auditSummary: `Verified against Sefaria ${SOURCE_VERSION}; ${builtSections.length} sections`,
    },
    sections: builtSections,
  };
}

async function buildKriatShemaDocument() {
  const sourceLicense = await assertLicense(KRIAT_SHEMA_REF);
  const paragraphs = await fetchSection(KRIAT_SHEMA_REF);
  const { birkot, parshatShema, vehaya } =
    splitShacharitShemaParagraphs(paragraphs);

  const sections = [
    {
      id: 'birkot-kriat-shema',
      title: 'ברכות קריאת שמע',
      order: 1,
      availability: 'always',
      text: birkot,
    },
    {
      id: 'parshat-shema',
      title: 'פרשת שמע',
      order: 2,
      availability: 'always',
      text: parshatShema,
    },
    {
      id: 'vehaya-im-shamoa',
      title: 'וְהָיָה אִם שָׁמֹעַ',
      order: 3,
      availability: 'always',
      text: vehaya,
    },
  ].map((section) => ({
    ...section,
    source: buildSourceMetadata(KRIAT_SHEMA_REF, sourceLicense),
  }));

  console.log(
    `  ✓ kriat-shema split (${sections.map((section) => section.id).join(', ')})`,
  );

  return {
    id: 'kriat-shema',
    title: 'קריאת שמע',
    nusach: 'edot_hamizrach',
    language: 'he',
    version: 2,
    availability: 'partial',
    context: 'morning',
    documentContext: 'shacharit-shema',
    source: {
      ...buildSourceMetadata(KRIAT_SHEMA_REF, sourceLicense),
      auditSummary:
        'Morning Shema excerpt from Weekday Shacharit; birkot verified without Tefillin blessing',
    },
    sections,
  };
}

async function buildMinchaDocument() {
  return buildPrayerDocumentFromSections({
    id: 'mincha',
    title: 'תפילת מנחה',
    context: 'afternoon',
    documentContext: 'mincha',
    availability: 'complete',
    version: 1,
    rootRef: 'Siddur_Edot_HaMizrach,_Weekday_Mincha',
    sections: MINCHA_SECTIONS,
  });
}

async function buildArvitDocument() {
  return buildPrayerDocumentFromSections({
    id: 'arvit',
    title: 'תפילת ערבית',
    context: 'evening',
    documentContext: 'arvit',
    availability: 'complete',
    version: 1,
    rootRef: 'Siddur_Edot_HaMizrach,_Weekday_Arvit',
    sections: ARVIT_SECTIONS,
  });
}

async function main() {
  console.log('Preparing Shacharit content...');
  const shacharit = await buildShacharitDocument();
  shacharit.context = 'morning';
  shacharit.documentContext = 'shacharit';
  writeFileSync(
    join(outputDir, 'shacharit.json'),
    `${JSON.stringify(shacharit, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote shacharit.json (${shacharit.sections.length} sections)`);

  console.log('Preparing Kriat Shema excerpt...');
  const kriatShema = await buildKriatShemaDocument();
  writeFileSync(
    join(outputDir, 'kriat-shema.json'),
    `${JSON.stringify(kriatShema, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote kriat-shema.json (${kriatShema.sections.length} sections)`);

  console.log('Preparing Mincha content...');
  const mincha = await buildMinchaDocument();
  writeFileSync(
    join(outputDir, 'mincha.json'),
    `${JSON.stringify(mincha, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote mincha.json (${mincha.sections.length} sections)`);

  console.log('Preparing Arvit content...');
  const arvit = await buildArvitDocument();
  writeFileSync(
    join(outputDir, 'arvit.json'),
    `${JSON.stringify(arvit, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote arvit.json (${arvit.sections.length} sections)`);

  console.log('Preparing Tefillin guide...');
  const tefillin = await buildTefillinGuide();
  writeFileSync(
    join(outputDir, 'tefillin.json'),
    `${JSON.stringify(tefillin, null, 2)}\n`,
    'utf8',
  );
  console.log(`Wrote tefillin.json (${tefillin.sections.length} sections)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
