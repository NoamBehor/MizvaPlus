import {
  QUIZ_QUESTIONS,
  QUIZ_SESSION_SIZE,
  QUIZ_SLOT_DIFFICULTIES,
} from '@/constants/quizQuestions';
import { evaluateBadges } from '@/services/gamification';
import { awardXp } from '@/services/xp';
import { useGamificationStore } from '@/store/gamificationStore';
import type {
  DailyQuizAttempt,
  DailyQuizSession,
  QuizCategory,
  QuizDifficulty,
  QuizQuestion,
  QuizQuestionPublic,
  QuizSubmitResult,
} from '@/types/quiz';
import { getActivityDateKey } from '@/utils/timezone';
import { generateUuidV4 } from '@/utils/uuid';

export interface DailyQuizSelectionOptions {
  preferredCategories?: string[];
}

const CATEGORY_ALIASES: Record<string, QuizCategory[]> = {
  PRAYER: ['TEFILLAH', 'PRAYER'],
  TEFILLAH: ['TEFILLAH', 'PRAYER'],
  HEBREW_CALENDAR: ['HEBREW_TERMINOLOGY', 'HEBREW_CALENDAR'],
  HEBREW_TERMINOLOGY: ['HEBREW_TERMINOLOGY', 'HEBREW_CALENDAR'],
  JEWISH_KNOWLEDGE: ['JEWISH_THOUGHT', 'JEWISH_KNOWLEDGE'],
  JEWISH_THOUGHT: ['JEWISH_THOUGHT', 'JEWISH_KNOWLEDGE'],
};

const RECENT_QUESTION_WINDOW_DAYS = 14;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function dateKeyToIndex(dateKey: string, poolSize: number): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const daysSinceEpoch = Math.floor(
    Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24),
  );
  return daysSinceEpoch % poolSize;
}

function expandPreferredCategories(categories: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const category of categories) {
    const aliases = CATEGORY_ALIASES[category] ?? [category as QuizCategory];
    for (const alias of aliases) {
      expanded.add(alias);
    }
  }
  return expanded;
}

function getRecentQuestionIds(userId: string, dateKey: string): Set<string> {
  const recentIds = new Set<string>();
  const { quizAttempts } = useGamificationStore.getState();
  const userAttempts = quizAttempts.filter(
    (attempt) => attempt.userId === userId,
  );

  for (let offset = 1; offset <= RECENT_QUESTION_WINDOW_DAYS; offset += 1) {
    const priorDateKey = shiftDateKeyByDays(dateKey, -offset);
    for (const attempt of userAttempts) {
      if (attempt.dateKey === priorDateKey) {
        recentIds.add(attempt.questionId);
      }
    }
  }

  return recentIds;
}

function shiftDateKeyByDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function selectQuestionPool(
  options?: DailyQuizSelectionOptions,
): QuizQuestion[] {
  const preferred = options?.preferredCategories?.filter(Boolean) ?? [];
  if (preferred.length === 0) {
    return QUIZ_QUESTIONS;
  }

  const expanded = expandPreferredCategories(preferred);
  const matched = QUIZ_QUESTIONS.filter((question) =>
    expanded.has(question.category),
  );

  return matched.length > 0 ? matched : QUIZ_QUESTIONS;
}

function resolveDifficultyPool(
  pool: QuizQuestion[],
  difficulty: QuizDifficulty,
): QuizQuestion[] {
  const exact = pool.filter((question) => question.difficulty === difficulty);
  if (exact.length > 0) {
    return exact;
  }

  if (difficulty === 'VERY_HARD') {
    const hard = pool.filter((question) => question.difficulty === 'HARD');
    if (hard.length > 0) {
      return hard;
    }
  }

  return pool;
}

function selectQuestionForSlot(
  dateKey: string,
  userId: string,
  slotIndex: number,
  difficulty: QuizDifficulty,
  pool: QuizQuestion[],
  usedIds: Set<string>,
  recentIds: Set<string>,
): QuizQuestion {
  const candidates = resolveDifficultyPool(pool, difficulty);
  const seed = hashString(`${dateKey}:${userId}:${slotIndex}:${difficulty}`);
  let index = seed % candidates.length;
  let guard = 0;

  while (guard < candidates.length) {
    const candidate = candidates[index];
    if (!usedIds.has(candidate.id) && !recentIds.has(candidate.id)) {
      usedIds.add(candidate.id);
      return candidate;
    }
    index = (index + 1) % candidates.length;
    guard += 1;
  }

  index = seed % candidates.length;
  guard = 0;
  while (usedIds.has(candidates[index].id) && guard < candidates.length) {
    index = (index + 1) % candidates.length;
    guard += 1;
  }

  usedIds.add(candidates[index].id);
  return candidates[index];
}

export function getDailyQuizQuestionIds(
  userId: string,
  dateKey: string = getActivityDateKey(),
  options?: DailyQuizSelectionOptions,
): string[] {
  const pool = selectQuestionPool(options);
  const usedIds = new Set<string>();
  const recentIds = getRecentQuestionIds(userId, dateKey);
  const questionIds: string[] = [];

  for (let slotIndex = 0; slotIndex < QUIZ_SESSION_SIZE; slotIndex += 1) {
    const difficulty = QUIZ_SLOT_DIFFICULTIES[slotIndex];
    const question = selectQuestionForSlot(
      dateKey,
      userId,
      slotIndex,
      difficulty,
      pool,
      usedIds,
      recentIds,
    );
    questionIds.push(question.id);
  }

  return questionIds;
}

export function getQuestionById(questionId: string): QuizQuestion | null {
  return QUIZ_QUESTIONS.find((question) => question.id === questionId) ?? null;
}

export function getDailyQuizSession(
  userId: string,
  dateKey: string = getActivityDateKey(),
  options?: DailyQuizSelectionOptions,
): DailyQuizSession {
  const questionIds = getDailyQuizQuestionIds(userId, dateKey, options);
  const attempts = getAttemptsForDate(userId, dateKey);
  const answeredCount = attempts.length;
  const correctCount = attempts.filter((attempt) => attempt.isCorrect).length;
  const currentIndex = Math.min(answeredCount, QUIZ_SESSION_SIZE - 1);

  return {
    dateKey,
    questionIds,
    answeredCount,
    currentIndex,
    isComplete: answeredCount >= QUIZ_SESSION_SIZE,
    correctCount,
  };
}

export function getDailyQuizQuestion(
  dateKey: string,
  options?: DailyQuizSelectionOptions,
): QuizQuestion {
  const pool = selectQuestionPool(options);
  const index = dateKeyToIndex(dateKey, pool.length);
  return pool[index];
}

export function getSessionQuestion(
  userId: string,
  dateKey: string = getActivityDateKey(),
  options?: DailyQuizSelectionOptions,
): QuizQuestion | null {
  const session = getDailyQuizSession(userId, dateKey, options);
  if (session.isComplete) {
    const lastQuestionId = session.questionIds[session.questionIds.length - 1];
    return getQuestionById(lastQuestionId);
  }

  const questionId = session.questionIds[session.answeredCount];
  return getQuestionById(questionId);
}

export function toPublicQuestion(question: QuizQuestion): QuizQuestionPublic {
  return {
    id: question.id,
    questionHebrew: question.questionHebrew,
    options: question.options,
    difficulty: question.difficulty,
    category: question.category,
    xpReward: question.xpReward,
  };
}

function getAttemptsForDate(
  userId: string,
  dateKey: string,
): DailyQuizAttempt[] {
  const { quizAttempts } = useGamificationStore.getState();
  return quizAttempts
    .filter(
      (attempt) => attempt.userId === userId && attempt.dateKey === dateKey,
    )
    .sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );
}

export function getTodayAttempt(
  userId: string,
  dateKey: string = getActivityDateKey(),
): DailyQuizAttempt | null {
  const attempts = getAttemptsForDate(userId, dateKey);
  return attempts[0] ?? null;
}

export function getAttemptForQuestion(
  userId: string,
  dateKey: string,
  questionId: string,
): DailyQuizAttempt | null {
  const { quizAttempts } = useGamificationStore.getState();
  return (
    quizAttempts.find(
      (attempt) =>
        attempt.userId === userId &&
        attempt.dateKey === dateKey &&
        attempt.questionId === questionId,
    ) ?? null
  );
}

export function isQuizCompletedToday(
  userId: string,
  dateKey: string = getActivityDateKey(),
): boolean {
  return getDailyQuizSession(userId, dateKey).isComplete;
}

function validateAnswer(
  question: QuizQuestion,
  selectedOptionId: string,
): boolean {
  return question.correctOptionId === selectedOptionId;
}

/**
 * Submit a daily quiz answer for the current session question.
 * XP is awarded exactly once per correct answer per question/date.
 */
export async function submitDailyQuizAnswer(
  userId: string,
  selectedOptionId: string,
  dateKey: string = getActivityDateKey(),
  options?: DailyQuizSelectionOptions,
): Promise<QuizSubmitResult> {
  const session = getDailyQuizSession(userId, dateKey, options);
  const questionId = session.isComplete
    ? session.questionIds[session.questionIds.length - 1]
    : session.questionIds[session.answeredCount];
  const question = getQuestionById(questionId);

  if (!question) {
    throw new Error('שאלת החידון לא נמצאה');
  }

  const existingAttempt = getAttemptForQuestion(userId, dateKey, question.id);

  if (existingAttempt) {
    return {
      attempt: existingAttempt,
      isCorrect: existingAttempt.isCorrect,
      xpAwarded: 0,
      explanationHebrew: question.explanationHebrew,
      correctOptionId: question.correctOptionId,
      alreadyCompleted: true,
    };
  }

  if (session.isComplete) {
    throw new Error('החידון היומי כבר הושלם');
  }

  const isCorrect = validateAnswer(question, selectedOptionId);
  const xpToAward = isCorrect ? question.xpReward : 0;

  const attempt: DailyQuizAttempt = {
    id: generateUuidV4(),
    userId,
    questionId: question.id,
    dateKey,
    selectedOptionId,
    isCorrect,
    xpAwarded: 0,
    completedAt: new Date().toISOString(),
  };

  try {
    await useGamificationStore.getState().addQuizAttempt(attempt);
  } catch (error) {
    console.error('Failed to persist quiz attempt:', error);
    throw new Error('שמירת תשובת החידון נכשלה');
  }

  let actualXpAwarded = 0;

  if (isCorrect && xpToAward > 0) {
    try {
      await awardXp({
        userId,
        amount: xpToAward,
        reason: 'DAILY_QUIZ',
        referenceId: attempt.id,
      });
      actualXpAwarded = xpToAward;

      const updatedAttempt: DailyQuizAttempt = { ...attempt, xpAwarded: xpToAward };
      const { quizAttempts } = useGamificationStore.getState();
      const updatedAttempts = quizAttempts.map((entry) =>
        entry.id === attempt.id ? updatedAttempt : entry,
      );
      useGamificationStore.setState({ quizAttempts: updatedAttempts });
      await useGamificationStore.getState().persistQuizAttempts(userId);
    } catch (error) {
      console.error('Failed to award quiz XP:', error);
      const { quizAttempts } = useGamificationStore.getState();
      const filtered = quizAttempts.filter((entry) => entry.id !== attempt.id);
      useGamificationStore.setState({ quizAttempts: filtered });
      await useGamificationStore.getState().persistQuizAttempts(userId);
      throw new Error('הענקת נקודות XP נכשלה');
    }
  }

  const updatedSession = getDailyQuizSession(userId, dateKey, options);
  if (updatedSession.isComplete) {
    const newlyUnlocked = await evaluateBadges(userId);
    useGamificationStore.getState().queueBadgeNotifications(newlyUnlocked);
  }

  return {
    attempt: { ...attempt, xpAwarded: actualXpAwarded },
    isCorrect,
    xpAwarded: actualXpAwarded,
    explanationHebrew: question.explanationHebrew,
    correctOptionId: question.correctOptionId,
    alreadyCompleted: false,
  };
}

export function getQuizStats(userId: string): {
  quizCount: number;
  correctQuizCount: number;
} {
  const { quizAttempts } = useGamificationStore.getState();
  const userAttempts = quizAttempts.filter((attempt) => attempt.userId === userId);
  return {
    quizCount: userAttempts.length,
    correctQuizCount: userAttempts.filter((attempt) => attempt.isCorrect).length,
  };
}

export function getOptionText(
  question: QuizQuestion,
  optionId: string,
): string {
  return question.options.find((option) => option.id === optionId)?.textHebrew ?? '—';
}
