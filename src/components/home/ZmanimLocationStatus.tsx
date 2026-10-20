import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/theme';
import {
  formatZmanimLocationDisplayLabel,
  type ZmanimLocation,
} from '@/services/zmanimLocation';

interface ZmanimLocationStatusProps {
  location: ZmanimLocation | null;
  isResolving?: boolean;
}

export function ZmanimLocationStatus({
  location,
  isResolving = false,
}: ZmanimLocationStatusProps) {
  if (isResolving && !location) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="טוען מיקום לחישוב זמנים"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ fontSize: 12, color: colors.muted }}
        >
          📍
        </Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          טוען מיקום לחישוב זמנים...
        </Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel="מיקום לחישוב זמנים: מיקום לא זמין — זמנים לפי ירושלים"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.sm,
          marginBottom: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ fontSize: 12, color: colors.muted }}
        >
          📍
        </Text>
        <Text style={[typography.caption, { color: colors.muted }]}>
          {formatZmanimLocationDisplayLabel('unavailable')}
        </Text>
      </View>
    );
  }

  const label = formatZmanimLocationDisplayLabel(location.source);

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`מיקום לחישוב זמנים: ${label}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{ fontSize: 12, color: colors.muted }}
      >
        📍
      </Text>
      <Text
        style={[
          typography.caption,
          {
            color: colors.muted,
            textAlign: 'center',
            writingDirection: 'rtl',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
