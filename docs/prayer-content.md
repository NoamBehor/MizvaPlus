# Prayer Content Pack Contract

This document describes how to add verified local prayer content to MitzvaPlus without changing the Prayer Reader implementation.

## Content location

Bundled prayer documents live at:

```text
src/content/prayers/{nusach}/{prayerId}.json
```

Folder naming uses hyphens (`edot-hamizrach`). The JSON `nusach` field uses underscores (`edot_hamizrach`).

Supported nusach folders today:

- `edot-hamizrach`
- `ashkenaz` (reserved, empty)
- `sefard` (reserved, empty)

## Canonical registry

Every prayer must be registered in `src/constants/prayerCatalog.ts` before content is considered available.

```ts
interface PrayerCatalogItem {
  id: string;
  title: string;
  nusach: string;
  availability: 'complete' | 'partial' | 'pending';
  sections: number;
}
```

Availability meanings:

| Status | Meaning |
|--------|---------|
| `complete` | Full verified seder is bundled locally |
| `partial` | Verified excerpt only; do not label as full |
| `pending` | No bundled reader content yet |

Update the registry first, then add JSON, then wire mitzvah mapping if needed.

## JSON schema

```json
{
  "id": "kriat-shema",
  "title": "קריאת שמע",
  "nusach": "edot_hamizrach",
  "language": "he",
  "version": 1,
  "availability": "complete",
  "source": {
    "name": "Source name",
    "reference": "Optional reference",
    "license": "License or public-domain note"
  },
  "sections": [
    {
      "id": "unique-section-id",
      "title": "Section title in Hebrew",
      "order": 1,
      "availability": "always",
      "availabilityNote": "Optional note for conditional sections",
      "text": ["Paragraph with nikud preserved", "Another paragraph"]
    }
  ]
}
```

Required fields:

- `id` — must match filename stem and catalog entry
- `title` — must match catalog entry
- `nusach` — one of `edot_hamizrach`, `ashkenaz`, `sefard`
- `language` — must be `he`
- `version` — integer, increment when content changes
- `availability` — `complete` or `partial` only in bundled files
- `sections` — non-empty array

Section availability (Shacharit and future complete prayers):

- `always` — part of the daily seder
- `conditional` — context-dependent (weekday, Shabbat, Torah reading day, etc.)
- `special_day` — holiday or exceptional additions

Optional but recommended:

- `source.provider`
- `source.reference`
- `source.versionTitle`
- `source.license` — must reflect the exact bundled version; use `unverified` when not confirmed
- `source.verifiedAt`

## Section IDs and ordering

- Each section needs a stable, unique `id` within the document (kebab-case recommended).
- `order` must start at `1` and be consecutive with no gaps.
- Section count in JSON must match `sections` in `prayerCatalog.ts`.
- Use meaningful IDs (`modim`, `parshat-shema`) — they power section navigation and resume behavior.

## Mitzvah mapping

To expose a prayer from a mitzvah detail screen, add the mitzvah ID to `MITZVAH_PRAYER_IDS` in `src/services/texts/prayerContentService.ts`.

UI behavior is driven by catalog availability:

- `complete` → CTA: `פתח את סדר התפילה המלא`
- `partial` → for קריאת שמע, CTA: `פתח את קריאת שמע של שחרית` and a note that the file is the weekday morning excerpt, not ערבית. Other partial prayers use `פתח את סדר התפילה` plus `תוכן חלקי`
- `pending` → no reader CTA; show pending product message only

## Source attribution

Do not invent prayer text. Every bundled document must include verified source metadata in `source`.

Before merging:

1. Confirm text is verified and licensed for local bundling.
2. Preserve nikud where the source includes it.
3. Do not fetch text at runtime from Sefaria or any remote API.

## Service registration

After adding JSON, import it in `src/services/texts/prayerContentService.ts`:

```ts
import newPrayerEdot from '@/content/prayers/edot-hamizrach/{prayerId}.json';

const PRAYER_CATALOG = {
  edot_hamizrach: {
    // existing entries...
    '{prayerId}': newPrayerEdot as PrayerDocument,
  },
  // ...
};
```

No reader code changes should be required beyond registry and import.

## Verification requirements

Run:

```bash
npm run verify:prayer-reader
```

The verifier checks every bundled document for:

- valid JSON
- required metadata (`id`, `title`, `nusach`, `availability`)
- catalog consistency (`availability`, `sections`, `title`)
- section ordering (1..n)
- unique section IDs
- non-empty Hebrew text
- nikud preservation where expected
- no unexpected HTML tags
- no runtime network fetching in the reader path

Also run the project typecheck before opening a PR:

```bash
npm run typecheck
```

## Adding a complete prayer — checklist

1. Obtain and verify the full prayer text from an approved source.
2. Add or update the entry in `src/constants/prayerCatalog.ts` with `availability: 'complete'` and the correct section count.
3. Create `src/content/prayers/{nusach}/{prayerId}.json` following the schema above.
4. Import the JSON in `prayerContentService.ts`.
5. Map the mitzvah ID in `MITZVAH_PRAYER_IDS` if applicable.
6. Run `npm run verify:prayer-reader` and `npm run typecheck`.
7. Confirm the mitzvah detail screen shows the full-reader CTA without `תוכן חלקי`.

## Current bundled content

| Prayer ID | Availability | Sections | Path |
|-----------|--------------|----------|------|
| `kriat-shema` | partial | 3 | `edot-hamizrach/kriat-shema.json` (verified morning excerpt, Sefaria CC0) |
| `shacharit` | complete | 19 | `edot-hamizrach/shacharit.json` |
| `mincha` | complete | 4 | `edot-hamizrach/mincha.json` |
| `arvit` | complete | 4 | `edot-hamizrach/arvit.json` |
| `tefillin` (ritual guide) | complete | 6 | `edot-hamizrach/tefillin.json` |
| `birkat-hamazon` | pending | — | not bundled |

## Offline constraints

The Prayer Reader must remain fully offline:

- no `fetch()` in reader or content service paths
- no Sefaria integration
- no API keys or auth required to read prayers
