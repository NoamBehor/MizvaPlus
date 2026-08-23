import { Text, View } from 'react-native';

import { ScreenContainer } from '@/components/common/ScreenContainer';
import { typography } from '@/constants/theme';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon?: string;
}

export function PlaceholderScreen({
  title,
  description,
  icon = '✨',
}: PlaceholderScreenProps) {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center gap-4 py-24">
        <Text className="text-5xl">{icon}</Text>
        <Text style={typography.title}>{title}</Text>
        <Text style={[typography.bodySmall, { textAlign: 'center' }]}>
          {description}
        </Text>
      </View>
    </ScreenContainer>
  );
}
