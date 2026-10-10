import { QUIZ_QUESTIONS } from '@/constants/quizQuestions';
import { evaluateBadges } from '@/services/gamification';
import { awardXp } from '@/services/xp';
import { useGamificationStore } from '@/store/gamificationStore';
import type {
  DailyQuizAttempt,
  QuizQuestion,
  QuizQuestionPublic,
  QuizSubmitResult,
} from '@/types/quiz';
import { getActivityDateKey } from '@/utils/timezone';
import { generateUuidV4 } from '@/utils/uuid';

function dateKeyToIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number);
  const daysSinceEpoch = Math.floor(
    Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24),
  );
  return daysSinceEpoch % QUIZ_QUESTIONS.length;
}

export function getDailyQuizQuestion(dateKey: string): QuizQuestion {
  const index = dateKeyToIndex(dateKey);
  return QUIZ_QUESTIONS[index];
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

export function getTodayAttempt(
  userId: string,
  dateKey: string = getActivityDateKey(),
): DailyQuizAttempt | null {
  const { quizAttempts } = useGamificationStore.getState();
  return (
    quizAttempts.find(
      (attempt) => attempt.userId === userId && attempt.dateKey === dateKey,
    ) ?? null
  );
}

export function isQuizCompletedToday(
  userId: string,
  dateKey: string = getActivityDateKey(),
): boolean {
  return getTodayAttempt(userId, dateKey) !== null;
}

function validateAnswer(
  question: QuizQuestion,
  selectedOptionId: string,
): boolean {
  return question.correctOptionId === selectedOptionId;
}

/**
 * Submit a daily quiz answer. Idempotent — returns existing attempt if already completed today.
 * XP is awarded exactly once per correct answer per date.
 */
export async function submitDailyQuizAnswer(
  userId: string,
  selectedOptionId: string,
  dateKey: string = getActivityDateKey(),
): Promise<QuizSubmitResult> {
  const existingAttempt = getTodayAttempt(userId, dateKey);
  const question = getDailyQuizQuestion(dateKey);

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
      const updatedAttempts = quizAttempts.map((a) =>
        a.id === attempt.id ? updatedAttempt : a,
      );
      useGamificationStore.setState({ quizAttempts: updatedAttempts });
      await useGamificationStore.getState().persistQuizAttempts(userId);
    } catch (error) {
      console.error('Failed to award quiz XP:', error);
      const { quizAttempts } = useGamificationStore.getState();
      const filtered = quizAttempts.filter((a) => a.id !== attempt.id);
      useGamificationStore.setState({ quizAttempts: filtered });
      await useGamificationStore.getState().persistQuizAttempts(userId);
      throw new Error('הענקת נקודות XP נכשלה');
    }
  }

  const newlyUnlocked = await evaluateBadges(userId);
  useGamificationStore.getState().queueBadgeNotifications(newlyUnlocked);

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
  const userAttempts = quizAttempts.filter((a) => a.userId === userId);
  return {
    quizCount: userAttempts.length,
    correctQuizCount: userAttempts.filter((a) => a.isCorrect).length,
  };
}

export function getOptionText(
  question: QuizQuestion,
  optionId: string,
): string {
  return question.options.find((o) => o.id === optionId)?.textHebrew ?? '—';
}
