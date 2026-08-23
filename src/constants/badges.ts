import type { BadgeDefinition } from '@/types/gamification';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_mitzvah',
    titleHebrew: 'צעד ראשון',
    descriptionHebrew: 'השלמת מצווה ראשונה',
    icon: '✓',
    conditionType: 'MITZVAH_COUNT',
    conditionValue: 1,
  },
  {
    id: 'streak_7',
    titleHebrew: 'שבוע ברצף',
    descriptionHebrew: '7 ימים ברצף',
    icon: '🔥',
    conditionType: 'STREAK',
    conditionValue: 7,
  },
  {
    id: 'streak_14',
    titleHebrew: 'שבועיים ברצף',
    descriptionHebrew: '14 ימים ברצף',
    icon: '🔥',
    conditionType: 'STREAK',
    conditionValue: 14,
  },
  {
    id: 'quiz_5',
    titleHebrew: 'מתחילים בחידון',
    descriptionHebrew: '5 תשובות נכונות בחידון',
    icon: '🧠',
    conditionType: 'QUIZ_CORRECT',
    conditionValue: 5,
  },
  {
    id: 'quiz_10',
    titleHebrew: 'אמן החידון',
    descriptionHebrew: '10 תשובות נכונות בחידון',
    icon: '🧠',
    conditionType: 'QUIZ_CORRECT',
    conditionValue: 10,
  },
  {
    id: 'xp_100',
    titleHebrew: 'מתחילים',
    descriptionHebrew: '100 נקודות XP',
    icon: '⭐',
    conditionType: 'XP',
    conditionValue: 100,
  },
  {
    id: 'xp_500',
    titleHebrew: 'מתקדמים',
    descriptionHebrew: '500 נקודות XP',
    icon: '⭐',
    conditionType: 'XP',
    conditionValue: 500,
  },
  {
    id: 'xp_1000',
    titleHebrew: 'מאסטר',
    descriptionHebrew: '1000 נקודות XP',
    icon: '⭐',
    conditionType: 'XP',
    conditionValue: 1000,
  },
];

export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((badge) => badge.id === badgeId);
}
