import { QUIZ_QUESTION_BANK } from '@/content/quiz';
import type { QuizCategory, QuizDifficulty } from '@/types/quiz';

export { opts } from '@/content/quiz/helpers';

export const QUIZ_QUESTIONS = QUIZ_QUESTION_BANK.filter(
  (question) => question.enabled !== false,
);

export const QUIZ_CATEGORY_LABELS: Record<QuizCategory, string> = {
  TORAH: 'תורה',
  TANAKH: 'תנ"ך',
  MITZVOT: 'מצוות',
  SHABBAT: 'שבת',
  HOLIDAYS: 'חגים',
  TEFILLAH: 'תפילה',
  JEWISH_HISTORY: 'היסטוריה יהודית',
  HEBREW_TERMINOLOGY: 'עברית ומונחים',
  JEWISH_THOUGHT: 'מחשבת ישראל',
  PARASHA: 'פרשה',
  PRAYER: 'תפילה',
  HEBREW_CALENDAR: 'לוח עברי',
  JEWISH_KNOWLEDGE: 'ידע כללי',
};

export const QUIZ_DIFFICULTY_LABELS: Record<QuizDifficulty, string> = {
  EASY: 'קל',
  MEDIUM: 'בינוני',
  HARD: 'קשה',
  VERY_HARD: 'מאתגר במיוחד',
};

export const QUIZ_SESSION_SIZE = 10;

export const QUIZ_SLOT_DIFFICULTIES = [
  'EASY',
  'EASY',
  'EASY',
  'MEDIUM',
  'MEDIUM',
  'MEDIUM',
  'HARD',
  'HARD',
  'HARD',
  'VERY_HARD',
] as const;
