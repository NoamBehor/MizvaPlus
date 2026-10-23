import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ParashaPodcastPlayer } from '@/components/podcast/ParashaPodcastPlayer';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import { useParashaPodcastContext } from '@/context/ParashaPodcastContext';
import type { RootStackParamList } from '@/navigation/types';

type ParashaPodcastPlayerScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ParashaPodcastPlayer'
>;

export function ParashaPodcastPlayerScreen({
  navigation,
}: ParashaPodcastPlayerScreenProps) {
  const podcast = useParashaPodcastContext();

  return (
    <ScreenContainer scrollable>
      <View className="flex-row items-center justify-between">
        <View style={{ width: 72 }} />
        <Text style={typography.subtitle}>פודקאסט פרשת השבוע</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          className="rounded-xl px-3 py-2"
          style={{
            minHeight: 44,
            minWidth: 72,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[typography.label, { color: colors.secondary }]}>
            ← חזרה
          </Text>
        </Pressable>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <ParashaPodcastPlayer podcast={podcast} />
      </View>
    </ScreenContainer>
  );
}
