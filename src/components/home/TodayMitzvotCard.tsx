import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import type { Mitzvah } from '@/types/mitzvah';
import { getMitzvahIcon } from '@/utils/mitzvah';

interface TodayMitzvotCardProps {
  mitzvot: Mitzvah[];
  isCompleted: (mitzvahId: string) => boolean;
  onOpenMitzvah: (mitzvahId: string) => void;
  onSelectMitzvot: () => void;
}

export function TodayMitzvotCard({
  mitzvot,
  isCompleted,
  onOpenMitzvah,
  onSelectMitzvot,
}: TodayMitzvotCardProps) {
  if (mitzvot.length === 0) {
    return (
      <Card className="mb-4 items-center">
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          עדיין לא בחרת מצוות למעקב
        </Text>
        <Text
          style={[
            typography.bodySmall,
            { textAlign: 'center', marginTop: 8, marginBottom: 16 },
          ]}
        >
          בחר מצוות כדי להתחיל לעקוב אחר ההתקדמות היומית שלך.
        </Text>
        <Pressable
          onPress={onSelectMitzvot}
          className="rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.accent }}
        >
          <Text style={[typography.label, { color: colors.surface }]}>
            בחר מצוות
          </Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <Text style={[typography.subtitle, { marginBottom: 12 }]}>
        המצוות שלי היום
      </Text>

      <View className="gap-3">
        {mitzvot.map((mitzvah) => {
          const completed = isCompleted(mitzvah.id);
          const icon = getMitzvahIcon(mitzvah.id, mitzvah.category);
          return (
            <Pressable
              key={mitzvah.id}
              onPress={() => onOpenMitzvah(mitzvah.id)}
              accessibilityRole="button"
              accessibilityLabel={`${mitzvah.title} — פתח פרטים`}
              className="flex-row items-center justify-between rounded-xl px-2 py-2"
              style={{
                backgroundColor: completed ? '#F4F1EA' : 'transparent',
                opacity: completed ? 0.8 : 1,
                minHeight: 48,
              }}
            >
              <Text style={[typography.bodySmall, { color: colors.accent }]}>
                {completed ? '✓' : `+${mitzvah.xpReward} XP`}
              </Text>
              <View className="flex-row items-center gap-3">
                <Text style={typography.body}>{mitzvah.title}</Text>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
