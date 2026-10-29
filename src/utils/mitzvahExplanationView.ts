import type { MitzvahFastContext } from '@/services/mitzvahFastContext';
import type { Mitzvah, UserMitzvahPreference } from '@/types/mitzvah';
import type { PrayerNusach } from '@/types/prayer';
import { formatReminderTimeForDisplay } from '@/utils/reminderTimezone';
import {
  getMitzvahCategoryLabel,
  getMitzvahContentText,
  getMitzvahExplanation,
  getMitzvahIcon,
} from '@/utils/mitzvah';

const PENDING_PRAYER_MESSAGE =
  'סדר התפילה המלא יהיה זמין לאחר הוספת תוכן מאומת.';
const RITUAL_GUIDE_LABEL = 'פתח סדר הנחת תפילין וברכות';
const FAST_GUIDE_LABEL = 'מידע על הצום';
const DEFAULT_REMINDER_TIME = '07:30';

export type ExplanationNavigation =
  | {
      kind: 'ritual';
      ritualGuideId: string;
      nusach: PrayerNusach;
    }
  | {
      kind: 'prayer';
      prayerId: string;
      nusach: PrayerNusach;
    }
  | {
      kind: 'holiday';
      holidayKey: string;
    };

export interface ExplanationActionItem {
  label: string;
  subtitle?: string;
  accessibilityLabel: string;
  navigation: ExplanationNavigation;
}

export interface MitzvahExplanationStatus {
  text: string;
  active: boolean;
}

export interface MitzvahExplanationView {
  icon: string;
  title: string;
  description: string;
  category: Mitzvah['category'];
  categoryLabel: string;
  xpReward: number;
  timing: string[];
  status: MitzvahExplanationStatus | null;
  essence: string;
  paragraphs: string[];
  primaryAction: ExplanationActionItem | null;
  secondaryAction: ExplanationActionItem | null;
  pendingMessage: string | null;
  reminderEnabled: boolean;
  trackingEnabled: boolean;
  reminderTimeLabel: string | null;
  reminderPickerValue: string;
  preferenceReady: boolean;
}

export interface BuildMitzvahExplanationInput {
  mitzvah: Mitzvah;
  preference?: UserMitzvahPreference;
  fastContext: MitzvahFastContext | null;
  activeToday: boolean;
  hebrewDateLabel?: string | null;
  ritual: {
    canOpen: boolean;
    guideId: string | null;
    nusach: PrayerNusach;
  };
  prayer: {
    canOpen: boolean;
    prayerId: string | null;
    nusach: PrayerNusach;
    isPartial: boolean;
    isPending: boolean;
  };
  holiday: {
    key: string;
    titleHebrew: string;
  } | null;
}

export function splitMitzvahParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function holidayAction(
  mitzvah: Mitzvah,
  fastContext: MitzvahFastContext | null,
  holiday: BuildMitzvahExplanationInput['holiday'],
): ExplanationActionItem | null {
  if (!holiday) {
    return null;
  }

  const fastWithSchedule = mitzvah.category === 'fast' && fastContext != null;
  const label = fastWithSchedule
    ? FAST_GUIDE_LABEL
    : `למידע המלא על ${holiday.titleHebrew}`;
  const subtitle = fastWithSchedule
    ? undefined
    : mitzvah.category === 'fast'
      ? `קשור למדריך ${holiday.titleHebrew}`
      : `חלק ממערכת מצוות ${holiday.titleHebrew}`;

  return {
    label,
    subtitle,
    accessibilityLabel: label,
    navigation: { kind: 'holiday', holidayKey: holiday.key },
  };
}

function buildActions(input: BuildMitzvahExplanationInput): ExplanationActionItem[] {
  const actions: ExplanationActionItem[] = [];
  const { ritual, prayer, holiday, mitzvah, fastContext } = input;

  if (ritual.canOpen && ritual.guideId) {
    actions.push({
      label: RITUAL_GUIDE_LABEL,
      accessibilityLabel: RITUAL_GUIDE_LABEL,
      navigation: {
        kind: 'ritual',
        ritualGuideId: ritual.guideId,
        nusach: ritual.nusach,
      },
    });
  }

  if (prayer.canOpen && prayer.prayerId) {
    const label = prayer.isPartial
      ? 'פתח את סדר התפילה'
      : 'פתח את סדר התפילה המלא';
    actions.push({
      label,
      subtitle: prayer.isPartial ? 'תוכן חלקי' : undefined,
      accessibilityLabel: label,
      navigation: {
        kind: 'prayer',
        prayerId: prayer.prayerId,
        nusach: prayer.nusach,
      },
    });
  }

  const holidayItem = holidayAction(mitzvah, fastContext, holiday);
  if (holidayItem) {
    actions.push(holidayItem);
  }

  return actions;
}

function buildTiming(
  mitzvah: Mitzvah,
  preference: UserMitzvahPreference | undefined,
  fastContext: MitzvahFastContext | null,
): string[] {
  if (fastContext) {
    const lines = [
      fastContext.isActive ? 'הצום הפעיל' : 'הצום הקרוב',
    ];
    if (fastContext.titleHebrew.trim() !== mitzvah.title.trim()) {
      lines.push(fastContext.titleHebrew);
    }
    if (fastContext.beginTime) {
      lines.push(`תחילת הצום: ${fastContext.beginTime}`);
    }
    if (fastContext.endTime) {
      lines.push(`סיום הצום: ${fastContext.endTime}`);
    }
    return lines;
  }

  if (preference?.reminderEnabled && preference.reminderTime) {
    return [`תזכורת: ${formatReminderTimeForDisplay(preference.reminderTime)}`];
  }

  return [];
}

export function buildMitzvahExplanationView(
  input: BuildMitzvahExplanationInput,
): MitzvahExplanationView {
  const { mitzvah, preference, fastContext } = input;
  const essence = getMitzvahExplanation(mitzvah).trim();
  const fullContent = getMitzvahContentText(mitzvah).trim();
  const paragraphs =
    fullContent.length > 0 && fullContent !== essence
      ? splitMitzvahParagraphs(fullContent)
      : [];
  const actions = buildActions(input);
  const hebrewDate = input.hebrewDateLabel?.trim();
  const reminderTimeLabel =
    preference?.reminderEnabled && preference.reminderTime
      ? formatReminderTimeForDisplay(preference.reminderTime)
      : null;

  return {
    icon: getMitzvahIcon(mitzvah.id, mitzvah.category),
    title: mitzvah.title,
    description: mitzvah.description,
    category: mitzvah.category,
    categoryLabel: getMitzvahCategoryLabel(mitzvah.category),
    xpReward: mitzvah.xpReward,
    timing: buildTiming(mitzvah, preference, fastContext),
    status:
      mitzvah.category !== 'daily' && hebrewDate
        ? {
            active: input.activeToday,
            text: input.activeToday
              ? `פעיל היום · ${hebrewDate}`
              : `לא פעיל היום · ${hebrewDate}`,
          }
        : null,
    essence,
    paragraphs,
    primaryAction: actions[0] ?? null,
    secondaryAction: actions[1] ?? null,
    pendingMessage:
      input.prayer.isPending && !input.prayer.canOpen
        ? PENDING_PRAYER_MESSAGE
        : null,
    reminderEnabled: preference?.reminderEnabled ?? false,
    trackingEnabled: preference?.enabled ?? false,
    reminderTimeLabel,
    reminderPickerValue:
      preference?.reminderTime ?? mitzvah.defaultTime ?? DEFAULT_REMINDER_TIME,
    preferenceReady: preference != null,
  };
}
