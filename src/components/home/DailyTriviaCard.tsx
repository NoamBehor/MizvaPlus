import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import {
  QUIZ_DIFFICULTY_LABELS,
  QUIZ_SESSION_SIZE,
} from '@/constants/quizQuestions';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import { navigateToTrivia } from '@/navigation/navigationRef';
import {
  getDailyQuizSession,
  getSessionQuestion,
} from '@/services/quiz';
import { useGamificationStore } from '@/store/gamificationStore';
import { useHolidayContextStore } from '@/store/holidayContextStore';
import { getActivityDateKey } from '@/utils/timezone';

interface DailyTriviaCardProps {
  userId: string;
}

export function DailyTriviaCard({ userId }: DailyTriviaCardProps) {
  const dateKey = getActivityDateKey();
  useGamificationStore((state) => state.quizAttempts);
  const preferredCategories = useHolidayContextStore(
    (state) => state.context.triviaCategories,
  );
  const quizOptions =
    preferredCategories.length > 0
      ? { preferredCategories }
      : undefined;

  const session = getDailyQuizSession(userId, dateKey, quizOptions);
  const currentQuestion = getSessionQuestion(userId, dateKey, quizOptions);

  const progressLabel = session.isComplete
    ? `${QUIZ_SESSION_SIZE} מתוך ${QUIZ_SESSION_SIZE}`
    : `${Math.min(session.answeredCount + 1, QUIZ_SESSION_SIZE)} מתוך ${QUIZ_SESSION_SIZE}`;

  const progressValue = session.isComplete
    ? 100
    : Math.round((session.answeredCount / QUIZ_SESSION_SIZE) * 100);

  const difficultyLabel = currentQuestion
    ? QUIZ_DIFFICULTY_LABELS[currentQuestion.difficulty]
    : null;

  return (
    <Card className="mb-4" elevated>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 items-start">
          <Text style={typography.subtitle}>
            {session.isComplete ? 'החידון הושלם' : 'החידון היומי'}
          </Text>
          <Text
            style={[typography.bodySmall, { marginTop: 4, color: colors.muted }]}
            accessibilityLabel={`התקדמות בחידון: ${progressLabel}`}
          >
            {progressLabel}
          </Text>
          {difficultyLabel && !session.isComplete ? (
            <Text
              style={[typography.caption, { marginTop: 2, color: colors.muted }]}
            >
              רמת קושי: {difficultyLabel}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={navigateToTrivia}
          accessibilityRole="button"
          accessibilityLabel={
            session.isComplete ? 'צפייה בתוצאות' : 'להמשיך את החידון'
          }
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: colors.primary, minHeight: 44 }}
        >
          <Text style={[typography.bodySmall, { color: colors.white }]}>
            {session.isComplete ? 'תוצאות' : 'לשחק'}
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ProgressBar percentage={progressValue} showPercentageLabel={false} />
      </View>

      {!session.isComplete ? (
        <Pressable
          onPress={navigateToTrivia}
          accessibilityRole="button"
          accessibilityLabel="להמשיך את החידון"
          style={{
            marginTop: spacing.md,
            alignSelf: 'flex-end',
            minHeight: 44,
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              typography.bodySmall,
              { color: colors.accent, fontWeight: '600' },
            ]}
          >
            להמשיך את החידון ←
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
