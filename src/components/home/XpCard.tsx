import { Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { getLevelProgress } from '@/types/gamification';

interface XpCardProps {
  xp: number;
}

export function XpCard({ xp }: XpCardProps) {
  const levelProgress = getLevelProgress(xp);

  return (
    <Card className="flex-1">
      <Text style={typography.caption}>רמה {levelProgress.currentLevel}</Text>
      <View className="mt-1 flex-row items-center gap-1">
        <Text style={{ fontSize: 20 }}>⭐</Text>
        <Text style={typography.subtitle}>{xp} XP</Text>
      </View>
      {levelProgress.xpForNextLevel !== null ? (
        <Text style={[typography.bodySmall, { color: colors.muted }]}>
          עוד {levelProgress.xpForNextLevel - xp} לרמה הבאה
        </Text>
      ) : (
        <Text style={[typography.bodySmall, { color: colors.muted }]}>
          רמה מקסימלית
        </Text>
      )}
    </Card>
  );
}
