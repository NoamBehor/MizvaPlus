import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';

interface GreetingHeaderProps {
  displayName?: string;
}

export function GreetingHeader({ displayName }: GreetingHeaderProps) {
  const greeting = displayName
    ? `שלום, ${displayName} 👋`
    : 'שלום 👋';

  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl border px-4 py-4"
      style={[
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRightWidth: 4,
          borderRightColor: colors.accent,
          borderRadius: borderRadius.xl,
        },
      ]}
    >
      <Text style={typography.hero}>{greeting}</Text>
      <Text style={[typography.bodySmall, { marginTop: spacing.xs }]}>
        בוא נמשיך את היום שלך בקצב שמתאים לך
      </Text>
    </View>
  );
}
