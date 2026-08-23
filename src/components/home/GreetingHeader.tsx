import { Text, View } from 'react-native';

import { typography } from '@/constants/theme';

interface GreetingHeaderProps {
  displayName?: string;
}

export function GreetingHeader({ displayName }: GreetingHeaderProps) {
  const greeting = displayName
    ? `שלום, ${displayName} 👋`
    : 'שלום 👋';

  return (
    <View className="mb-4">
      <Text style={typography.hero}>{greeting}</Text>
      <Text style={[typography.bodySmall, { marginTop: 4 }]}>
        בוא נמשיך את היום שלך
      </Text>
    </View>
  );
}
