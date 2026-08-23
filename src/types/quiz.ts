export type QuizDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuizCategory =
  | 'MITZVOT'
  | 'PRAYER'
  | 'SHABBAT'
  | 'HOLIDAYS'
  | 'HEBREW_CALENDAR'
  | 'JEWISH_KNOWLEDGE';

export interface QuizOption {
  id: string;
  textHebrew: string;
}

export interface QuizQuestion {
  id: string;
  questionHebrew: string;
  options: QuizOption[];
  correctOptionId: string;
  difficulty: QuizDifficulty;
  category: QuizCategory;
  explanationHebrew?: string;
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
