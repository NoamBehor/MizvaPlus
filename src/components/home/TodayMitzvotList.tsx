import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';

interface TodayMitzvotListProps {
  mitzvot: Mitzvah[];
  isCompleted: (mitzvahId: string) => boolean;
  onToggleCompletion: (mitzvahId: string) => void;
}

export function TodayMitzvotList({
  mitzvot,
  isCompleted,
  onToggleCompletion,
}: TodayMitzvotListProps) {
  return (
    <Card className="mb-4">
      <Text style={[typography.subtitle, { marginBottom: 12 }]}>
        המצוות שלי היום
      </Text>

      <View className="gap-3">
        {mitzvot.map((mitzvah) => {
          const completed = isCompleted(mitzvah.id);
          return (
            <Pressable
              key={mitzvah.id}
              onPress={() => onToggleCompletion(mitzvah.id)}
              className="flex-row items-center justify-between rounded-xl px-2 py-2"
              style={{ backgroundColor: completed ? '#F4F1EA' : 'transparent' }}
            >
              <Text style={[typography.bodySmall, { color: colors.accent }]}>
                +{mitzvah.xpReward} XP
              </Text>
              <View className="flex-row items-center gap-3">
                <Text style={typography.body}>{mitzvah.title}</Text>
                <Text style={typography.subtitle}>{completed ? '✓' : '○'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
