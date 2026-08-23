import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import {
  QUIZ_CATEGORY_LABELS,
  QUIZ_DIFFICULTY_LABELS,
} from '@/constants/quizQuestions';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import {
  getDailyQuizQuestion,
  getOptionText,
  getTodayAttempt,
  submitDailyQuizAnswer,
  toPublicQuestion,
} from '@/services/quiz';
import { useGamificationStore } from '@/store/gamificationStore';
import { useUserStore } from '@/store/userStore';
import { getActivityDateKey } from '@/utils/timezone';

export function TriviaScreen() {
  const user = useUserStore((state) => state.user);
  const quizAttempts = useGamificationStore((state) => state.quizAttempts);
  const pendingBadge = useGamificationStore(
    (state) => state.pendingBadgeNotifications[0] ?? null,
  );
  const dismissBadgeNotification = useGamificationStore(
    (state) => state.dismissBadgeNotification,
  );

  const dateKey = getActivityDateKey();
  const question = useMemo(() => getDailyQuizQuestion(dateKey), [dateKey]);
  const publicQuestion = useMemo(() => toPublicQuestion(question), [question]);

  const existingAttempt = useMemo(() => {
    if (!user) return null;
    return getTodayAttempt(user.id, dateKey);
  }, [user, dateKey, quizAttempts]);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    xpAwarded: number;
    explanationHebrew?: string;
    selectedOptionId: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCompleted = existingAttempt !== null || feedback !== null;

  useEffect(() => {
    if (existingAttempt) {
      setSelectedOptionId(existingAttempt.selectedOptionId);
      setFeedback({
        isCorrect: existingAttempt.isCorrect,
        xpAwarded: existingAttempt.xpAwarded,
        explanationHebrew: question.explanationHebrew,
        selectedOptionId: existingAttempt.selectedOptionId,
      });
    }
  }, [existingAttempt, question.explanationHebrew]);

  const handleSelectOption = useCallback(
    (optionId: string) => {
      if (isCompleted || isSubmitting) {
        return;
      }
      setSelectedOptionId(optionId);
    },
    [isCompleted, isSubmitting],
  );

  const handleSubmit = useCallback(async () => {
    if (!user || !selectedOptionId || isCompleted || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitDailyQuizAnswer(
        user.id,
        selectedOptionId,
        dateKey,
      );

      setFeedback({
        isCorrect: result.isCorrect,
        xpAwarded: result.xpAwarded,
        explanationHebrew: result.explanationHebrew,
        selectedOptionId,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'שגיאה בשליחת התשובה',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [user, selectedOptionId, isCompleted, isSubmitting, dateKey]);

  if (!user) {
    return null;
  }

  return (
    <ScreenContainer>
      <View className="mb-6">
        <Text style={typography.hero}>חידון יומי</Text>
        <Text style={[typography.bodySmall, { marginTop: 8 }]}>
          שאלה 1 מתוך 1
        </Text>
      </View>

      {isCompleted ? (
        <Card className="mb-4">
          <Text
            style={[
              typography.subtitle,
              { color: colors.success, textAlign: 'center' },
            ]}
          >
            ✓ החידון היומי הושלם
          </Text>
        </Card>
      ) : null}

      <Card className="mb-4">
        <View className="mb-3 flex-row justify-between">
          <Text style={typography.caption}>
            {QUIZ_DIFFICULTY_LABELS[publicQuestion.difficulty]}
          </Text>
          <Text style={typography.caption}>
            {QUIZ_CATEGORY_LABELS[publicQuestion.category]}
          </Text>
        </View>

        <Text style={[typography.subtitle, { marginBottom: 20 }]}>
          {publicQuestion.questionHebrew}
        </Text>

        <View className="gap-3">
          {publicQuestion.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const borderColor = isSelected ? colors.accent : colors.border;
            const backgroundColor = isSelected
              ? colors.accent + '15'
              : colors.surface;

            return (
              <Pressable
                key={option.id}
                onPress={() => handleSelectOption(option.id)}
                disabled={isCompleted || isSubmitting}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected, disabled: isCompleted }}
                className="flex-row items-center rounded-xl border px-4 py-3"
                style={{
                  borderColor,
                  backgroundColor,
                  opacity: isCompleted && !isSelected ? 0.6 : 1,
                }}
              >
                <View
                  className="ml-3 h-5 w-5 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: isSelected ? colors.accent : colors.muted,
                  }}
                >
                  {isSelected ? (
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  ) : null}
                </View>
                <Text style={[typography.body, { flex: 1 }]}>
                  {option.textHebrew}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {feedback ? (
        <Card className="mb-4">
          <Text style={typography.label}>התשובה שלך:</Text>
          <Text style={[typography.body, { marginTop: 4 }]}>
            {getOptionText(question, feedback.selectedOptionId)}
          </Text>

          <Text
            style={[
              typography.subtitle,
              {
                marginTop: 12,
                color: feedback.isCorrect ? colors.success : colors.error,
              },
            ]}
          >
            {feedback.isCorrect ? '✓ נכון' : '✕ לא נכון'}
          </Text>

          {feedback.isCorrect && feedback.xpAwarded > 0 ? (
            <Text
              style={[
                typography.subtitle,
                { marginTop: 8, color: colors.accent },
              ]}
            >
              +{feedback.xpAwarded} XP
            </Text>
          ) : null}

          {feedback.explanationHebrew ? (
            <View
              className="mt-4 border-t pt-4"
              style={{ borderColor: colors.border }}
            >
              <Text style={typography.label}>הסבר קצר</Text>
              <Text style={[typography.body, { marginTop: 4 }]}>
                {feedback.explanationHebrew}
              </Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {submitError ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.error, textAlign: 'center', marginBottom: 12 },
          ]}
        >
          {submitError}
        </Text>
      ) : null}

      {!isCompleted ? (
        <Pressable
          onPress={() => void handleSubmit()}
          disabled={!selectedOptionId || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="בדוק תשובה"
          className="items-center rounded-2xl py-4"
          style={{
            backgroundColor:
              selectedOptionId && !isSubmitting ? colors.primary : colors.border,
            minHeight: 48,
            opacity: selectedOptionId && !isSubmitting ? 1 : 0.5,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[typography.subtitle, { color: colors.white }]}>
              בדוק תשובה
            </Text>
          )}
        </Pressable>
      ) : null}

      {pendingBadge ? (
        <Pressable
          onPress={dismissBadgeNotification}
          className="mt-4 rounded-2xl border p-4"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.accent,
          }}
        >
          <Text style={[typography.subtitle, { textAlign: 'center' }]}>
            🏆 הישג חדש!
          </Text>
          <Text
            style={[typography.body, { textAlign: 'center', marginTop: 4 }]}
          >
            {pendingBadge.icon} {pendingBadge.titleHebrew}
          </Text>
        </Pressable>
      ) : null}
    </ScreenContainer>
  );
}
