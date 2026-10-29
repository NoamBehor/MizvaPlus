import { Pressable, StyleSheet, Text, View } from 'react-native';

import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import type { MitzvahCategory } from '@/types/mitzvah';

const BADGE_BORDER = 'rgba(226, 232, 240, 0.9)';

interface ExplanationTopBarProps {
  category: MitzvahCategory;
  categoryLabel: string;
  onBack: () => void;
}

export function ExplanationTopBar({
  category,
  categoryLabel,
  onBack,
}: ExplanationTopBarProps) {
  const fontsLoaded = useHomeFonts();
  const daily = category === 'daily';

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="חזרה"
      >
        {({ pressed }) => (
          <View style={[styles.backButton, pressed && styles.pressed]}>
            <Text
              style={[
                typography.label,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                styles.backLabel,
              ]}
            >
              → חזרה
            </Text>
          </View>
        )}
      </Pressable>

      <View
        style={[styles.badge, daily ? styles.dailyBadge : styles.otherBadge]}
        accessibilityRole="text"
        accessibilityLabel={categoryLabel}
      >
        <View
          style={[styles.dot, daily ? styles.dailyDot : styles.otherDot]}
        />
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            daily ? styles.dailyBadgeText : styles.otherBadgeText,
          ]}
        >
          {categoryLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: homeTheme.surface,
    borderWidth: 1,
    borderColor: BADGE_BORDER,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  backLabel: {
    color: homeTheme.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  dailyBadge: {
    backgroundColor: homeTheme.goldSoft,
    borderColor: homeTheme.goldBorder,
  },
  otherBadge: {
    backgroundColor: homeTheme.primarySoft,
    borderColor: homeTheme.primaryBorder,
  },
  dailyBadgeText: {
    color: homeTheme.goldDeep,
  },
  otherBadgeText: {
    color: homeTheme.primary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dailyDot: {
    backgroundColor: homeTheme.goldDeep,
  },
  otherDot: {
    backgroundColor: homeTheme.primary,
  },
});
