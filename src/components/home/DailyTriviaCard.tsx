import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';
import { navigateToTrivia } from '@/navigation/navigationRef';
import { useGamificationStore } from '@/store/gamificationStore';
import { getActivityDateKey } from '@/utils/timezone';

interface DailyTriviaCardProps {
  userId: string;
}

export function DailyTriviaCard({ userId }: DailyTriviaCardProps) {
  const dateKey = getActivityDateKey();
  const completed = useGamificationStore((state) =>
    state.quizAttempts.some(
      (attempt) => attempt.userId === userId && attempt.dateKey === dateKey,
    ),
  );

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={navigateToTrivia}
          accessibilityRole="button"
          accessibilityLabel={completed ? 'צפה בחידון' : 'לשחק'}
          className="rounded-xl px-4 py-2"
          style={{ backgroundColor: colors.primary }}
        >
          <Text style={[typography.bodySmall, { color: colors.white }]}>
            {completed ? 'צפה' : 'לשחק'}
          </Text>
        </Pressable>

        <View className="flex-1 items-end">
          <Text style={typography.subtitle}>
            {completed ? '✓ החידון היומי הושלם' : '🧠 החידון היומי'}
          </Text>
          {!completed ? (
            <Text style={[typography.bodySmall, { marginTop: 4 }]}>
              שאלה אחת מחכה לך היום
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}
