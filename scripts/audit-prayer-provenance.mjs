/**
 * Audits bundled prayer content against Sefaria version/license metadata.
 * Run: node scripts/audit-prayer-provenance.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputDir = join(root, 'src/content/prayers/edot-hamizrach');

const ALLOWED_LICENSES = new Set(['CC0', 'Public Domain', 'public domain']);
const ACCESS_DATE = '2026-09-14';
const SOURCE_PROVIDER = 'Sefaria';
const SOURCE_VERSION = 'Shaliehsaboo Edition';

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

const TEFILLIN_REF = 'Siddur_Edot_HaMizrach,_Weekday_Shacharit,_Order_of_Tefillin';

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

  return licensed;
}

function buildSectionSource(reference, licensedVersion) {
  return {
    provider: SOURCE_PROVIDER,
    reference,
    accessedAt: ACCESS_DATE,
    license: licensedVersion.license ?? 'unverified',
    versionTitle: licensedVersion.versionTitle?.trim() ?? SOURCE_VERSION,
    verifiedAt: ACCESS_DATE,
  };
}

function buildDocumentSource(reference, licensedVersion) {
  return buildSectionSource(reference, licensedVersion);
}

async function auditShacharit() {
  const shacharitPath = join(outputDir, 'shacharit.json');
  const document = JSON.parse(readFileSync(shacharitPath, 'utf8'));
  const rootRef = 'Siddur_Edot_HaMizrach,_Weekday_Shacharit';
  const rootLicense = await assertLicense(SHACHARIT_SECTIONS[0].ref);
  let allVerified = true;

  for (const sectionMeta of SHACHARIT_SECTIONS) {
    try {
      const licensed = await assertLicense(sectionMeta.ref);
      const bundledSection = document.sections.find((section) => section.id === sectionMeta.id);

      if (!bundledSection) {
        console.log(`FAIL section missing in bundle: ${sectionMeta.id}`);
        allVerified = false;
        continue;
      }

      bundledSection.source = buildSectionSource(sectionMeta.ref, licensed);
      console.log(
        `PASS ${sectionMeta.id}: ${licensed.versionTitle} (${licensed.license})`,
      );
    } catch (error) {
      allVerified = false;
      const bundledSection = document.sections.find((section) => section.id === sectionMeta.id);
      if (bundledSection) {
        bundledSection.source = {
          provider: SOURCE_PROVIDER,
          reference: sectionMeta.ref,
          accessedAt: ACCESS_DATE,
          license: 'unverified',
          versionTitle: null,
          verifiedAt: ACCESS_DATE,
          auditError: String(error),
        };
      }
      console.log(`FAIL ${sectionMeta.id}: ${error.message}`);
    }
  }

  document.source = buildDocumentSource(rootRef, rootLicense);
  document.source.auditSummary = allVerified
    ? 'All sections verified against Sefaria CC0/Public Domain Hebrew versions'
    : 'One or more sections failed license verification';

  writeFileSync(shacharitPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  return allVerified;
}

async function auditTefillin() {
  const tefillinPath = join(outputDir, 'tefillin.json');
  const document = JSON.parse(readFileSync(tefillinPath, 'utf8'));

  try {
    const licensed = await assertLicense(TEFILLIN_REF);
    document.source = buildDocumentSource(TEFILLIN_REF, licensed);
    document.source.auditSummary = 'Verified against Sefaria CC0/Public Domain Hebrew version';

    for (const section of document.sections) {
      section.source = buildSectionSource(TEFILLIN_REF, licensed);
    }

    writeFileSync(tefillinPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    console.log(`PASS tefillin: ${licensed.versionTitle} (${licensed.license})`);
    return true;
  } catch (error) {
    document.source = {
      provider: SOURCE_PROVIDER,
      reference: TEFILLIN_REF,
      accessedAt: ACCESS_DATE,
      license: 'unverified',
      versionTitle: null,
      verifiedAt: ACCESS_DATE,
      auditError: String(error),
    };

    for (const section of document.sections) {
      section.source = { ...document.source };
    }

    writeFileSync(tefillinPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    console.log(`FAIL tefillin: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Auditing Shacharit section provenance...');
  const shacharitOk = await auditShacharit();
  console.log('Auditing Tefillin provenance...');
  const tefillinOk = await auditTefillin();

  if (!shacharitOk || !tefillinOk) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
