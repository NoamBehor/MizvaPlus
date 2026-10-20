/**
 * Curated Bereishit excerpts for the startup book animation.
 * Static, verified Torah text — not generated at runtime.
 */
export type StartupTorahPage = {
  /** Optional decorative mark (Hebrew letter page marker). */
  mark?: string;
  /** Verse reference for accessibility only. */
  reference: string;
  text: string;
};

export const STARTUP_TORAH_PAGES: readonly StartupTorahPage[] = [
  {
    mark: 'א',
    reference: 'בראשית א:א',
    text: 'בראשית ברא אלהים את השמים ואת הארץ.',
  },
  {
    mark: 'ב',
    reference: 'בראשית א:ב',
    text: 'והארץ היתה תהו ובהו וחשך על־פני תהום ורוח אלהים מרחפת על־פני המים.',
  },
  {
    mark: 'ג',
    reference: 'בראשית א:ג',
    text: 'ויאמר אלהים יהי אור ויהי־אור.',
  },
  {
    mark: 'ד',
    reference: 'בראשית א:ד',
    text: 'וירא אלהים את־האור כי־טוב ויבדל אלהים בין האור ובין החשך.',
  },
  {
    mark: 'ה',
    reference: 'בראשית א:ה',
    text: 'ויקרא אלהים לאור יום ולחשך קרא לילה ויהי־ערב ויהי־בקר יום אחד.',
  },
  {
    mark: 'ו',
    reference: 'בראשית א:ו',
    text: 'ויאמר אלהים יהי רקיע בתוך המים ויהי מבדיל בין מים למים.',
  },
  {
    mark: 'ז',
    reference: 'בראשית א:ז',
    text: 'ויעש אלהים את־הרקיע ויבדל בין המים אשר מתחת לרקיע ובין המים אשר מעל לרקיע ויהי־כן.',
  },
  {
    mark: 'ח',
    reference: 'בראשית א:ח',
    text: 'ויקרא אלהים לרקיע שמים ויהי־ערב ויהי־בקר יום שני.',
  },
  {
    mark: 'ט',
    reference: 'בראשית א:ט',
    text: 'ויאמר אלהים יקוו המים מתחת השמים אל־מקום אחד ותראה היבשה ויהי־כן.',
  },
  {
    mark: 'י',
    reference: 'בראשית א:י',
    text: 'ויקרא אלהים ליבשה ארץ ולמקוה המים קרא ימים וירא אלהים כי־טוב.',
  },
] as const;
