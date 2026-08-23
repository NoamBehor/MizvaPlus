import { Text, View } from 'react-native';

import { ProgressBar } from '@/components/common/ProgressBar';
import { typography } from '@/constants/theme';

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

  return (
    <View className="mb-6">
      <Text style={[typography.subtitle, { marginBottom: 12 }]}>
        התקדמות יומית
      </Text>
      <ProgressBar
        percentage={percentage}
        label={`${completed} מתוך ${total} מצוות הושלמו`}
      />
    </View>
  );
}
