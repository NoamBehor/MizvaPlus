import { Pressable, Text, View } from 'react-native';

import { HomeSheet } from '@/components/home/HomeSheet';
import { colors } from '@/constants/colors';
import { homeTheme } from '@/constants/homeTheme';
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
        accessibilityLabel={`מיקום לחישוב זמנים: ${formatZmanimLocationDisplayLabel('unavailable')}`}
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

interface LocationSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  location: ZmanimLocation | null;
  isResolving?: boolean;
  onRefresh: () => void;
}

export function LocationSourceSheet({
  visible,
  onClose,
  location,
  isResolving = false,
  onRefresh,
}: LocationSourceSheetProps) {
  return (
    <HomeSheet visible={visible} title="זמני העיר" onClose={onClose}>
      <ZmanimLocationStatus location={location} isResolving={isResolving} />
      <Text style={[typography.bodySmall, { color: colors.muted }]}>
        הזמנים מחושבים לפי המיקום הקיים. אין בחירת עיר ידנית.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="רענון מיקום"
        onPress={onRefresh}
        style={{
          minHeight: 44,
          borderRadius: 12,
          backgroundColor: homeTheme.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[typography.label, { color: colors.white }]}>רענון מיקום</Text>
      </Pressable>
    </HomeSheet>
  );
}
