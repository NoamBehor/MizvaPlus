#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate TypeScript holiday guide content files with proper Hebrew."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "content" / "holidays"

IMPORT_LINE = (
    "import { buildGuide, checklist, faq, item, section, source, tip } from './shared';"
)


def ts_str(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{escaped}'"


def emit_item(item_id: str, title: str, body: str, custom: str | None = None, indent: int = 4) -> str:
    pad = " " * indent
    lines = [
        f"{pad}item(",
        f"{pad}  {ts_str(item_id)},",
        f"{pad}  {ts_str(title)},",
        f"{pad}  {ts_str(body)},",
    ]
    if custom is not None:
        lines.append(f"{pad}  {ts_str(custom)},")
    lines.append(f"{pad})")
    return "\n".join(lines)


def emit_section(section_id: str, title: str, items: list[dict], indent: int = 4) -> str:
    pad = " " * indent
    inner = ",\n".join(
        emit_item(i["id"], i["title"], i["body"], i.get("custom"), indent + 2) for i in items
    )
    return f"{pad}section({ts_str(section_id)}, {ts_str(title)}, [\n{inner}\n{pad}])"


def emit_tip(tip_id: str, title: str, body: str, custom: str | None = None, indent: int = 4) -> str:
    pad = " " * indent
    lines = [f"{pad}tip(", f"{pad}  {ts_str(tip_id)},", f"{pad}  {ts_str(title)},", f"{pad}  {ts_str(body)},"]
    if custom is not None:
        lines.append(f"{pad}  {ts_str(custom)},")
    lines.append(f"{pad})")
    return "\n".join(lines)


def emit_faq(faq_id: str, question: str, answer: str, custom: str | None = None, indent: int = 4) -> str:
    pad = " " * indent
    lines = [f"{pad}faq(", f"{pad}  {ts_str(faq_id)},", f"{pad}  {ts_str(question)},", f"{pad}  {ts_str(answer)},"]
    if custom is not None:
        lines.append(f"{pad}  {ts_str(custom)},")
    lines.append(f"{pad})")
    return "\n".join(lines)


def emit_checklist(checklist_id: str, label: str, custom: str | None = None, indent: int = 4) -> str:
    pad = " " * indent
    if custom is not None:
        return f"{pad}checklist({ts_str(checklist_id)}, {ts_str(label)}, {ts_str(custom)})"
    return f"{pad}checklist({ts_str(checklist_id)}, {ts_str(label)})"


def emit_source(title: str, reference: str, author: str | None = None, indent: int = 4) -> str:
    pad = " " * indent
    if author is not None:
        return f"{pad}source({ts_str(title)}, {ts_str(reference)}, {ts_str(author)})"
    return f"{pad}source({ts_str(title)}, {ts_str(reference)})"


def emit_section_array(key: str, sections: list[dict]) -> list[str]:
    lines = [f"  {key}: ["]
    for idx, sec in enumerate(sections):
        block = emit_section(sec["id"], sec["title"], sec["items"], indent=4)
        lines.append(block + ("," if idx < len(sections) - 1 else ""))
    lines.append("  ],")
    return lines


def emit_tip_array(key: str, tips: list[dict]) -> list[str]:
    lines = [f"  {key}: ["]
    for idx, t in enumerate(tips):
        block = emit_tip(t["id"], t["title"], t["body"], t.get("custom"), indent=4)
        lines.append(block + ("," if idx < len(tips) - 1 else ""))
    lines.append("  ],")
    return lines


def emit_guide(export_name: str, guide: dict) -> str:
    parts = [
        IMPORT_LINE,
        "",
        f"export const {export_name} = buildGuide({{",
        f"  id: {ts_str(guide['id'])},",
        f"  holidayKey: {ts_str(guide['holidayKey'])},",
        f"  themeKey: {ts_str(guide['themeKey'])},",
        f"  titleHebrew: {ts_str(guide['titleHebrew'])},",
    ]
    if guide.get("subtitleHebrew"):
        parts.append(f"  subtitleHebrew: {ts_str(guide['subtitleHebrew'])},")
    parts.append(f"  shortDescription: {ts_str(guide['shortDescription'])},")
    overview = guide["overview"]
    parts.append(f"  overview: {emit_section(overview['id'], overview['title'], overview['items'], indent=2)},")
    parts.extend(emit_section_array("preparation", guide["preparation"]))
    parts.extend(emit_section_array("mitzvot", guide["mitzvot"]))
    if guide.get("prayers"):
        parts.extend(emit_section_array("prayers", guide["prayers"]))
    parts.extend(emit_tip_array("practicalTips", guide["practicalTips"]))
    if guide.get("familyTips"):
        parts.extend(emit_tip_array("familyTips", guide["familyTips"]))
    if guide.get("commonQuestions"):
        lines = ["  commonQuestions: ["]
        for idx, q in enumerate(guide["commonQuestions"]):
            block = emit_faq(q["id"], q["question"], q["answer"], q.get("custom"), indent=4)
            lines.append(block + ("," if idx < len(guide["commonQuestions"]) - 1 else ""))
        lines.append("  ],")
        parts.extend(lines)
    if guide.get("commonMistakes"):
        parts.extend(emit_tip_array("commonMistakes", guide["commonMistakes"]))
    lines = ["  checklist: ["]
    for idx, c in enumerate(guide["checklist"]):
        block = emit_checklist(c["id"], c["label"], c.get("custom"), indent=4)
        lines.append(block + ("," if idx < len(guide["checklist"]) - 1 else ""))
    lines.append("  ],")
    parts.extend(lines)
    lines = ["  sources: ["]
    for idx, s in enumerate(guide["sources"]):
        block = emit_source(s["title"], s["reference"], s.get("author"), indent=4)
        lines.append(block + ("," if idx < len(guide["sources"]) - 1 else ""))
    lines.append("  ],")
    parts.extend(lines)
    parts.append("});")
    parts.append("")
    return "\n".join(parts)


def I(id_: str, title: str, body: str, custom: str | None = None) -> dict:
    item_dict = {"id": id_, "title": title, "body": body}
    if custom:
        item_dict["custom"] = custom
    return item_dict


def S(id_: str, title: str, *items: dict) -> dict:
    return {"id": id_, "title": title, "items": list(items)}


def T(id_: str, title: str, body: str, custom: str | None = None) -> dict:
    tip_dict = {"id": id_, "title": title, "body": body}
    if custom:
        tip_dict["custom"] = custom
    return tip_dict


def Q(id_: str, question: str, answer: str, custom: str | None = None) -> dict:
    faq_dict = {"id": id_, "question": question, "answer": answer}
    if custom:
        faq_dict["custom"] = custom
    return faq_dict


def C(id_: str, label: str, custom: str | None = None) -> dict:
    chk = {"id": id_, "label": label}
    if custom:
        chk["custom"] = custom
    return chk


def SRC(title: str, reference: str, author: str | None = None) -> dict:
    src = {"title": title, "reference": reference}
    if author:
        src["author"] = author
    return src


# ---------------------------------------------------------------------------
# Guide definitions — user-facing strings in Hebrew only
# ---------------------------------------------------------------------------

ROSH_HASHANAH = {
    "id": "guide-rosh-hashanah",
    "holidayKey": "rosh_hashanah",
    "themeKey": "rosh_hashanah",
    "titleHebrew": "ראש השנה",
    "subtitleHebrew": "יום הדין, הזכרון והמלכות",
    "shortDescription": (
        "מדריך הכנה וקיום לראש השנה: תפילות, שופר, קידוש, סימנים ומנהגי יום ראשון ושני."
    ),
    "overview": S(
        "rh-overview",
        "מהות החג",
        I(
            "rh-judgment",
            "יום הדין",
            "ראש השנה הוא יום דין לכל באי העולם. התפילות מדגישות תשובה, זכירה ומלכות ה' ובקשה לשנה טובה.",
        ),
        I(
            "rh-remembrance",
            "יום הזכרון",
            'התורה קוראת ליום זכרון תרועה (ויקרא כ"ג:כ"ד). ביום זה נזכרים מעשי האדם לפני ה\'.',
        ),
        I(
            "rh-kingship",
            "קבלת מלכות שמיים",
            "בתפילת מוסף נאמרות מלכויות, זיכרונות ושופרות — להכריז על מלכות ה' ולקבל עול מלכות שמיים.",
        ),
        I(
            "rh-two-days",
            "יום ראשון ויום שני",
            "בארץ ישראל נשמר יום אחד. בחו\"ל נוהגים שני ימים מפני שמירת ימי הגולה.",
            'לפי מנהג הקהילה — בישראל יום אחד, בחו"ל שני ימים.',
        ),
    ),
    "preparation": [
        S(
            "rh-prep-candles",
            "נרות וכניסת החג",
            I(
                "rh-candles",
                "הדלקת נרות",
                'מדליקים נרות לפני כניסת החג, עם ברכת "להדליק נר של יום טוב" ו"שהחיינו" בכניסת החג.',
                "יש הנוהגים להדליק נר נשמה נוסף — מנהג נפוץ, לא חובה אחידה.",
            ),
            I(
                "rh-candle-timing",
                "זמן הדלקה",
                "מדליקים לפני שקיעת החמה, לאחר הדלקת נרות של ערב חג. יש להשלים את ההדלקה לפני כניסת הזמן.",
            ),
        ),
        S(
            "rh-prep-meals",
            "ארוחות וסעודות",
            I(
                "rh-festive-meals",
                "סעודות החג",
                'חובה לקיים סעודות יום טוב עם לחם ויין. לפני האכילה מברכים קידוש ו"המוציא".',
            ),
            I(
                "rh-simanim-prep",
                "הכנת הסימנים",
                "מכינים מראש תמר, תפוח בדבש, רימון, סלק, דג, כרשינא וכרתי — לפי מנהג המשפחה.",
                "מנהג נפוץ בערב ראש השנה; לא כל הקהילות עושות את כל הסימנים.",
            ),
            I(
                "rh-clothing",
                "לבוש לחג",
                "לבוש נקי ומכובד לתפילות ולסעודות — מנהג כבוד ליום הדין.",
            ),
        ),
        S(
            "rh-prep-zmanim",
            "זמנים ותפילות",
            I(
                "rh-zmanim",
                "בדיקת זמני כניסת החג",
                "יש לוודא שעת כניסת החג לפי מיקום — שקיעה ומוצאי שבת משתנים לפי מקום ולוח שנה.",
            ),
            I(
                "rh-synagogue",
                "זמני תפילות בבית הכנסת",
                "בודקים מראש שעות תפילות, במיוחד ליל ראש השנה ולימי החג — לפי מנהג הקהילה.",
            ),
        ),
    ],
    "mitzvot": [
        S(
            "rh-mitzvah-shofar",
            "מצוות תקיעת שופר",
            I(
                "rh-shofar-obligation",
                "חיוב השמיעה",
                'מצווה לשמוע תקיעות שופר ביום ראש השנה, כפי שכתוב "ביום תרועה". השמיעה נעשית בדרך כלל בתפילת מוסף.',
                'שו"ע או"ח סימן תקפ"א',
            ),
            I(
                "rh-shofar-order",
                "סדר התקיעות",
                "תקיעה, שברים ותרועה — לפי סדר המסורת. המתקיע ועדת בית הכנסת קובעים את הסדר בפועל.",
            ),
            I(
                "rh-shofar-second-day",
                "שופר ביום שני",
                'בחו"ל תוקעים שופר גם ביום שני. בארץ ישראל תוקעים ביום האחד בלבד.',
                'לפי מנהג המקום — יום אחד בישראל, שני ימים בחו"ל.',
            ),
        ),
        S(
            "rh-mitzvah-prayers",
            "תפילות וסדר",
            I(
                "rh-machzor",
                "מחזור ותפילות מיוחדות",
                "תפילות מלכויות, זיכרונות ושופרות; ונתנה לקט ואבינו מלכנו — לפי נוסח הקהילה.",
            ),
            I(
                "rh-tashlich",
                "תשליך",
                "מנהג נפוץ ללכת אחרי תפילת מנחה של ראש השנה הראשון לגוף מים ולומר פסוקים.",
                "מנהג נפוץ; יש הנוהגים ביום שני או אחרי החג — לפי הקהילה.",
            ),
        ),
        S(
            "rh-mitzvah-kiddush",
            "קידוש וסימנים",
            I(
                "rh-kiddush",
                "קידוש",
                "בליל החג וביום מברכים קידוש על יין (או על לחם ביום אם אין יין), עם שהחיינו בכניסת החג.",
            ),
            I(
                "rh-simanim",
                "סימנים בליל החג",
                "אוכלים סימנים ואומרים יהי רצון — תמר, תפוח, רימון וכו' — כסימן לברכה בשנה החדשה.",
                "מנהג נפוץ; אין חובה הלכתית אחידה על כל סימן.",
            ),
        ),
    ],
    "prayers": [
        S(
            "rh-prayers",
            "נקודות בתפילה",
            I(
                "rh-malchuyot",
                "מלכויות",
                "קטעי פסוקים על מלכות ה' — בתפילת מוסף בראש השנה.",
            ),
            I(
                "rh-zichronot",
                "זיכרונות",
                "פסוקים על זכירה — זכירת מעשי האדם וברית ה' עם ישראל.",
            ),
            I(
                "rh-shofarot",
                "שופרות",
                "פסוקים על השופר — קישור בין תקיעת שופר לזכירה ולמלכות.",
            ),
        ),
    ],
    "practicalTips": [
        T(
            "rh-tip-community",
            "בדוק מנהג הקהילה",
            "מנהגי תפילה, נוסח, תשליך וסימנים משתנים — שאל את הרב או בית הכנסת המקומי.",
        ),
        T(
            "rh-tip-shofar",
            "הגע מוקדם לתקיעות",
            "בתפילות עמוסות — הגעה מוקדמת עוזרת לשמוע את השופר בנוחות.",
        ),
        T(
            "rh-tip-meals",
            "תכנן סעודות מראש",
            "הכנת מנות ויין לפני החג מקלה על שמירת קידוש וסעודות בכבוד.",
        ),
        T(
            "rh-tip-second-day",
            'יום שני בחו"ל',
            'אם אתה בחו"ל — הכן לשני ימי תפילה, שופר ביום שני, ושהחיינו ביום הראשון בלבד.',
            'לפי מנהג אשכנז בחו"ל — שהחיינו ביום הראשון על כל שני הימים.',
        ),
    ],
    "commonQuestions": [
        Q(
            "rh-faq-work",
            "האם מותר לעבוד בראש השנה?",
            "ראש השנה הוא יום טוב — איסור מלאכה כמו בשבת, עם היתרים מוגבלים לצרכי אוכל נפש.",
        ),
        Q(
            "rh-faq-shehecheyanu",
            "למה לא אומרים שהחיינו ביום שני?",
            'בחו"ל יום שני נשמר כיום ספק — הברכה נאמרת ביום הראשון על כל שני הימים.',
            'לפי מנהג אשכנז בחו"ל.',
        ),
        Q(
            "rh-faq-shofar-minyan",
            "האם חייב מניין לשופר?",
            "החיוב הוא אישי לשמוע תקיעות; במעשה מתקיעים במניין. יש להתייעץ עם הרב אם לא ניתן להגיע.",
        ),
    ],
    "commonMistakes": [
        T(
            "rh-mistake-candles",
            "הדלקת נרות אחרי כניסת החג",
            "יש להדליק לפני שקיעה — איחור עלול לפגוע בקיום המצווה.",
        ),
        T(
            "rh-mistake-zmanim",
            "התעלמות מזמני המקום",
            "זמני כניסה ויציאה תלויים במיקום — אל תסתמך על זמנים של עיר אחרת.",
        ),
    ],
    "checklist": [
        C("rh-cl-candles", "נרות וגפרורים"),
        C("rh-cl-wine", "יין לקידוש"),
        C("rh-cl-bread", "לחם וחלה לסעודות"),
        C("rh-cl-simanim", "סימנים לערב (לפי מנהג)"),
        C("rh-cl-machzor", "מחזור או סידור לימי החג"),
        C("rh-cl-synagogue", "זמני תפילות בבית הכנסת"),
        C("rh-cl-clothes", "לבוש נקי לחג"),
    ],
    "sources": [
        SRC("תנ\"ך", 'ויקרא כ"ג:כ"ד; במדבר כ"ט:א'),
        SRC("משנה", 'מסכת ראש השנה א:ב; ד:ה'),
        SRC("תלמוד בבלי", 'מסכת ראש השנה דף ל"ג ואילך'),
        SRC("רמב\"ם", 'הלכות שופר א\'–ג\'', "מימון הצדיק"),
        SRC("שולחן ערוך", 'אורח חיים תקפ"א–תקפ"ג', "רבי יוסף קארו"),
    ],
}

YOM_KIPPUR = {
    "id": "guide-yom-kippur",
    "holidayKey": "yom_kippur",
    "themeKey": "yom_kippur",
    "titleHebrew": "יום כיפור",
    "subtitleHebrew": "שבת שבתון וצום כפרה",
    "shortDescription": (
        "מדריך הכנה וקיום ליום כיפור: סעודה מפסקת, צום, תפילות, וידוי וחמישה עינויים."
    ),
    "overview": S(
        "yk-overview",
        "מהות היום",
        I(
            "yk-atonement",
            "יום הכפרה",
            'יום כיפור הוא "שבת שבתון" ויום כפרה לכל ישראל, כפי שכתוב בויקרא כ"ג. בו מתכפרים על עוונות למי שחוזר בתשובה.',
        ),
        I(
            "yk-fast",
            "צום כ\"ה שעות",
            "מצווה להתענות מערב יום כיפור עד לילה שלמחרת — חמישה עינויים: אכילה, שתייה, רחיצה, סיכה, נעילת סנדל ותשמיש המיטה.",
            'שו"ע או"ח סימן תרי"ח',
        ),
        I(
            "yk-prayer",
            "יום תפילה",
            "היום מוקדש לתפילות ארוכות: כולל נעילה, וידוי בכל תפילה, ותפילות מיוחדות כמו כול נדרי בערב.",
        ),
    ),
    "preparation": [
        S(
            "yk-prep-fast",
            "הכנה לצום",
            I(
                "yk-seuda-mafseket",
                "סעודה מפסקת",
                "חובה לאכול סעודה מפסקת לפני כניסת הצום — בדרך כלל לפני שקיעה. מברכים על הלחם ואוכלים בכבוד.",
                'שו"ע או"ח סימן תר"י סעיף א',
            ),
            I(
                "yk-hydration",
                "שתייה לפני הצום",
                "רבים שותים מים לפני הצום לפי הצורך. אין חובה לשתות כמות מסוימת — לפי הרגשת הגוף.",
                "יש הנוהגים לאכול דגים ולא בשר בסעודה המפסקת — מנהג נפוץ.",
            ),
        ),
        S(
            "yk-prep-candles",
            "נרות וכניסת היום",
            I(
                "yk-candles",
                "הדלקת נרות",
                'מדליקים נרות לפני כניסת יום כיפור, עם ברכת "להדליק נר של יום טוב".',
            ),
            I(
                "yk-kaparot",
                "כפרות",
                "מנהג נפוץ לפני יום כיפור לעשות כפרות — לפי מנהג הקהילה. אין לראות בכך תחליף לתשובה.",
                "מנהג נפוץ; יש הנוהגים לתרום הכסף לצדקה — לפי הקהילה.",
            ),
        ),
        S(
            "yk-prep-clothing",
            "לבוש ותפילות",
            I(
                "yk-white",
                "לבוש לבן",
                "מנהג נפוץ ללבוש לבן ביום כיפור — כסמל לטהרה. לא חובה הלכתית.",
                "מנהג נפוץ בקהילות רבות.",
            ),
            I(
                "yk-shoes",
                "נעילת סנדל",
                "ביום כיפור אסור נעילת סנדל מעור. רבים נוהגים נעלי בד או כפכפים שאינם מעור.",
                'שו"ע או"ח סימן תרי"ד',
            ),
        ),
    ],
    "mitzvot": [
        S(
            "yk-mitzvah-fast",
            "צום ועינויים",
            I(
                "yk-five-inuyim",
                "חמישה עינויים",
                "איסור אכילה ושתייה, רחיצה, סיכה, נעילת סנדל ותשמיש המיטה — לכל היום.",
                'ויקרא כ"ג:כ"ז–כ"ט; שו"ע או"ח סימן תרי"ח',
            ),
            I(
                "yk-who-fast",
                "מי חייב בצום",
                "גברים ונשים מגיל חנוך ומעלה חייבים בצום. חולה שיש בו סכנה — פטור וחייב לאכול.",
                'שו"ע או"ח סימן תרי"ח סעיף א',
            ),
        ),
        S(
            "yk-mitzvah-prayer",
            "תפילות ווידוי",
            I(
                "yk-kol-nidrei",
                "כל נדרי",
                "בערב יום כיפור נאמרת תפילת כול נדרי — ביטול נדרים שלא נתקיימו — לפי מנהג הקהילה.",
            ),
            I(
                "yk-vidui",
                "וידוי",
                "אומרים וידוי בכל תפילה — ערבית, שחרית, מוסף, מנחה ונעילה. וידוי זה ועל חטאת.",
            ),
            I(
                "yk-neilah",
                "נעילה",
                "תפילת נעילה בסוף היום — סגירת שערי רחמים. מסתיימת בברכת לשנה טובה ותקיעת שופר.",
            ),
        ),
        S(
            "yk-mitzvah-rest",
            "שבתון",
            I(
                "yk-melacha",
                "איסור מלאכה",
                "יום כיפור הוא שבת שבתון — איסור מלאכה כמו בשבת, ללא היתרי אוכל נפש.",
                'ויקרא כ"ג:כ"ח; שו"ע או"ח סימן תרי"ח',
            ),
        ),
    ],
    "prayers": [
        S(
            "yk-prayers",
            "מוקדי התפילה",
            I(
                "yk-avodah",
                "עבודה",
                "במוסף — תיאור עבודת כהן גדול ביום כיפור — לפי נוסח המחזור.",
            ),
            I(
                "yk-al-cheyt",
                "על חטא",
                "וידוי מרכזי בכל תפילה — רשימת עבירות ולבקש סליחה.",
            ),
        ),
    ],
    "practicalTips": [
        T(
            "yk-tip-rest",
            "מנוחה ביום",
            "הימנע ממאמץ גופני. שכב או שב בנוחות בין תפילות.",
        ),
        T(
            "yk-tip-health",
            "בריאות בצום",
            "אם מרגישים חולשה חריגה — פנו לרב. פיקוח נפש דוחה את הצום.",
        ),
        T(
            "yk-tip-break-fast",
            "אחרי הצום",
            "מברכים על משקה ולחם לאחר צאת הכוכבים. רבים מכינים ארוחה קלה מראש.",
        ),
        T(
            "yk-tip-synagogue",
            "תכנון תפילות",
            "בדוק מראש זמני כול נדרי, שחרית, מוסף, מנחה ונעילה — היום ארוך.",
        ),
    ],
    "commonQuestions": [
        Q(
            "yk-faq-eat",
            "מותר לאכול ביום כיפור?",
            "לא — איסור אכילה ושתייה לכל היום. חולה שיש בו סכנה — פטור וחייב לאכול לפי הוראת רופא ורב.",
        ),
        Q(
            "yk-faq-medicine",
            "האם מותר לקחת תרופות?",
            "תלוי במצב. חולה שיש בו סכנה — לפי הוראת רופא ורב. שאל רב לפני היום.",
        ),
        Q(
            "yk-faq-yizkor",
            "מתי אומרים יזכור?",
            "מנהג נפוץ לומר יזכור ביום כיפור. יש הנוהגים לצאת מבית הכנסת בזמן יזכור — לפי מנהג.",
            "מנהג נפוץ; לא מצווה מהתורה.",
        ),
    ],
    "commonMistakes": [
        T(
            "yk-mistake-no-meal",
            "דילוג על סעודה מפסקת",
            "אסור להתחיל את הצום בלי סעודה מפסקת — חובה לאכול לפני כניסת היום.",
        ),
        T(
            "yk-mistake-washing",
            "רחיצה ביום",
            "רחיצה לתענוג אסורה. ניתן לרחוץ אברים מלוכלכים בלבד — לפי הלכה.",
        ),
    ],
    "checklist": [
        C("yk-cl-meal", "סעודה מפסקת לפני הצום"),
        C("yk-cl-candles", "נרות לערב יום כיפור"),
        C("yk-cl-machzor", "מחזור ליום כיפור"),
        C("yk-cl-shoes", "נעליים שאינן מעור"),
        C("yk-cl-talit", "טלית (למי שמתפלל)"),
        C("yk-cl-break", "הכנת ארוחה לאחר הצום"),
        C("yk-cl-synagogue", "זמני תפילות"),
    ],
    "sources": [
        SRC("תנ\"ך", 'ויקרא כ"ג:כ"ו–כ"ט; ויקרא ט"ז'),
        SRC("משנה", 'מסכת יומא פרק ח'),
        SRC("תלמוד בבלי", 'מסכת יומא דף ע"ג ואילך'),
        SRC("רמב\"ם", 'הלכות שביתת עשור א\'–ג\'', "מימון הצדיק"),
        SRC("שולחן ערוך", 'אורח חיים סימן תר"י–תרכ"ו', "רבי יוסף קארו"),
    ],
}

SUKKOT = {
    "id": "guide-sukkot",
    "holidayKey": "sukkot",
    "themeKey": "sukkot",
    "titleHebrew": "\u05e1\u05d5\u05db\u05d5\u05ea",
    "subtitleHebrew": "\u05d6\u05de\u05df \u05e9\u05de\u05d7\u05ea\u05e0\u05d5 \u2014 \u05e9\u05de\u05d7\u05ea \u05d4\u05d7\u05d2 \u05d5\u05d9\u05e9\u05d9\u05d1\u05d4 \u05d1\u05e1\u05d5\u05db\u05d4",
    "shortDescription": (
        "\u05de\u05d3\u05e8\u05d9\u05da \u05d4\u05db\u05e0\u05d4 \u05d5\u05e7\u05d9\u05d5\u05dd \u05dc\u05d7\u05d2 "
        "\u05d4\u05e1\u05d5\u05db\u05d5\u05ea: \u05d1\u05e0\u05d9\u05d9\u05ea \u05e1\u05d5\u05db\u05d4, "
        "\u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd, \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea "
        "\u05d1\u05e1\u05d5\u05db\u05d4 \u05d5\u05de\u05e0\u05d4\u05d2\u05d9 \u05d4\u05d7\u05d2."
    ),
    "overview": S(
        "sk-overview",
        "\u05de\u05d4\u05d5\u05ea \u05d4\u05d7\u05d2",
        I(
            "sk-harvest",
            "\u05d7\u05d2 \u05d4\u05d0\u05e1\u05d9\u05e3",
            '\u05e1\u05d5\u05db\u05d5\u05ea \u05d4\u05d5\u05d0 "\u05d7\u05d2 \u05d4\u05d0\u05e1\u05d9\u05e3" '
            "\u2014 \u05d6\u05de\u05df \u05d0\u05e1\u05d9\u05e3 \u05d4\u05ea\u05d1\u05d5\u05d0\u05d4. "
            '\u05d7\u05d2 \u05e9\u05de\u05d7 \u05e9\u05dc \u05e9\u05d1\u05e2\u05d4 \u05d9\u05de\u05d9\u05dd, '
            '\u05db\u05e4\u05d9 \u05e9\u05db\u05ea\u05d5\u05d1 \u05d1\u05d5\u05d9\u05e7\u05e8\u05d0 \u05db"\u05d2.',
        ),
        I(
            "sk-sukkah",
            "\u05de\u05e6\u05d5\u05ea \u05e1\u05d5\u05db\u05d4",
            "\u05de\u05e6\u05d5\u05d5\u05d4 \u05dc\u05d9\u05e9\u05d1 \u05d1\u05e1\u05d5\u05db\u05d4 "
            "\u05e9\u05d1\u05e2\u05d4 \u05d9\u05de\u05d9\u05dd \u2014 \u05dc\u05d6\u05db\u05d5\u05e8 "
            "\u05e0\u05d3\u05d5\u05d3\u05d9 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d1\u05de\u05d3\u05d1\u05e8 "
            "\u05d5\u05dc\u05d7\u05d5\u05d2 \u05d0\u05ea \u05d4\u05d7\u05d2 \u05d1\u05e1\u05d5\u05db\u05d4.",
            '\u05d5\u05d9\u05e7\u05e8\u05d0 \u05db"\u05d2:\u05de"\u05d1\u05be\u05de"\u05d2; '
            '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05dc"\u05d8',
        ),
        I(
            "sk-lulav",
            "\u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd",
            "\u05de\u05e6\u05d5\u05d5\u05d4 \u05dc\u05d0\u05d7\u05d5\u05d6 \u05d1\u05dc\u05d5\u05dc\u05d1, "
            "\u05d0\u05ea\u05e8\u05d5\u05d2, \u05d4\u05d3\u05e1 \u05d5\u05e2\u05e8\u05d1\u05d4 "
            "\u2014 \u05d1\u05db\u05dc \u05d9\u05d5\u05dd \u05de\u05d9\u05de\u05d9 \u05d4\u05d7\u05d2.",
            '\u05d5\u05d9\u05e7\u05e8\u05d0 \u05db"\u05d2:\u05de; \u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 '
            '\u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05e0"\u05d0',
        ),
    ),
    "preparation": [
        S(
            "sk-prep-sukkah",
            "\u05d4\u05db\u05e0\u05ea \u05d4\u05e1\u05d5\u05db\u05d4",
            I(
                "sk-sukkah-build",
                "\u05d1\u05e0\u05d9\u05d9\u05ea \u05e1\u05d5\u05db\u05d4",
                "\u05d1\u05d5\u05e0\u05d9\u05dd \u05e1\u05d5\u05db\u05d4 \u05dc\u05e4\u05e0\u05d9 \u05d4\u05d7\u05d2 "
                "\u2014 \u05d3\u05e4\u05e0\u05d5\u05ea \u05de\u05e2\u05de\u05d9\u05d3\u05d5\u05ea "
                "\u05d5\u05e1\u05d9\u05db\u05da \u05de\u05db\u05e1\u05d4. \u05d5\u05d3\u05d0 \u05e9\u05d4\u05e1\u05d9\u05db\u05da "
                "\u05de\u05d5\u05e0\u05d7 \u05de\u05e2\u05dc \u05e8\u05d5\u05d1 \u05d4\u05e1\u05d9\u05db\u05da.",
                '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05e0"\u05d4\u05be\u05ea\u05e8\u05e1"\u05d2',
            ),
            I(
                "sk-sukkah-check",
                "\u05d1\u05d3\u05d9\u05e7\u05ea \u05db\u05e9\u05e8\u05d5\u05ea",
                "\u05d1\u05d5\u05d3\u05e7\u05d9\u05dd \u05d2\u05d5\u05d1\u05d4, \u05e8\u05d5\u05d7 \u05d5\u05de\u05d9\u05e7\u05d5\u05dd "
                "\u2014 \u05dc\u05e4\u05d9 \u05d4\u05dc\u05db\u05d4. \u05e9\u05d0\u05dc \u05e8\u05d1 \u05d0\u05dd \u05d9\u05e9 \u05e1\u05e4\u05e7.",
            ),
        ),
        S(
            "sk-prep-arba",
            "\u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd",
            I(
                "sk-lulav-buy",
                "\u05e8\u05db\u05d9\u05e9\u05ea \u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd",
                "\u05e7\u05d5\u05e0\u05d9\u05dd \u05dc\u05d5\u05dc\u05d1, \u05d0\u05ea\u05e8\u05d5\u05d2, \u05d4\u05d3\u05e1 "
                "\u05d5\u05e2\u05e8\u05d1\u05d4 \u05db\u05e9\u05e8\u05d9\u05dd \u05dc\u05e4\u05e0\u05d9 \u05d4\u05d7\u05d2. "
                "\u05d1\u05d5\u05d3\u05e7\u05d9\u05dd \u05d0\u05ea\u05e8\u05d5\u05d2 \u2014 \u05e9\u05dc\u05dd, "
                "\u05dc\u05d0 \u05d9\u05d1\u05e9 \u05de\u05d3\u05d9.",
                '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05e0"\u05d0\u05be\u05ea\u05e8\u05e0"\u05d7',
            ),
            I(
                "sk-lulav-bind",
                "\u05d0\u05d2\u05d5\u05d3 \u05d4\u05dc\u05d5\u05dc\u05d1",
                "\u05e7\u05d5\u05e9\u05e8\u05d9\u05dd \u05d4\u05d3\u05e1 \u05d5\u05e2\u05e8\u05d1\u05d4 \u05dc\u05dc\u05d5\u05dc\u05d1 "
                "\u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2. \u05de\u05db\u05d9\u05e0\u05d9\u05dd \u05de\u05e8\u05d0\u05e9 "
                "\u05dc\u05db\u05dc \u05d9\u05de\u05d9 \u05d4\u05d7\u05d2.",
            ),
        ),
        S(
            "sk-prep-meals",
            "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d5\u05e0\u05e8\u05d5\u05ea",
            I(
                "sk-meals",
                "\u05d0\u05e8\u05d5\u05d7\u05d5\u05ea \u05d1\u05e1\u05d5\u05db\u05d4",
                "\u05de\u05ea\u05db\u05e0\u05e0\u05d9\u05dd \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d1\u05e1\u05d5\u05db\u05d4 "
                "\u2014 \u05dc\u05d7\u05dd, \u05d9\u05d9\u05df \u05d5\u05de\u05d0\u05db\u05dc\u05d9\u05dd. "
                "\u05d1\u05dc\u05d9\u05dc \u05d4\u05e8\u05d0\u05e9\u05d5\u05df \u2014 \u05e7\u05d9\u05d3\u05d5\u05e9 "
                "\u05d5\u05e9\u05d4\u05d7\u05d9\u05d9\u05e0\u05d5.",
            ),
            I(
                "sk-candles",
                "\u05e0\u05e8\u05d5\u05ea",
                "\u05de\u05d3\u05dc\u05d9\u05e7\u05d9\u05dd \u05e0\u05e8\u05d5\u05ea \u05dc\u05e4\u05e0\u05d9 \u05db\u05e0\u05d9\u05e1\u05ea "
                "\u05db\u05dc \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05e9\u05dc \u05e1\u05d5\u05db\u05d5\u05ea "
                "\u2014 \u05db\u05de\u05d5 \u05d1\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05d0\u05d7\u05e8.",
            ),
        ),
    ],
    "mitzvot": [
        S(
            "sk-mitzvah-sukkah",
            "\u05d9\u05e9\u05d9\u05d1\u05d4 \u05d1\u05e1\u05d5\u05db\u05d4",
            I(
                "sk-sukkah-when",
                "\u05de\u05ea\u05d9 \u05d9\u05d5\u05e9\u05d1\u05d9\u05dd",
                "\u05d7\u05d9\u05d5\u05d1 \u05dc\u05d9\u05e9\u05d1 \u05d1\u05e1\u05d5\u05db\u05d4 "
                "\u2014 \u05d0\u05db\u05d9\u05dc\u05d4, \u05e9\u05ea\u05d9\u05d9\u05d4, \u05e9\u05d9\u05e0\u05d4 "
                "\u05d5\u05e9\u05d9\u05d7\u05d4. \u05d1\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05d7\u05d9\u05d5\u05d1 "
                "\u05d1\u05e1\u05e2\u05d5\u05d3\u05d4; \u05d1\u05d7\u05d5\u05dc \u05d4\u05de\u05d5\u05e2\u05d3 "
                "\u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2.",
                '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05dc"\u05d8',
            ),
            I(
                "sk-sukkah-what",
                "\u05de\u05d4 \u05e2\u05d5\u05e9\u05d9\u05dd \u05d1\u05e1\u05d5\u05db\u05d4",
                "\u05d0\u05d5\u05db\u05dc\u05d9\u05dd \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d1\u05e1\u05d5\u05db\u05d4. "
                "\u05e8\u05d1\u05d9\u05dd \u05d2\u05dd \u05dc\u05e0\u05d9\u05dd \u05d5\u05de\u05d1\u05dc\u05d9\u05dd "
                "\u05d6\u05de\u05df \u05d1\u05e1\u05d5\u05db\u05d4 \u05d1\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1.",
            ),
            I(
                "sk-sukkah-rain",
                "\u05d2\u05e9\u05dd",
                "\u05d0\u05dd \u05d9\u05d5\u05e8\u05d3 \u05d2\u05e9\u05dd \u05d7\u05d6\u05e7 \u2014 \u05e4\u05d8\u05d5\u05e8 "
                "\u05de\u05d9\u05e9\u05d9\u05d1\u05d4 \u05d1\u05e1\u05d5\u05db\u05d4. \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd "
                "\u05db\u05e9\u05d4\u05d2\u05e9\u05dd \u05e4\u05d5\u05e1\u05e7.",
                '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05dc"\u05d8 \u05e1\u05e2\u05d9\u05e3 \u05d9',
            ),
        ),
        S(
            "sk-mitzvah-lulav",
            "\u05e0\u05d8\u05d9\u05dc\u05ea \u05dc\u05d5\u05dc\u05d1",
            I(
                "sk-lulav-when",
                "\u05de\u05ea\u05d9 \u05e0\u05d5\u05d8\u05dc\u05d9\u05dd",
                "\u05d1\u05db\u05dc \u05d9\u05d5\u05dd \u05e9\u05dc \u05e1\u05d5\u05db\u05d5\u05ea \u05e0\u05d5\u05d8\u05dc\u05d9\u05dd "
                "\u05dc\u05d5\u05dc\u05d1 \u05e2\u05dd \u05d1\u05e8\u05db\u05d5\u05ea. \u05d1\u05e9\u05d1\u05ea "
                "\u05d7\u05d2 \u2014 \u05dc\u05d0 \u05e0\u05d5\u05d8\u05dc\u05d9\u05dd \u05dc\u05d5\u05dc\u05d1.",
                '\u05e9\u05d5"\u05e2 \u05d0\u05d5"\u05d7 \u05e1\u05d9\u05de\u05df \u05ea\u05e8\u05e0"\u05d0',
            ),
            I(
                "sk-lulav-how",
                "\u05d0\u05d5\u05e4\u05df \u05d4\u05e0\u05d8\u05d9\u05dc\u05d4",
                "\u05de\u05d7\u05d6\u05d9\u05e7\u05d9\u05dd \u05dc\u05d5\u05dc\u05d1, \u05d0\u05ea\u05e8\u05d5\u05d2, "
                "\u05d4\u05d3\u05e1 \u05d5\u05e2\u05e8\u05d1\u05d4 \u2014 \u05de\u05e0\u05d4\u05d2 \u05d0\u05ea\u05e8\u05d5\u05d2, "
                "\u05de\u05e0\u05e9\u05d9\u05e8 \u05dc\u05d5\u05dc\u05d1. \u05de\u05e0\u05d3\u05e0\u05d3\u05d9\u05dd "
                "\u05dc\u05d5\u05dc\u05d1 \u05d1\u05db\u05dc \u05db\u05d9\u05d5\u05d5\u05df.",
            ),
            I(
                "sk-lulav-who",
                "\u05de\u05d9 \u05d7\u05d9\u05d9\u05d1",
                "\u05d2\u05d1\u05e8\u05d9\u05dd \u05d5\u05e0\u05e9\u05d9\u05dd \u05d7\u05d9\u05d9\u05d1\u05d9\u05dd. "
                "\u05d9\u05dc\u05d3\u05d9\u05dd \u2014 \u05dc\u05e4\u05d9 \u05d7\u05d9\u05e0\u05d5\u05da.",
            ),
        ),
        S(
            "sk-mitzvah-joy",
            "\u05e9\u05de\u05d7\u05d4",
            I(
                "sk-simcha",
                "\u05e9\u05de\u05d7\u05ea \u05d4\u05d7\u05d2",
                "\u05de\u05e6\u05d5\u05d4 \u05dc\u05d4\u05d9\u05d5\u05ea \u05d1\u05e9\u05de\u05d7\u05d4. "
                "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea, \u05e9\u05d9\u05e8\u05d4 \u05d5\u05de\u05d7\u05d5\u05dc "
                "\u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2.",
                '\u05d3\u05d1\u05e8\u05d9\u05dd \u05d8"\u05d6:\u05d9\u05d3\u05be\u05d8"\u05d5',
            ),
        ),
    ],
    "prayers": [
        S(
            "sk-prayers",
            "\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05de\u05d9\u05d5\u05d7\u05d3\u05d5\u05ea",
            I(
                "sk-hallel",
                "\u05d4\u05dc\u05dc",
                "\u05d0\u05d5\u05de\u05e8\u05d9\u05dd \u05d4\u05dc\u05dc \u05d1\u05e9\u05d7\u05e8\u05d9\u05ea "
                "\u05d1\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05e8\u05d0\u05e9\u05d5\u05df \u05d5\u05e9\u05e0\u05d9.",
            ),
            I(
                "sk-hoshanot",
                "\u05d4\u05d5\u05e9\u05e2\u05e0\u05d5\u05ea",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05d4\u05e7\u05d9\u05e3 "
                "\u05d1\u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd \u05d1\u05d4\u05d5\u05e9\u05e2\u05e0\u05d5\u05ea "
                "\u2014 \u05d1\u05e9\u05d7\u05e8\u05d9\u05ea.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5; \u05dc\u05e4\u05d9 \u05e0\u05d5\u05e1\u05d7 \u05d4\u05e7\u05d4\u05d9\u05dc\u05d4.",
            ),
        ),
    ],
    "practicalTips": [
        T(
            "sk-tip-weather",
            "\u05de\u05d6\u05d2 \u05d0\u05d5\u05d5\u05d9\u05e8",
            "\u05d4\u05db\u05d9\u05df \u05d1\u05d2\u05d3\u05d9\u05dd \u05dc\u05ea\u05e0\u05d0\u05d9 \u05d5\u05e1\u05d5\u05db\u05d4 "
            "\u05dc\u05d2\u05e9\u05dd.",
        ),
        T(
            "sk-tip-lulav",
            "\u05e9\u05de\u05d9\u05e8\u05ea \u05dc\u05d5\u05dc\u05d1",
            "\u05e9\u05de\u05e8\u05d5 \u05d0\u05ea \u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd "
            "\u05d1\u05de\u05e7\u05d5\u05dd \u05e7\u05e8\u05d9\u05e8 \u05d5\u05dc\u05d7.",
        ),
        T(
            "sk-tip-meals",
            "\u05ea\u05db\u05e0\u05d5\u05df \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea",
            "\u05d4\u05db\u05d9\u05e0\u05d5 \u05de\u05d0\u05db\u05dc\u05d9\u05dd \u05e9\u05d9\u05d5\u05db\u05dc\u05d5 "
            "\u05dc\u05d4\u05d2\u05d9\u05e2 \u05dc\u05e1\u05d5\u05db\u05d4.",
        ),
        T(
            "sk-tip-community",
            "\u05de\u05e0\u05d4\u05d2 \u05d4\u05e7\u05d4\u05d9\u05dc\u05d4",
            "\u05d6\u05de\u05e0\u05d9 \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea, \u05d4\u05d5\u05e9\u05e2\u05e0\u05d5\u05ea "
            "\u05d5\u05d0\u05d5\u05e9\u05e4\u05d9\u05d6\u05d9\u05df \u2014 \u05dc\u05e4\u05d9 \u05d4\u05de\u05e7\u05d5\u05dd.",
        ),
    ],
    "commonQuestions": [
        Q(
            "sk-faq-rain",
            "\u05de\u05d4 \u05e2\u05d5\u05e9\u05d9\u05dd \u05d1\u05d2\u05e9\u05dd?",
            "\u05d0\u05dd \u05d4\u05d2\u05e9\u05dd \u05d7\u05d6\u05e7 \u2014 \u05e4\u05d8\u05d5\u05e8 "
            "\u05de\u05e1\u05d5\u05db\u05d4. \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd \u05db\u05e9\u05d4\u05d2\u05e9\u05dd \u05e4\u05d5\u05e1\u05e7.",
        ),
        Q(
            "sk-faq-shabbat",
            "\u05dc\u05d5\u05dc\u05d1 \u05d1\u05e9\u05d1\u05ea?",
            "\u05d1\u05e9\u05d1\u05ea \u05d7\u05d2 \u05e9\u05dc \u05e1\u05d5\u05db\u05d5\u05ea \u2014 "
            "\u05d0\u05d9\u05df \u05e0\u05d8\u05d9\u05dc\u05ea \u05dc\u05d5\u05dc\u05d1.",
        ),
        Q(
            "sk-faq-chol",
            "\u05d7\u05d9\u05d5\u05d1 \u05e1\u05d5\u05db\u05d4 \u05d1\u05d7\u05d5\u05dc \u05d4\u05de\u05d5\u05e2\u05d3?",
            "\u05d1\u05d7\u05d5\u05dc \u05d4\u05de\u05d5\u05e2\u05d3 \u2014 \u05d7\u05d9\u05d5\u05d1 "
            "\u05d1\u05e1\u05d5\u05db\u05d4 \u05dc\u05e4\u05d9 \u05d7\u05db\u05de\u05d9\u05dd; \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2.",
        ),
    ],
    "commonMistakes": [
        T(
            "sk-mistake-schach",
            "\u05e1\u05d9\u05db\u05da \u05dc\u05d0 \u05db\u05e9\u05e8",
            "\u05e1\u05d9\u05db\u05da \u05e6\u05e8\u05d9\u05da \u05dc\u05d4\u05d9\u05d5\u05ea \u05de\u05df "
            "\u05d4\u05e6\u05d5\u05de\u05d7 \u05d5\u05dc\u05d4\u05e2\u05d1\u05d9\u05e8 \u05d0\u05ea \u05d4\u05d2\u05e9\u05dd.",
        ),
        T(
            "sk-mistake-etrog",
            "\u05d0\u05ea\u05e8\u05d5\u05d2 \u05e4\u05e1\u05d5\u05dc",
            "\u05d0\u05ea\u05e8\u05d5\u05d2 \u05e9\u05dc\u05dd \u2014 \u05d0\u05d9\u05df \u05d7\u05e1\u05e8 "
            "\u05d5\u05d0\u05d9\u05df \u05d9\u05d1\u05e9 \u05de\u05d0\u05d5\u05d3.",
        ),
    ],
    "checklist": [
        C("sk-cl-sukkah", "\u05e1\u05d5\u05db\u05d4 \u05db\u05e9\u05e8\u05d4"),
        C("sk-cl-schach", "\u05e1\u05d9\u05db\u05da"),
        C("sk-cl-lulav", "\u05d0\u05e8\u05d1\u05e2\u05ea \u05d4\u05de\u05d9\u05e0\u05d9\u05dd"),
        C("sk-cl-wine", "\u05d9\u05d9\u05df \u05dc\u05e7\u05d9\u05d3\u05d5\u05e9"),
        C("sk-cl-bread", "\u05dc\u05d7\u05dd \u05dc\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea"),
        C("sk-cl-candles", "\u05e0\u05e8\u05d5\u05ea \u05dc\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1"),
        C("sk-cl-decor", "\u05e7\u05d9\u05e9\u05d5\u05d8\u05d9\u05dd \u05dc\u05e1\u05d5\u05db\u05d4 (\u05de\u05e0\u05d4\u05d2)"),
    ],
    "sources": [
        SRC("תנ\"ך", '\u05d5\u05d9\u05e7\u05e8\u05d0 \u05db"\u05d2; \u05d3\u05d1\u05e8\u05d9\u05dd \u05d8"\u05d6'),
        SRC("משנה", '\u05de\u05e1\u05db\u05ea \u05e1\u05d5\u05db\u05d4'),
        SRC("תלמוד בבלי", '\u05de\u05e1\u05db\u05ea \u05e1\u05d5\u05db\u05d4'),
        SRC("רמב\"ם", '\u05d4\u05dc\u05db\u05d5\u05ea \u05dc\u05d5\u05dc\u05d1 \u05d5\u05e1\u05d5\u05db\u05d4', "\u05de\u05d9\u05de\u05d5\u05df \u05d4\u05e6\u05d3\u05d9\u05e7"),
        SRC("שולחן ערוך", '\u05d0\u05d5\u05e8\u05d7 \u05d7\u05d9\u05d9\u05dd \u05ea\u05e8\u05dc"\u05d8\u05be\u05ea\u05e8\u05e2"\u05d0', "\u05e8\u05d1\u05d9 \u05d9\u05d5\u05e1\u05e3 \u05e7\u05d0\u05e8\u05d5"),
    ],
}

SHEMINI_ATZERET = {
    "id": "guide-shemini-atzeret",
    "holidayKey": "shemini_atzeret",
    "themeKey": "sukkot",
    "titleHebrew": "\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea",
    "subtitleHebrew": "\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e1\u05d5\u05db\u05d5\u05ea",
    "shortDescription": (
        "\u05de\u05d3\u05e8\u05d9\u05da \u05dc\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea: "
        "\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1, \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea, \u05e7\u05d9\u05d3\u05d5\u05e9 "
        "\u05d5\u05de\u05e0\u05d4\u05d2\u05d9 \u05d2\u05e9\u05dd \u05d5\u05d9\u05d6\u05db\u05d5\u05e8."
    ),
    "overview": S(
        "sa-overview",
        "\u05de\u05d4\u05d5\u05ea \u05d4\u05d9\u05d5\u05dd",
        I(
            "sa-separate",
            "\u05d7\u05d2 \u05e0\u05e4\u05e8\u05d3",
            '\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea \u05d4\u05d5\u05d0 \u05d9\u05d5\u05dd '
            '\u05d8\u05d5\u05d1 \u05e0\u05e4\u05e8\u05d3 \u05de\u05e1\u05d5\u05db\u05d5\u05ea, '
            '\u05db\u05e4\u05d9 \u05e9\u05db\u05ea\u05d5\u05d1 "\u05d1\u05d9\u05d5\u05dd \u05d4\u05e9\u05de\u05d9\u05e0\u05d9 '
            '\u05d4\u05d6\u05d4 \u05e2\u05e6\u05e8\u05ea \u05d4\u05d5\u05d0 \u05dc\u05db\u05dd".',
            '\u05d1\u05de\u05d3\u05d1\u05e8 \u05db\u05d3"\u05d8:\u05dc"ו',
        ),
        I(
            "sa-yom-tov",
            "\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1",
            "\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05e2\u05dd \u05d0\u05d9\u05e1\u05d5\u05e8 \u05de\u05dc\u05d0\u05db\u05d4, "
            "\u05e7\u05d9\u05d3\u05d5\u05e9 \u05d5\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05db\u05de\u05d5 \u05d1\u05d9\u05de\u05d9 "
            "\u05d8\u05d5\u05d1 \u05d0\u05d7\u05e8\u05d9\u05dd.",
        ),
        I(
            "sa-israel-diaspora",
            "\u05d9\u05e9\u05e8\u05d0\u05dc \u05d5\u05d7\u05d5\u05f3\u05dc",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea "
            "\u05d5\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4 \u05d1\u05d9\u05d5\u05dd \u05d0\u05d7\u05d3. "
            '\u05d1\u05d7\u05d5\u05f3\u05dc \u05e9\u05e0\u05d9 \u05d9\u05de\u05d9\u05dd \u05e0\u05e4\u05e8\u05d3\u05d9\u05dd.',
            '\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 \u05d4\u05de\u05e7\u05d5\u05dd.',
        ),
    ),
    "preparation": [
        S(
            "sa-prep-candles",
            "\u05e0\u05e8\u05d5\u05ea \u05d5\u05db\u05e0\u05d9\u05e1\u05ea \u05d4\u05d9\u05d5\u05dd",
            I(
                "sa-candles",
                "\u05d4\u05d3\u05dc\u05e7\u05ea \u05e0\u05e8\u05d5\u05ea",
                'מדליקים נרות לפני כניסת יום טוב, עם ברכת "להדליק נר של יום טוב".',
            ),
            I(
                "sa-timing",
                "\u05d6\u05de\u05df \u05db\u05e0\u05d9\u05e1\u05d4",
                "\u05d9\u05e9 \u05dc\u05d5\u05d5\u05d3\u05d0 \u05e9\u05e2\u05ea \u05db\u05e0\u05d9\u05e1\u05ea \u05d4\u05d9\u05d5\u05dd "
                "\u05dc\u05e4\u05d9 \u05de\u05d9\u05e7\u05d5\u05dd \u2014 \u05d0\u05d7\u05e8 \u05e1\u05d5\u05db\u05d5\u05ea.",
            ),
        ),
        S(
            "sa-prep-meals",
            "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea",
            I(
                "sa-meals",
                "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d4\u05d9\u05d5\u05dd",
                "\u05de\u05ea\u05db\u05e0\u05e0\u05d9\u05dd \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 "
                "\u05e2\u05dd \u05dc\u05d7\u05dd \u05d5\u05d9\u05d9\u05df. \u05d1\u05dc\u05d9\u05dc \u2014 \u05e7\u05d9\u05d3\u05d5\u05e9.",
            ),
            I(
                "sa-sukkah",
                "\u05e1\u05e2\u05d5\u05d3\u05d4 \u05d1\u05e1\u05d5\u05db\u05d4",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05e1\u05e2\u05d5\u05d3 \u05d0\u05d7\u05e8\u05d5\u05df "
                "\u05d1\u05e1\u05d5\u05db\u05d4 \u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5; \u05dc\u05d0 \u05d7\u05d5\u05d1\u05d4 \u05d0\u05d7\u05d9\u05d3\u05d4.",
            ),
        ),
        S(
            "sa-prep-prayer",
            "\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea",
            I(
                "sa-machzor",
                "\u05de\u05d7\u05d6\u05d5\u05e8",
                "\u05de\u05db\u05d9\u05e0\u05d9\u05dd \u05de\u05d7\u05d6\u05d5\u05e8 \u05d0\u05d5 \u05e1\u05d9\u05d3\u05d5\u05e8 "
                "\u05dc\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05d5\u05dc\u05ea\u05e4\u05d9\u05dc\u05ea \u05d2\u05e9\u05dd.",
            ),
            I(
                "sa-yizkor",
                "\u05d9\u05d6\u05db\u05d5\u05e8",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05d0\u05de\u05d5\u05e8 \u05d9\u05d6\u05db\u05d5\u05e8 "
                "\u05d1\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05d1\u05e7\u05d4\u05d9\u05dc\u05d5\u05ea \u05e8\u05d1\u05d5\u05ea; "
                "\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 \u05d4\u05de\u05e7\u05d5\u05dd.",
            ),
        ),
    ],
    "mitzvot": [
        S(
            "sa-mitzvah-yom-tov",
            "\u05e7\u05d9\u05d5\u05dd \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1",
            I(
                "sa-melacha",
                "\u05d0\u05d9\u05e1\u05d5\u05e8 \u05de\u05dc\u05d0\u05db\u05d4",
                "\u05d0\u05d9\u05e1\u05d5\u05e8 \u05de\u05dc\u05d0\u05db\u05d4 \u05db\u05de\u05d5 \u05d1\u05d9\u05d5\u05dd "
                "\u05d8\u05d5\u05d1 \u05d0\u05d7\u05e8 \u05e2\u05dd \u05d4\u05ea\u05e8\u05d9\u05dd \u05dc\u05e6\u05e8\u05db\u05d9 "
                "\u05d0\u05d5\u05db\u05dc \u05e0\u05e4\u05e9.",
            ),
            I(
                "sa-kiddush",
                "\u05e7\u05d9\u05d3\u05d5\u05e9",
                "\u05de\u05d1\u05e8\u05db\u05d9\u05dd \u05e7\u05d9\u05d3\u05d5\u05e9 \u05e2\u05dc \u05d9\u05d9\u05df "
                "\u05d1\u05dc\u05d9\u05dc \u05d5\u05d1\u05d9\u05d5\u05dd.",
            ),
        ),
        S(
            "sa-mitzvah-geshem",
            "\u05ea\u05e4\u05d9\u05dc\u05ea \u05d2\u05e9\u05dd",
            I(
                "sa-geshem",
                "\u05ea\u05e4\u05d9\u05dc\u05ea \u05d2\u05e9\u05dd",
                "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d0\u05d5\u05de\u05e8\u05d9\u05dd \u05ea\u05e4\u05d9\u05dc\u05ea "
                "\u05d2\u05e9\u05dd \u05d1\u05de\u05d5\u05e1\u05e3 \u05e9\u05dc \u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea.",
                "\u05d1\u05d7\u05d5\u05f3\u05dc \u2014 \u05dc\u05e8\u05d1 \u05d1\u05e9\u05de\u05d9\u05d7\u05ea "
                "\u05ea\u05d5\u05e8\u05d4; \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 \u05d4\u05de\u05e7\u05d5\u05dd.",
            ),
            I(
                "sa-mashiv",
                "\u05de\u05b8\u05c1\u05e9\u05c1\u05b4\u05c1\u05d9\u05d1 \u05d4\u05b8\u05c1\u05e8\u05d5\u05b9\u05c1\u05d7\u05b7",
                "\u05de\u05d9\u05d3 \u05d2\u05e9\u05dd \u05de\u05ea\u05d7\u05dc\u05d9\u05dd \u05dc\u05d0\u05de\u05d5\u05e8 "
                "\u05de\u05b8\u05c1\u05e9\u05c1\u05b4\u05c1\u05d9\u05d1 \u05d4\u05b8\u05c1\u05e8\u05d5\u05b9\u05c1\u05d7\u05b7 \u05d4\u05b8\u05c1\u05de\u05b8\u05c1\u05d9\u05df "
                "\u05d1\u05ea\u05e4\u05d9\u05dc\u05ea \u05e2\u05de\u05d9\u05d3\u05ea \u05d2\u05e9\u05dd.",
            ),
        ),
        S(
            "sa-mitzvah-yizkor",
            "\u05d9\u05d6\u05db\u05d5\u05e8",
            I(
                "sa-yizkor-mitzvah",
                "\u05d6\u05db\u05e8 \u05e0\u05e9\u05de\u05d5\u05ea",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05d6\u05db\u05d5\u05e8 \u05d0\u05ea \u05e0\u05e9\u05de\u05d5\u05ea "
                "\u05d4\u05e7\u05d3\u05d5\u05e9\u05d9\u05dd \u05d5\u05dc\u05ea\u05e8\u05d5\u05dd \u05dc\u05e0\u05e9\u05de\u05d5\u05ea "
                "\u05d1\u05e2\u05d3 \u05e6\u05d3\u05e7\u05d4.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5; \u05dc\u05d0 \u05de\u05e6\u05d5\u05d5\u05d4 \u05de\u05d4\u05ea\u05d5\u05e8\u05d4.",
            ),
        ),
    ],
    "prayers": [
        S(
            "sa-prayers",
            "\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05de\u05d9\u05d5\u05d7\u05d3\u05d5\u05ea",
            I(
                "sa-atzeret",
                "\u05e2\u05e6\u05e8\u05ea",
                "\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05de\u05d3\u05d2\u05d9\u05e9\u05d5\u05ea \u05e2\u05e6\u05d9\u05e8\u05ea "
                "\u05d4\u05d7\u05d2 \u2014 \u05d9\u05d5\u05dd \u05e0\u05e4\u05e8\u05d3 \u05dc\u05e1\u05d5\u05db\u05d5\u05ea.",
            ),
        ),
    ],
    "practicalTips": [
        T(
            "sa-tip-diaspora",
            "\u05d9\u05d5\u05dd \u05e0\u05e4\u05e8\u05d3 \u05de\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05e9\u05e0\u05d9 \u05d4\u05d7\u05d2\u05d9\u05dd "
            "\u05de\u05e6\u05d5\u05d8\u05d8\u05e4\u05d9\u05dd \u05d1\u05d9\u05d5\u05dd \u05d0\u05d7\u05d3.",
            "\u05d1\u05d7\u05d5\u05f3\u05dc \u05e9\u05e0\u05d9 \u05d9\u05de\u05d9\u05dd \u05e0\u05e4\u05e8\u05d3\u05d9\u05dd.",
        ),
        T(
            "sa-tip-geshem",
            "\u05ea\u05e4\u05d9\u05dc\u05ea \u05d2\u05e9\u05dd",
            "\u05d1\u05d3\u05d5\u05e7 \u05de\u05ea\u05d9 \u05d0\u05d5\u05de\u05e8\u05d9\u05dd \u05d2\u05e9\u05dd "
            "\u05d1\u05e7\u05d4\u05d9\u05dc\u05ea\u05da \u2014 \u05d1\u05d9\u05e9\u05e8\u05d0\u05dc \u05d1\u05e9\u05de\u05d9\u05e0\u05d9 "
            "\u05e2\u05e6\u05e8\u05ea, \u05d1\u05d7\u05d5\u05f3\u05dc \u05d1\u05e9\u05de\u05d9\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4.",
        ),
        T(
            "sa-tip-yizkor",
            "\u05d9\u05d6\u05db\u05d5\u05e8",
            "\u05d0\u05dd \u05d9\u05e9 \u05de\u05e0\u05d4\u05d2 \u05dc\u05e6\u05d0\u05ea \u05de\u05d1\u05d9\u05ea "
            "\u05d4\u05db\u05e0\u05e1\u05ea \u05d1\u05d6\u05de\u05df \u05d9\u05d6\u05db\u05d5\u05e8 \u2014 "
            "\u05dc\u05de\u05d3 \u05de\u05e0\u05d4\u05d2 \u05d4\u05e7\u05d4\u05d9\u05dc\u05d4.",
        ),
    ],
    "commonQuestions": [
        Q(
            "sa-faq-sukkah",
            "\u05d7\u05d9\u05d9\u05d1 \u05d1\u05e1\u05d5\u05db\u05d4 \u05d1\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea?",
            "\u05d1\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 \u05d0\u05d7\u05e8\u05d5\u05df \u2014 \u05dc\u05d0 \u05d7\u05d9\u05d5\u05d1 "
            "\u05d1\u05e1\u05d5\u05db\u05d4. \u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05e1\u05e2\u05d5\u05d3 \u05d0\u05d7\u05e8\u05d5\u05df "
            "\u05d1\u05e1\u05d5\u05db\u05d4.",
            "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5.",
        ),
        Q(
            "sa-faq-simchat",
            "\u05d4\u05d0\u05dd \u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea \u05d5\u05e9\u05de\u05d7\u05ea "
            "\u05ea\u05d5\u05e8\u05d4 \u05d0\u05d5\u05ea\u05d5 \u05d3\u05d1\u05e8?",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d4\u05dd \u05d9\u05d5\u05dd \u05d0\u05d7\u05d3. "
            '\u05d1\u05d7\u05d5\u05f3\u05dc \u05d4\u05dd \u05e9\u05e0\u05d9 \u05d9\u05de\u05d9\u05dd \u05e0\u05e4\u05e8\u05d3\u05d9\u05dd.',
        ),
    ],
    "commonMistakes": [
        T(
            "sa-mistake-lulav",
            "\u05e0\u05d8\u05d9\u05dc\u05ea \u05dc\u05d5\u05dc\u05d1",
            "\u05d1\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea \u05d0\u05d9\u05df \u05e0\u05d8\u05d9\u05dc\u05ea "
            "\u05dc\u05d5\u05dc\u05d1 \u2014 \u05d4\u05d7\u05d2 \u05e0\u05d2\u05de\u05e8.",
        ),
        T(
            "sa-mistake-geshem",
            "\u05ea\u05d7\u05d9\u05dc\u05ea \u05d2\u05e9\u05dd",
            "\u05d0\u05dc \u05ea\u05d0\u05de\u05e8 \u05de\u05b8\u05c1\u05e9\u05c1\u05b4\u05c1\u05d9\u05d1 "
            "\u05d4\u05b8\u05c1\u05e8\u05d5\u05b9\u05c1\u05d7\u05b7 \u05dc\u05e4\u05e0\u05d9 \u05d6\u05de\u05df \u05d4\u05de\u05ea\u05d0\u05d9\u05dd "
            "\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 \u05d4\u05e7\u05d4\u05d9\u05dc\u05d4.",
        ),
    ],
    "checklist": [
        C("sa-cl-candles", "\u05e0\u05e8\u05d5\u05ea \u05dc\u05d9\u05d5\u05dd \u05d8\u05d5\u05d1"),
        C("sa-cl-wine", "\u05d9\u05d9\u05df \u05dc\u05e7\u05d9\u05d3\u05d5\u05e9"),
        C("sa-cl-bread", "\u05dc\u05d7\u05dd \u05dc\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea"),
        C("sa-cl-machzor", "\u05de\u05d7\u05d6\u05d5\u05e8 \u05dc\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea"),
        C("sa-cl-yizkor", "\u05d4\u05db\u05e0\u05d4 \u05dc\u05d9\u05d6\u05db\u05d5\u05e8 (\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2)"),
        C("sa-cl-charity", "\u05ea\u05e8\u05d5\u05de\u05d4 \u05dc\u05e0\u05e9\u05de\u05d5\u05ea (\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2)"),
    ],
    "sources": [
        SRC("תנ\"ך", '\u05d1\u05de\u05d3\u05d1\u05e8 \u05db\u05d3"\u05d8:\u05dc"ו; \u05d5\u05d9\u05e7\u05e8\u05d0 \u05db"\u05d2:\u05dc"ו'),
        SRC("משנה", '\u05de\u05e1\u05db\u05ea \u05e8\u05d0\u05e9 \u05d4\u05e9\u05e0\u05d4 \u05d0:\u05d9'),
        SRC("תלמוד בבלי", '\u05de\u05e1\u05db\u05ea \u05e1\u05d5\u05db\u05d4 \u05d3\u05e3 \u05e0"\u05d4'),
        SRC("רמב\"ם", '\u05d4\u05dc\u05db\u05d5\u05ea \u05e9\u05d5\u05e4\u05e8 \u05d5\u05e0\u05d5\u05e8\u05d0 \u05e4"\u05d6', "\u05de\u05d9\u05de\u05d5\u05df \u05d4\u05e6\u05d3\u05d9\u05e7"),
        SRC("שולחן ערוך", '\u05d0\u05d5\u05e8\u05d7 \u05d7\u05d9\u05d9\u05dd \u05ea\u05e8\u05e2"\u05d0', "\u05e8\u05d1\u05d9 \u05d9\u05d5\u05e1\u05e3 \u05e7\u05d0\u05e8\u05d5"),
    ],
}

SIMCHAT_TORAH = {
    "id": "guide-simchat-torah",
    "holidayKey": "simchat_torah",
    "themeKey": "sukkot",
    "titleHebrew": "\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4",
    "subtitleHebrew": "\u05e9\u05d9\u05de\u05d7\u05d4 \u05d1\u05ea\u05d5\u05e8\u05d4 \u05d5\u05e1\u05d9\u05d5\u05dd \u05d4\u05e7\u05e8\u05d9\u05d0\u05d4",
    "shortDescription": (
        "\u05de\u05d3\u05e8\u05d9\u05da \u05dc\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4: "
        "\u05d4\u05e7\u05e4\u05d5\u05ea, \u05e7\u05e8\u05d9\u05d0\u05ea \u05e1\u05d9\u05d5\u05dd "
        "\u05d5\u05e9\u05de\u05d7\u05ea \u05d1\u05ea\u05d5\u05e8\u05d4."
    ),
    "overview": S(
        "st-overview",
        "\u05de\u05d4\u05d5\u05ea \u05d4\u05d7\u05d2",
        I(
            "st-completion",
            "\u05e1\u05d9\u05d5\u05dd \u05d4\u05e7\u05e8\u05d9\u05d0\u05d4",
            "\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4 \u05d4\u05d5\u05d0 \u05d9\u05d5\u05dd \u05e9\u05d9\u05de\u05d7 "
            "\u05d1\u05e1\u05d9\u05d5\u05dd \u05e7\u05e8\u05d9\u05d0\u05ea \u05e9\u05e0\u05ea \u05d4\u05ea\u05d5\u05e8\u05d4 "
            "\u05d5\u05d4\u05ea\u05d7\u05dc\u05ea \u05dc\u05d1\u05e8\u05d0\u05e9\u05d9\u05ea.",
        ),
        I(
            "st-hakafot",
            "\u05d4\u05e7\u05e4\u05d5\u05ea",
            "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05d4\u05e7\u05d9\u05e3 \u05e2\u05dd \u05e1\u05e4\u05e8 "
            "\u05d4\u05ea\u05d5\u05e8\u05d4 \u05d1\u05e9\u05de\u05d7\u05d4 \u05d5\u05d1\u05e8\u05db\u05d4.",
            "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5; \u05dc\u05d0 \u05de\u05e6\u05d5\u05d5\u05d4 \u05de\u05d4\u05ea\u05d5\u05e8\u05d4.",
        ),
        I(
            "st-israel-diaspora",
            "\u05d1\u05d9\u05e9\u05e8\u05d0\u05dc \u05d5\u05d1\u05d7\u05d5\u05f3\u05dc",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4 "
            "\u05d1\u05d9\u05d5\u05dd \u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea. "
            '\u05d1\u05d7\u05d5\u05f3\u05dc \u05d1\u05d9\u05d5\u05dd \u05d4\u05ea\u05e9\u05d9\u05e2\u05d9 '
            '\u05dc\u05e1\u05d5\u05db\u05d5\u05ea \u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 \u05d4\u05de\u05e7\u05d5\u05dd.',
        ),
    ),
    "preparation": [
        S(
            "st-prep-synagogue",
            "\u05d4\u05db\u05e0\u05d4 \u05dc\u05d1\u05d9\u05ea \u05d4\u05db\u05e0\u05e1\u05ea",
            I(
                "st-times",
                "\u05d6\u05de\u05e0\u05d9 \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea",
                "\u05d1\u05d3\u05d5\u05e7 \u05de\u05e8\u05d0\u05e9 \u05e9\u05e2\u05d5\u05ea \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea "
                "\u05d5\u05d4\u05e7\u05e4\u05d5\u05ea \u2014 \u05d4\u05d9\u05d5\u05dd \u05e2\u05dd "
                "\u05e9\u05de\u05d7\u05d4 \u05d5\u05e8\u05e7\u05d3.",
            ),
            I(
                "st-children",
                "\u05d9\u05dc\u05d3\u05d9\u05dd",
                "\u05d4\u05db\u05d9\u05df \u05d9\u05dc\u05d3\u05d9\u05dd \u05dc\u05d7\u05d2 \u05e2\u05dd "
                "\u05e9\u05d9\u05e8\u05d9\u05dd \u05e7\u05d8\u05e0\u05d9\u05dd \u05d5\u05d3\u05d2\u05dc\u05d9\u05dd "
                "\u05de\u05ea\u05d0\u05d9\u05dd \u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2.",
            ),
        ),
        S(
            "st-prep-meals",
            "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea",
            I(
                "st-meals",
                "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d4\u05d9\u05d5\u05dd",
                "\u05ea\u05db\u05e0\u05df \u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 "
                "\u05dc\u05e4\u05e0\u05d9 \u05d5\u05d0\u05d7\u05e8\u05d9 \u05d4\u05e7\u05e4\u05d5\u05ea.",
            ),
            I(
                "st-candles",
                "\u05e0\u05e8\u05d5\u05ea",
                "\u05d1\u05d7\u05d5\u05f3\u05dc \u2014 \u05de\u05d3\u05dc\u05d9\u05e7\u05d9\u05dd \u05e0\u05e8\u05d5\u05ea "
                "\u05dc\u05e4\u05e0\u05d9 \u05db\u05e0\u05d9\u05e1\u05ea \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1 "
                "\u05e9\u05dc \u05e9\u05de\u05d9\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4.",
                "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d0\u05d9\u05df \u05d4\u05d3\u05dc\u05e7\u05ea "
                "\u05e0\u05e8\u05d5\u05ea \u05e0\u05d5\u05e1\u05e4\u05ea \u2014 \u05db\u05d1\u05e8 \u05d1\u05e9\u05de\u05d9\u05e0\u05d9 "
                "\u05e2\u05e6\u05e8\u05ea.",
            ),
        ),
    ],
    "mitzvot": [
        S(
            "st-mitzvah-joy",
            "\u05e9\u05de\u05d7\u05ea \u05d1\u05ea\u05d5\u05e8\u05d4",
            I(
                "st-joy",
                "\u05e9\u05d9\u05de\u05d7 \u05d1\u05ea\u05d5\u05e8\u05d4",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05e9\u05de\u05d7 \u05d1\u05e1\u05d9\u05d5\u05dd "
                "\u05d4\u05ea\u05d5\u05e8\u05d4 \u05d1\u05e9\u05d9\u05e8\u05d4, \u05e8\u05e7\u05d3 \u05d5\u05e8\u05d9\u05e0\u05d5\u05d4.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5.",
            ),
            I(
                "st-hakafot-mitzvah",
                "\u05d4\u05e7\u05e4\u05d5\u05ea",
                "\u05de\u05e7\u05d9\u05e4\u05d9\u05dd \u05e2\u05dd \u05e1\u05e4\u05e8\u05d9 \u05ea\u05d5\u05e8\u05d4 "
                "\u05d1\u05d4\u05e7\u05e4\u05d5\u05ea \u2014 \u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2 "
                "\u05d4\u05e7\u05d4\u05d9\u05dc\u05d4.",
            ),
        ),
        S(
            "st-mitzvah-reading",
            "\u05e7\u05e8\u05d9\u05d0\u05ea \u05d4\u05ea\u05d5\u05e8\u05d4",
            I(
                "st-vzot",
                "\u05d5\u05d6\u05d0\u05ea \u05d4\u05d1\u05e8\u05db\u05d4",
                "\u05e7\u05d5\u05e8\u05d0\u05d9\u05dd \u05d0\u05ea \u05e1\u05d9\u05d5\u05dd \u05e1\u05e4\u05e8 "
                "\u05d3\u05d1\u05e8\u05d9\u05dd \u05d5\u05d0\u05ea \u05e4\u05ea\u05d9\u05d7\u05ea "
                "\u05d1\u05e8\u05d0\u05e9\u05d9\u05ea \u05d1\u05e2\u05dc\u05d9 \u05d4\u05ea\u05d5\u05e8\u05d4.",
            ),
            I(
                "st-bereshit",
                "\u05d1\u05e8\u05d0\u05e9\u05d9\u05ea",
                "\u05de\u05ea\u05d7\u05dc\u05d9\u05dd \u05de\u05d9\u05d3 \u05dc\u05e7\u05e8\u05d5\u05d0 "
                "\u05d1\u05e8\u05d0\u05e9\u05d9\u05ea \u2014 \u05dc\u05e1\u05d2\u05e8 \u05e9\u05d4\u05dc\u05d9\u05de\u05d5\u05d3 "
                "\u05d1\u05ea\u05d5\u05e8\u05d4 \u05d0\u05d9\u05df \u05e4\u05d5\u05e1\u05e7.",
            ),
        ),
        S(
            "st-mitzvah-aliyah",
            "\u05e2\u05dc\u05d9\u05d5\u05ea",
            I(
                "st-chatan",
                "\u05d7\u05ea\u05df \u05ea\u05d5\u05e8\u05d4 \u05d5\u05d7\u05ea\u05df \u05d1\u05e8\u05d0\u05e9\u05d9\u05ea",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5 \u05dc\u05db\u05d1\u05d5\u05d3 \u05d0\u05ea "
                "\u05d4\u05e2\u05d5\u05dc\u05d9\u05dd \u05d1\u05e2\u05dc\u05d9\u05d5\u05ea \u05de\u05d9\u05d5\u05d7\u05d3\u05d5\u05ea "
                "\u2014 \u05d7\u05ea\u05df \u05ea\u05d5\u05e8\u05d4 \u05d5\u05d7\u05ea\u05df \u05d1\u05e8\u05d0\u05e9\u05d9\u05ea.",
                "\u05de\u05e0\u05d4\u05d2 \u05e0\u05e4\u05d5\u05e5.",
            ),
        ),
    ],
    "prayers": [
        S(
            "st-prayers",
            "\u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05d5\u05e9\u05d9\u05e8\u05d9\u05dd",
            I(
                "st-atzeret",
                "\u05ea\u05e4\u05d9\u05dc\u05ea \u05e2\u05e6\u05e8\u05ea",
                "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u2014 \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea "
                "\u05e9\u05de\u05d9\u05e0\u05d9 \u05e2\u05e6\u05e8\u05ea \u05e2\u05dd \u05d4\u05e7\u05e4\u05d5\u05ea "
                "\u05d5\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4.",
            ),
        ),
    ],
    "practicalTips": [
        T(
            "st-tip-early",
            "\u05d4\u05d2\u05e2 \u05de\u05d5\u05e7\u05d3\u05dd",
            "\u05d4\u05e7\u05e4\u05d5\u05ea \u05d5\u05e9\u05de\u05d7\u05d4 \u05de\u05de\u05e9\u05d9\u05db\u05d5\u05ea "
            "\u05e9\u05e2\u05d5\u05ea \u2014 \u05d4\u05d2\u05e2\u05d4 \u05de\u05d5\u05e7\u05d3\u05de\u05ea "
            "\u05de\u05d5\u05de\u05dc\u05e6\u05ea.",
        ),
        T(
            "st-tip-safety",
            "\u05d1\u05d8\u05d9\u05d7\u05d5\u05ea \u05d1\u05d4\u05e7\u05e4\u05d5\u05ea",
            "\u05e9\u05de\u05e8\u05d5 \u05e2\u05dc \u05e1\u05e4\u05e8\u05d9 \u05ea\u05d5\u05e8\u05d4 "
            "\u05d5\u05e2\u05dc \u05e8\u05d2\u05e9 \u05d9\u05dc\u05d3\u05d9\u05dd "
            "\u05d1\u05de\u05e7\u05d5\u05dd \u05e6\u05e4\u05d5\u05e3.",
        ),
        T(
            "st-tip-diaspora",
            "\u05d9\u05d5\u05dd \u05e9\u05e0\u05d9 \u05d1\u05d7\u05d5\u05f3\u05dc",
            "\u05d1\u05d7\u05d5\u05f3\u05dc \u2014 \u05d4\u05e7\u05e4\u05d5\u05ea \u05d1\u05dc\u05d9\u05dc "
            "\u05d5\u05d1\u05d9\u05d5\u05dd; \u05ea\u05db\u05e0\u05df \u05dc\u05e9\u05e0\u05d9 "
            "\u05d4\u05e7\u05e4\u05d5\u05ea \u05d5\u05e9\u05e0\u05d9 \u05d9\u05de\u05d9 \u05e9\u05de\u05d7\u05d4.",
        ),
    ],
    "commonQuestions": [
        Q(
            "st-faq-difference",
            "\u05de\u05d4 \u05d4\u05d4\u05d1\u05d3\u05dc \u05d1\u05d9\u05df \u05e9\u05de\u05d9\u05e0\u05d9 "
            "\u05e2\u05e6\u05e8\u05ea \u05dc\u05e9\u05de\u05d7\u05ea \u05ea\u05d5\u05e8\u05d4?",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d4\u05dd \u05d9\u05d5\u05dd \u05d0\u05d7\u05d3. "
            '\u05d1\u05d7\u05d5\u05f3\u05dc \u05d4\u05dd \u05e9\u05e0\u05d9 \u05d9\u05de\u05d9\u05dd '
            "\u05e0\u05e4\u05e8\u05d3\u05d9\u05dd \u05e2\u05dd \u05de\u05e9\u05de\u05e2\u05d5\u05d9\u05d5\u05ea "
            "\u05e9\u05d5\u05e0\u05d5\u05ea.",
        ),
        Q(
            "st-faq-work",
            "\u05d4\u05d0\u05dd \u05de\u05d5\u05ea\u05e8 \u05dc\u05e2\u05d1\u05d5\u05d3?",
            "\u05d1\u05d0\u05e8\u05e5 \u05d9\u05e9\u05e8\u05d0\u05dc \u05d0\u05d7\u05e8 \u05e9\u05de\u05d9\u05e0\u05d9 "
            "\u05e2\u05e6\u05e8\u05ea \u05d4\u05d7\u05d2 \u05e0\u05d2\u05de\u05e8. "
            '\u05d1\u05d7\u05d5\u05f3\u05dc \u05d9\u05d5\u05dd \u05ea\u05e9\u05d9\u05e2\u05d9 '
            "\u05dc\u05e1\u05d5\u05db\u05d5\u05ea \u05d4\u05d5\u05d0 \u05d9\u05d5\u05dd \u05d8\u05d5\u05d1.",
        ),
    ],
    "commonMistakes": [
        T(
            "st-mistake-rush",
            "\u05d3\u05d7\u05d9\u05e4\u05d5\u05ea \u05d1\u05e7\u05e8\u05d9\u05d0\u05d4",
            "\u05d0\u05dc \u05ea\u05d7\u05d9\u05e4\u05d5 \u05d0\u05ea \u05e7\u05e8\u05d9\u05d0\u05ea "
            "\u05d4\u05ea\u05d5\u05e8\u05d4 \u2014 \u05db\u05d1\u05d5\u05d3 \u05dc\u05e9\u05de\u05d5\u05e2 "
            "\u05db\u05dc \u05de\u05d9\u05dc\u05d4.",
        ),
        T(
            "st-mistake-disrespect",
            "\u05d0\u05d1\u05d9\u05d3 \u05dc\u05e1\u05e4\u05e8\u05d9 \u05ea\u05d5\u05e8\u05d4",
            "\u05e9\u05de\u05e8\u05d5 \u05db\u05d1\u05d5\u05d3 \u05dc\u05e1\u05e4\u05e8\u05d9 "
            "\u05d4\u05ea\u05d5\u05e8\u05d4 \u05d1\u05d4\u05e7\u05e4\u05d5\u05ea \u05d5\u05d1\u05e8\u05e7\u05d3.",
        ),
    ],
    "checklist": [
        C("st-cl-synagogue", "\u05d6\u05de\u05e0\u05d9 \u05ea\u05e4\u05d9\u05dc\u05d5\u05ea \u05d5\u05d4\u05e7\u05e4\u05d5\u05ea"),
        C("st-cl-machzor", "\u05de\u05d7\u05d6\u05d5\u05e8"),
        C("st-cl-meals", "\u05e1\u05e2\u05d5\u05d3\u05d5\u05ea \u05dc\u05d9\u05d5\u05dd \u05d4\u05d7\u05d2"),
        C("st-cl-flags", "\u05d3\u05d2\u05dc\u05d9\u05dd \u05dc\u05d9\u05dc\u05d3\u05d9\u05dd (\u05dc\u05e4\u05d9 \u05de\u05e0\u05d4\u05d2)"),
        C("st-cl-candles", "\u05e0\u05e8\u05d5\u05ea (\u05d1\u05d7\u05d5\u05f3\u05dc)"),
        C("st-cl-joy", "\u05d4\u05db\u05e0\u05d4 \u05dc\u05e9\u05de\u05d7\u05d4 \u05d1\u05db\u05d1\u05d5\u05d3"),
    ],
    "sources": [
        SRC("תנ\"ך", '\u05d3\u05d1\u05e8\u05d9\u05dd \u05dc"\u05d2; \u05d1\u05e8\u05d0\u05e9\u05d9\u05ea \u05d0'),
        SRC("משנה", '\u05de\u05e1\u05db\u05ea \u05e1\u05d5\u05db\u05d4 \u05d3\u05e3 \u05e0"\u05d4'),
        SRC("תלמוד בבלי", '\u05de\u05e1\u05db\u05ea \u05e1\u05d5\u05db\u05d4 \u05d3\u05e3 \u05dc"\u05d6'),
        SRC("רמב\"ם", '\u05d4\u05dc\u05db\u05d5\u05ea \u05ea\u05e4\u05d9\u05dc\u05ea \u05e0\u05d5\u05e8\u05d0 \u05e4"\u05d6', "\u05de\u05d9\u05de\u05d5\u05df \u05d4\u05e6\u05d3\u05d9\u05e7"),
        SRC("שולחן ערוך", '\u05d0\u05d5\u05e8\u05d7 \u05d7\u05d9\u05d9\u05dd \u05ea\u05e8\u05e2"\u05d0', "\u05e8\u05d1\u05d9 \u05d9\u05d5\u05e1\u05e3 \u05e7\u05d0\u05e8\u05d5"),
    ],
}


def emit_index() -> str:
    return """import type { HolidayGuide } from '@/types/holidayGuide';
import { ROSH_HASHANAH_GUIDE } from './roshHashanah';
import { YOM_KIPPUR_GUIDE } from './yomKippur';
import { SUKKOT_GUIDE } from './sukkot';
import { SHEMINI_ATZERET_GUIDE, SIMCHAT_TORAH_GUIDE } from './sheminiAtzeret';

export const HOLIDAY_GUIDE_LIBRARY: HolidayGuide[] = [
  ROSH_HASHANAH_GUIDE,
  YOM_KIPPUR_GUIDE,
  SUKKOT_GUIDE,
  SHEMINI_ATZERET_GUIDE,
  SIMCHAT_TORAH_GUIDE,
];
"""


OUTPUTS = [
    ("roshHashanah.ts", "ROSH_HASHANAH_GUIDE", ROSH_HASHANAH),
    ("yomKippur.ts", "YOM_KIPPUR_GUIDE", YOM_KIPPUR),
    ("sukkot.ts", "SUKKOT_GUIDE", SUKKOT),
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[tuple[str, int]] = []

    for filename, export_name, guide in OUTPUTS:
        path = OUT_DIR / filename
        content = emit_guide(export_name, guide)
        path.write_text(content, encoding="utf-8")
        written.append((str(path), path.stat().st_size))

    shemini_path = OUT_DIR / "sheminiAtzeret.ts"
    shemini_content = (
        emit_guide("SHEMINI_ATZERET_GUIDE", SHEMINI_ATZERET)
        + emit_guide("SIMCHAT_TORAH_GUIDE", SIMCHAT_TORAH).replace(IMPORT_LINE + "\n\n", "", 1)
    )
    shemini_path.write_text(shemini_content, encoding="utf-8")
    written.append((str(shemini_path), shemini_path.stat().st_size))

    index_path = OUT_DIR / "index.ts"
    index_path.write_text(emit_index(), encoding="utf-8")
    written.append((str(index_path), index_path.stat().st_size))

    print("Generated holiday guide files:")
    for path, size in written:
        print(f"  {path}: {size} bytes")


if __name__ == "__main__":
    main()
