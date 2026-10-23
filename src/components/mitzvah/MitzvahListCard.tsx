import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';
import { getMitzvahIcon } from '@/utils/mitzvah';

interface MitzvahListCardProps {
  mitzvah: Mitzvah;
  isCompleted: boolean;
  onPress: () => void;
}

export function MitzvahListCard({
  mitzvah,
  isCompleted,
  onPress,
}: MitzvahListCardProps) {
  const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${mitzvah.title} — פתח פרטים`}
    >
      <Card className="mb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Text style={{ fontSize: 28 }}>{icon}</Text>
            <View className="items-start">
              <Text style={typography.subtitle}>{mitzvah.title}</Text>
            </View>
          </View>

          <View className="items-start">
            <Text
              style={[
                typography.caption,
                {
                  color: isCompleted ? colors.success : colors.accent,
                  marginBottom: 4,
                },
              ]}
            >
              {isCompleted ? '✓ הושלם היום' : `+${mitzvah.xpReward} XP`}
            </Text>
            <Text style={typography.bodySmall} numberOfLines={2}>
              {mitzvah.description}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
