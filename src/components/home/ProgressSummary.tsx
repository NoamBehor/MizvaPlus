import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';

interface ProgressSummaryProps {
  completed: number;
  total: number;
  percentage: number;
}

export function ProgressSummary({
  completed,
  total,
  percentage,
}: ProgressSummaryProps) {
  if (total === 0) {
    return null;
  }

  const isComplete = percentage === 100;
  const countLabel = `${completed} מתוך ${total} מצוות`;

  return (
    <Card
      className="mb-4"
      elevated
      style={
        isComplete
          ? {
              borderWidth: 1,
              borderColor: colors.success,
            }
          : undefined
      }
    >
      <View
        accessibilityRole="summary"
        accessibilityLabel={`מצוות היום, ${percentage} אחוז, ${countLabel}${
          isComplete ? ', הושלם' : ''
        }`}
      >
        <View className="flex-row items-center justify-between">
          <Text
            style={[
              typography.label,
              isComplete ? { color: colors.success } : undefined,
            ]}
          >
            {isComplete ? '✓ הושלם' : null}
          </Text>
          <Text style={typography.subtitle}>מצוות היום</Text>
        </View>

        <Text
          style={{
            fontSize: 48,
            fontWeight: '700',
            color: isComplete ? colors.success : colors.primary,
            textAlign: 'right',
            writingDirection: 'rtl',
            fontVariant: ['tabular-nums'],
            marginTop: spacing.sm,
            lineHeight: 52,
          }}
        >
          {percentage}%
        </Text>

        <Text
          style={[
            typography.bodySmall,
            {
              marginTop: spacing.xs,
              marginBottom: spacing.md,
              color: colors.muted,
            },
          ]}
        >
          {countLabel}
        </Text>

        <ProgressBar
          percentage={percentage}
          variant="hero"
          showPercentageLabel={false}
        />

        {isComplete ? (
          <View
            style={{
              marginTop: spacing.sm,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
              borderRadius: borderRadius.md,
              backgroundColor: `${colors.success}12`,
            }}
          >
            <Text
              style={[
                typography.bodySmall,
                {
                  color: colors.success,
                  textAlign: 'right',
                  writingDirection: 'rtl',
                },
              ]}
            >
              כל המצוות הפעילות הושלמו היום
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}
