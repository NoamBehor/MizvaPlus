import { buildGuide, checklist, faq, item, section, source, tip } from './shared';

export const TAANIT_GEDALIA_GUIDE = buildGuide({
  id: 'taanit-gedalia-guide',
  holidayKey: 'taanit_gedalia',
  titleHebrew: 'מדריך צום גדליה',
  subtitleHebrew: 'צום קל — ג\' בתשרי',
  shortDescription:
    'צום גדליה: זכרון רצח גדליה בן אחיקם — צום קל מעלות השחר עד צאת הכוכבים.',
  themeKey: 'fast',
  overview: section('gedalia-overview', 'מהו צום גדליה?', [
    item(
      'gedalia-meaning',
      'רצח גדליה',
      'צום לזכר רצח גדליה בן אחיקם — מנהיג יהודה אחרי חורבן בית ראשון. מעשה זה הביא לגלות מלאה.',
      'משנה תענית פרק ד משנה ה',
    ),
    item(
      'gedalia-when',
      'מתי',
      'ג\' בתשרי — יום אחרי ראש השנה (או ד\' בתשרי אם ג\' הוא שבת).',
    ),
    item(
      'gedalia-minor',
      'צום קל',
      'מעלות השחר עד צאת הכוכבים. איסור אכילה ושתייה בלבד — לא כמו תשעה באב.',
      'שו״ע או״ח סימן תקס״ב',
    ),
  ]),
  preparation: [
    section('gedalia-prep', 'הכנה לצום', [
      item(
        'gedalia-prep-meal',
        'ארוחה לפני הצום',
        'אכול ושתה לפני עלות השחר. אין חובת סעודה מפסקת כמו בצום מלא.',
      ),
      item(
        'gedalia-prep-break',
        'סיום הצום',
        'הכן אוכל ושתייה לסיום — אחרי צאת הכוכבים.',
      ),
    ]),
  ],
  mitzvot: [
    section('gedalia-mitzvah', 'הצום', [
      item(
        'gedalia-fast-when',
        'זמן הצום',
        'מעלות השחר (עלות השחר) עד צאת הכוכבים.',
      ),
      item(
        'gedalia-fast-what',
        'מה אסור',
        'אכילה ושתייה בלבד. מותר רחיצה, נעילת סנדל ושאר דברים.',
      ),
      item(
        'gedalia-avinu',
        'אבינו מלכנו',
        'בשחרית — אבינו מלכנו (אם לא נאמר בראש השנה).',
      ),
    ]),
  ],
  practicalTips: [
    tip(
      'gedalia-tip-hydration',
      'שתייה לפני הצום',
      'שתה מים לפני עלות השחר — הצום קצר יחסית.',
    ),
    tip(
      'gedalia-tip-work',
      'עבודה',
      'מותר לעבוד בצום קל.',
    ),
  ],
  commonQuestions: [
    faq(
      'gedalia-faq-vs-tisha',
      'הבדל מתשעה באב?',
      'תשעה באב — צום מלא מלילה עם הגבלות רבות. צום גדליה — צום קל, רק אכילה ושתייה ביום.',
    ),
    faq(
      'gedalia-faq-sick',
      'חולה — מה עושים?',
      'חולה שיש סכנה — אוכל ושותה. שאל רב.',
    ),
  ],
  checklist: [
    checklist('gedalia-cl-eat', 'אכילה ושתייה לפני עלות השחר'),
    checklist('gedalia-cl-fast', 'צום מעלות השחר עד צאת הכוכבים'),
    checklist('gedalia-cl-break', 'סיום צום אחרי צאת הכוכבים'),
  ],
  sources: [
    source('שולחן ערוך', 'אורח חיים סימן תקס״ב', 'רבי יוסף קארו'),
    source('משנה', 'מסכת תענית פרק ד משנה ה'),
  ],
});

export const ASARAH_BTEVET_GUIDE = buildGuide({
  id: 'asarah-btevet-guide',
  holidayKey: 'asarah_btevet',
  titleHebrew: 'מדריך עשרה בטבת',
  subtitleHebrew: 'צום קל — תחילת מצור ירושלים',
  shortDescription:
    'צום עשרה בטבת: זכרון תחילת מצור ירושלים — צום קל מעלות השחר.',
  themeKey: 'fast',
  overview: section('asarah-overview', 'מהו עשרה בטבת?', [
    item(
      'asarah-meaning',
      'מצור ירושלים',
      'צום לזכר תחילת מצור נבוכדנצר על ירושלים — שהוביל לחורבן בית ראשון.',
      'מלכים ב כ״ה; ירמיהו נ״ב',
    ),
    item(
      'asarah-when',
      'מתי',
      'י\' בטבת. אם חל בשבת — נדחה ליום ראשון (י״א בטבת).',
      'שו״ע או״ח סימן תק״נ',
    ),
    item(
      'asarah-minor',
      'צום קל',
      'מעלות השחר עד צאת הכוכבים. איסור אכילה ושתייה בלבד.',
    ),
  ]),
  preparation: [
    section('asarah-prep', 'הכנה לצום', [
      item(
        'asarah-prep-meal',
        'לפני הצום',
        'אכול ושתה לפני עלות השחר.',
      ),
      item(
        'asarah-prep-break',
        'סיום',
        'הכן אוכל לסיום הצום בערב.',
      ),
    ]),
  ],
  mitzvot: [
    section('asarah-mitzvah', 'הצום', [
      item(
        'asarah-fast-when',
        'זמן הצום',
        'מעלות השחר עד צאת הכוכבים.',
      ),
      item(
        'asarah-fast-what',
        'מה אסור',
        'אכילה ושתייה בלבד.',
      ),
      item(
        'asarah-shabbat',
        'שבת',
        'אם חל בשבת — הצום ביום ראשון.',
      ),
    ]),
  ],
  practicalTips: [
    tip(
      'asarah-tip-short',
      'צום קצר',
      'בחורף הצום קצר — תכנן ארוחה לסיום.',
    ),
  ],
  commonQuestions: [
    faq(
      'asarah-faq-shabbat',
      'מה אם עשרה בטבת בשבת?',
      'הצום נדחה ליום ראשון — י״א בטבת.',
    ),
  ],
  checklist: [
    checklist('asarah-cl-eat', 'אכילה לפני עלות השחר'),
    checklist('asarah-cl-fast', 'צום עד צאת הכוכבים'),
    checklist('asarah-cl-break', 'סיום צום בערב'),
  ],
  sources: [
    source('שולחן ערוך', 'אורח חיים סימן תק״נ', 'רבי יוסף קארו'),
    source('משנה', 'מסכת תענית פרק ד'),
    source('נביאים', 'מלכים ב פרק כ״ה'),
  ],
});

export const TAANIT_ESTHER_GUIDE = buildGuide({
  id: 'taanit-esther-guide',
  holidayKey: 'taanit_esther',
  titleHebrew: 'מדריך תענית אסתר',
  subtitleHebrew: 'צום קל — י״ג באדר',
  shortDescription:
    'תענית אסתר: צום לפני פורים — זכרון תפילת אסתר וצום המלך.',
  themeKey: 'fast',
  overview: section('esther-overview', 'מהי תענית אסתר?', [
    item(
      'esther-meaning',
      'לפני פורים',
      'צום ביום י״ג באדר — לזכר צום אסתר ועם ישראל לפני ניצול בפורים.',
      'מגילת אסתר ד; תענית דף י״ח',
    ),
    item(
      'esther-when',
      'מתי',
      'י״ג באדר. אם חל בשבת — נדחה ליום חמישי (י״א באדר).',
      'שו״ע או״ח סימן תרפ״ו',
    ),
    item(
      'esther-minor',
      'צום קל',
      'מעלות השחר עד צאת הכוכבים. איסור אכילה ושתייה בלבד.',
    ),
  ]),
  preparation: [
    section('esther-prep', 'הכנה', [
      item(
        'esther-prep-purim',
        'קישור לפורים',
        'תענית אסתר מכינה לפורים — מחר (או מוצאי) מגילה ומצוות החג.',
      ),
      item(
        'esther-prep-break',
        'סיום הצום',
        'אחרי צאת הכוכבים — הכנה לערב פורים וקריאת מגילה.',
      ),
    ]),
  ],
  mitzvot: [
    section('esther-mitzvah', 'הצום', [
      item(
        'esther-fast-when',
        'זמן הצום',
        'מעלות השחר עד צאת הכוכבים בי״ג באדר.',
      ),
      item(
        'esther-fast-what',
        'מה אסור',
        'אכילה ושתייה בלבד.',
      ),
      item(
        'esther-shabbat',
        'שבת',
        'אם י״ג באדר בשבת — הצום ביום חמישי (י״א).',
      ),
    ]),
  ],
  practicalTips: [
    tip(
      'esther-tip-megillah',
      'מגילה בערב',
      'אחרי סיום הצום — קריאת מגילה בליל י״ד (מוצאי י״ג).',
    ),
    tip(
      'esther-tip-joy',
      'מעבר לשמחה',
      'הצום קצר — מיד אחריו מתחילה שמחת פורים.',
    ),
  ],
  commonQuestions: [
    faq(
      'esther-faq-shabbat',
      'תענית אסתר בשבת?',
      'מקדימים ליום חמישי — י״א באדר.',
    ),
    faq(
      'esther-faq-purim',
      'קשר לפורים?',
      'צום לזכר התפילה והצום לפני הנס — מכין לשמחת פורים.',
    ),
  ],
  checklist: [
    checklist('esther-cl-eat', 'אכילה לפני עלות השחר'),
    checklist('esther-cl-fast', 'צום עד צאת הכוכבים'),
    checklist('esther-cl-megillah', 'הכנה לקריאת מגילה בערב'),
  ],
  sources: [
    source('שולחן ערוך', 'אורח חיים סימן תרפ״ו', 'רבי יוסף קארו'),
    source('תלמוד בבלי', 'מסכת תענית דף י״ח'),
    source('מגילת אסתר', 'פרק ד'),
  ],
});

export const TAANIT_BECHOROT_GUIDE = buildGuide({
  id: 'taanit-bechorot-guide',
  holidayKey: 'taanit_bechorot',
  titleHebrew: 'מדריך תענית בכורות',
  subtitleHebrew: 'צום בכורות — י״ד בניסן',
  shortDescription:
    'בכורות צמים ביום לפני פסח — או משתתפים בסיום מסכת במקום.',
  themeKey: 'fast',
  overview: section('bechorot-overview', 'מהי תענית בכורות?', [
    item(
      'bechorot-meaning',
      'בכורות',
      'בכור (בן או בת) צם ביום י״ד בניסן — לזכר שניצלו ממכת בכורות במצרים.',
      'שו״ע או״ח סימן ת״ע',
    ),
    item(
      'bechorot-when',
      'מתי',
      'י״ד בניסן — ערב פסח. אם חל בשבת — ביום חמישי (י״ב בניסן).',
    ),
    item(
      'bechorot-siyum',
      'סיום במקום צום',
      'מנהג נפוץ: בכור משתתף בסיום מסכת — ואז אוכל ולא צם. רבים מארגנים סיום בבית הכנסת.',
      'שו״ע או״ח סימן ת״ע סעיף ב',
    ),
  ]),
  preparation: [
    section('bechorot-prep', 'הכנה', [
      item(
        'bechorot-prep-siyum',
        'סיום מסכת',
        'בדוק אם יש סיום בבית הכנסת ביום י״ד — בכור יכול להשתתף ולא לצום.',
      ),
      item(
        'bechorot-prep-fast',
        'אם צם',
        'אכול לפני עלות השחר. סיום הצום לפני תחילת סדר ליל פסח.',
      ),
    ]),
  ],
  mitzvot: [
    section('bechorot-mitzvah', 'הצום או הסיום', [
      item(
        'bechorot-who',
        'מי בכור',
        'בכור לאב — בן או בת. אם האם בכורה — הבן בכור לצורך תענית בכורות (לפי מנהג).',
      ),
      item(
        'bechorot-fast',
        'הצום',
        'מעלות השחר עד צאת הכוכבים — אם לא השתתף בסיום.',
      ),
      item(
        'bechorot-siyum-rule',
        'סיום מסכת',
        'משתתף בסיום מסכת — אוכל ושותה. הסיום צריך להיות ביום י״ד.',
      ),
    ]),
  ],
  practicalTips: [
    tip(
      'bechorot-tip-siyum',
      'סיום מומלץ',
      'רוב בכורות משתתפים בסיום — נוח יותר מצום בערב פסח.',
    ),
    tip(
      'bechorot-tip-pesach',
      'ערב פסח',
      'אחרי הצום — הכנה לסדר. אל תאכל מצה לפני הלילה.',
    ),
  ],
  commonQuestions: [
    faq(
      'bechorot-faq-who',
      'מי נחשב בכור?',
      'בכור לאב — בן או בת. ילד שנולד אחרי הפסקה — שאל רב.',
    ),
    faq(
      'bechorot-faq-siyum',
      'חייבים בסיום?',
      'לא חובה — אבל מנהג נפוץ להשתתף בסיום במקום צום.',
    ),
    faq(
      'bechorot-faq-shabbat',
      'י״ד בניסן בשבת?',
      'הצום (או הסיום) ביום חמישי — י״ב בניסן.',
    ),
  ],
  checklist: [
    checklist('bechorot-cl-check', 'בדיקה: האם אני בכור?'),
    checklist('bechorot-cl-siyum', 'השתתפות בסיום מסכת — או צום'),
    checklist('bechorot-cl-pesach', 'הכנה לסדר ליל פסח'),
  ],
  sources: [
    source('שולחן ערוך', 'אורח חיים סימן ת״ע', 'רבי יוסף קארו'),
    source('משנה ברורה', 'אורח חיים סימן ת״ע', 'רבי ישראל מאיר הכהן'),
    source('תלמוד בבלי', 'מסכת סוכה דף נ״ו'),
  ],
});
