import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface StreakCardProps {
  streakCount: number;
}

export function StreakCard({ streakCount }: StreakCardProps) {
  return (
    <Card className="flex-1">
      <Text style={typography.caption}>רצף יומי</Text>
      <View className="mt-1 flex-row items-center gap-1">
        <Text style={{ fontSize: 20 }}>🔥</Text>
        <Text style={typography.subtitle}>{streakCount}</Text>
      </View>
      <Text style={[typography.bodySmall, { color: colors.muted }]}>
        {streakCount === 1 ? 'יום' : 'ימים'}
      </Text>
    </Card>
  );
}
