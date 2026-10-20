import type { ContentReviewMetadata, ContentSource } from '@/types/content';

export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';

export type QuizCategory =
  | 'TORAH'
  | 'TANAKH'
  | 'MITZVOT'
  | 'SHABBAT'
  | 'HOLIDAYS'
  | 'TEFILLAH'
  | 'JEWISH_HISTORY'
  | 'HEBREW_TERMINOLOGY'
  | 'JEWISH_THOUGHT'
  | 'PARASHA'
  /** @deprecated Use TEFILLAH */
  | 'PRAYER'
  /** @deprecated Use HEBREW_TERMINOLOGY */
  | 'HEBREW_CALENDAR'
  /** @deprecated Use JEWISH_THOUGHT */
  | 'JEWISH_KNOWLEDGE';

export interface QuizOption {
  id: string;
  textHebrew: string;
}

export interface QuizQuestion extends ContentReviewMetadata {
  id: string;
  questionHebrew: string;
  options: QuizOption[];
  correctOptionId: string;
  difficulty: QuizDifficulty;
  category: QuizCategory;
  explanationHebrew?: string;
  source?: ContentSource;
  tags?: string[];
  enabled?: boolean;
  xpReward: number;
}

/** Question shape safe for UI — correct answer is not exposed. */
export interface QuizQuestionPublic {
  id: string;
  questionHebrew: string;
  options: QuizOption[];
  difficulty: QuizDifficulty;
  category: QuizCategory;
  xpReward: number;
}

export interface DailyQuizAttempt {
  id: string;
  userId: string;
  questionId: string;
  dateKey: string;
  selectedOptionId: string;
  isCorrect: boolean;
  xpAwarded: number;
  completedAt: string;
}

export interface QuizSubmitResult {
  attempt: DailyQuizAttempt;
  isCorrect: boolean;
  xpAwarded: number;
  explanationHebrew?: string;
  correctOptionId: string;
  alreadyCompleted: boolean;
}

export interface DailyQuizSession {
  dateKey: string;
  questionIds: string[];
  answeredCount: number;
  currentIndex: number;
  isComplete: boolean;
  correctCount: number;
}
