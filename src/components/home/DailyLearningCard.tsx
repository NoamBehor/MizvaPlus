import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useDailyLearning } from '@/hooks/useDailyLearning';

interface DailyLearningCardProps {
  userId: string;
}

const COMPLETION_LABELS = {
  not_started: 'לא התחלת',
  in_progress: 'התחלת ללמוד',
  completed: 'סיימת',
} as const;

export function DailyLearningCard({ userId }: DailyLearningCardProps) {
  const {
    content,
    progress,
    completionState,
    sourceLabel,
    preview,
    markInProgress,
    markCompleted,
  } = useDailyLearning(userId);

  const handleContinue = useCallback(() => {
    if (!content) {
      return;
    }

    if (completionState === 'not_started') {
      void markInProgress();
      return;
    }

    if (completionState === 'in_progress') {
      void markCompleted();
    }
  }, [content, completionState, markInProgress, markCompleted]);

  if (!content) {
    return (
      <Card className="mb-4">
        <Text style={typography.label}>לימוד יומי</Text>
        <Text
          style={[
            typography.bodySmall,
            { marginTop: spacing.sm, color: colors.muted },
          ]}
        >
          תוכן לימוד יומי לא זמין כרגע
        </Text>
      </Card>
    );
  }

  const progressPercent =
    completionState === 'completed'
      ? 100
      : completionState === 'in_progress'
        ? Math.max(progress.completionPercent, 10)
        : progress.completionPercent;

  return (
    <Card className="mb-4" elevated>
      <LinearGradient
        colors={['#F8F4EC', '#F0E8D8']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          borderRadius: borderRadius.xl,
          padding: spacing.md,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text
            style={[
              typography.caption,
              {
                color: colors.muted,
                backgroundColor: 'rgba(27, 42, 74, 0.06)',
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {COMPLETION_LABELS[completionState]}
          </Text>
          <Text style={[typography.label, { color: colors.muted }]}>
            לימוד יומי
          </Text>
        </View>

        <Text
          style={[
            typography.caption,
            { marginTop: spacing.sm, color: colors.muted, textAlign: 'right' },
          ]}
        >
          יום {progress.currentDay} מתוך {progress.totalDays} · השלמת{' '}
          {progressPercent}%
        </Text>

        <View style={{ marginTop: spacing.sm }}>
          <ProgressBar percentage={progressPercent} showPercentageLabel={false} />
        </View>

        <Text
          style={[
            typography.subtitle,
            {
              marginTop: spacing.md,
              color: colors.primary,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {content.topicHebrew}
        </Text>

        <Text
          style={[
            typography.body,
            {
              marginTop: spacing.sm,
              lineHeight: 26,
              textAlign: 'right',
              writingDirection: 'rtl',
              color: colors.secondary,
            },
          ]}
          numberOfLines={completionState === 'completed' ? undefined : 3}
        >
          {completionState === 'completed' ? content.bodyHebrew : preview}
        </Text>

        {sourceLabel ? (
          <Text
            style={[
              typography.bodySmall,
              {
                marginTop: spacing.md,
                color: colors.muted,
                textAlign: 'right',
              },
            ]}
          >
            מקור: {sourceLabel}
          </Text>
        ) : null}

        <View
          className="flex-row items-center justify-between"
          style={{ marginTop: spacing.md }}
        >
          <Pressable
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel={
              completionState === 'completed'
                ? 'לימוד הושלם'
                : content.readMoreLabel ?? 'להמשיך ללמוד'
            }
            style={{ minHeight: 44, justifyContent: 'center' }}
            disabled={completionState === 'completed'}
          >
            <Text
              style={[
                typography.bodySmall,
                {
                  color: colors.accent,
                  fontWeight: '600',
                },
              ]}
            >
              {completionState === 'completed'
                ? 'לימוד היומי הושלם ✓'
                : `${content.readMoreLabel ?? 'להמשיך ללמוד'} ←`}
            </Text>
          </Pressable>

          <Text style={[typography.caption, { color: colors.muted }]}>
            {content.estimatedMinutes} דקות
          </Text>
        </View>

        {content.reflectionQuestion && completionState !== 'not_started' ? (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.sm,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={[
                typography.bodySmall,
                { color: colors.secondary, textAlign: 'right', fontStyle: 'italic' },
              ]}
            >
              {content.reflectionQuestion}
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </Card>
  );
}
