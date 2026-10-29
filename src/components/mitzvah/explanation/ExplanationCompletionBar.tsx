import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';

interface ExplanationCompletionBarProps {
  xpReward: number;
  completed: boolean;
  trackingEnabled: boolean;
  isCompleting: boolean;
  onComplete: () => void;
}

export function ExplanationCompletionBar({
  xpReward,
  completed,
  trackingEnabled,
  isCompleting,
  onComplete,
}: ExplanationCompletionBarProps) {
  const fontsLoaded = useHomeFonts();
  const insets = useSafeAreaInsets();
  const canComplete = trackingEnabled && !completed && !isCompleting;

  return (
    <View style={[styles.bar, { paddingBottom: spacing.md + insets.bottom }]}>
      {completed ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`הושלם היום, ${xpReward} XP הוענקו`}
          style={[styles.button, styles.completedButton]}
        >
          <AppIcon name="check" size={20} color={colors.white} />
          <View style={styles.completedCopy}>
            <Text
              style={[
                homeFontStyle(fontsLoaded, homeFonts.extrabold),
                styles.buttonLabel,
              ]}
            >
              הושלם היום
            </Text>
            <Text
              style={[
                typography.caption,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                styles.completedXp,
              ]}
            >
              {xpReward} XP הוענקו
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={onComplete}
          disabled={!canComplete}
          accessibilityRole="button"
          accessibilityLabel={`סיימתי את המצווה, ${xpReward} נקודות`}
          accessibilityState={{ disabled: !canComplete, busy: isCompleting }}
          style={styles.pressable}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.button,
                !trackingEnabled && styles.disabled,
                pressed && canComplete && styles.pressed,
              ]}
            >
              <AppIcon name="check" size={20} color={homeTheme.success} />
              <Text
                style={[
                  homeFontStyle(fontsLoaded, homeFonts.extrabold),
                  styles.buttonLabel,
                ]}
              >
                {isCompleting ? 'שומר...' : 'סיימתי את המצווה'}
              </Text>
              <View style={styles.xpChip}>
                <Text
                  style={[
                    typography.caption,
                    homeFontStyle(fontsLoaded, homeFonts.bold),
                    styles.xpText,
                  ]}
                >
                  +{xpReward} XP
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      )}

      {!completed && !trackingEnabled ? (
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.regular),
            styles.helper,
          ]}
        >
          הפעל מעקב על מצווה זו כדי לסמן השלמה
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.95)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pressable: {
    width: '100%',
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: homeTheme.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  completedButton: {
    backgroundColor: homeTheme.success,
  },
  completedCopy: {
    alignItems: 'flex-start',
  },
  buttonLabel: {
    flexShrink: 1,
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  completedXp: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  xpChip: {
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 230, 138, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.35)',
  },
  xpText: {
    color: homeTheme.gold,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
  helper: {
    color: homeTheme.muted,
    textAlign: 'center',
  },
});
