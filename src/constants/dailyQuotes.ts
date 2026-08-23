export interface DailyQuote {
  id: string;
  textHebrew: string;
  source?: string;
}

export const DAILY_QUOTES: DailyQuote[] = [
  {
    id: 'quote-1',
    textHebrew: 'דע לפני מי אתה עומד.',
    source: 'אבות א׳ א׳',
  },
  {
    id: 'quote-2',
    textHebrew: 'היום קצר והמלאכה מרובה.',
    source: 'אבות ב׳ ט״ו',
  },
  {
    id: 'quote-3',
    textHebrew: 'עשה רצונו כרצונך, כדי שיעשה רצונך כרצונו.',
    source: 'אבות ב׳ ד׳',
  },
  {
    id: 'quote-4',
    textHebrew: 'איזהו חכם? הלומד מכל אדם.',
    source: 'אבות ד׳ א׳',
  },
  {
    id: 'quote-5',
    textHebrew: 'לא עליך המלאכה לגמור, ולא אתה בן חורין ליבטל ממנה.',
    source: 'אבות ב׳ כ״א',
  },
  {
    id: 'quote-6',
    textHebrew: 'במקום שאין אנשים, השתדל להיות איש.',
    source: 'אבות ב׳ ה׳',
  },
  {
    id: 'quote-7',
    textHebrew: 'הסתכל בשלושה דברים ואין אתה בא לידי עבירה.',
    source: 'אבות ג׳ א׳',
  },
];
