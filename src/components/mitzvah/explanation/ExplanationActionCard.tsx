import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import type { ExplanationActionItem } from '@/utils/mitzvahExplanationView';

interface ExplanationActionCardProps {
  primaryAction: ExplanationActionItem | null;
  secondaryAction: ExplanationActionItem | null;
  pendingMessage: string | null;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}

export function ExplanationActionCard({
  primaryAction,
  secondaryAction,
  pendingMessage,
  onPrimaryPress,
  onSecondaryPress,
}: ExplanationActionCardProps) {
  const fontsLoaded = useHomeFonts();

  if (!primaryAction && !pendingMessage) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {primaryAction ? (
        <Pressable
          onPress={onPrimaryPress}
          accessibilityRole="button"
          accessibilityLabel={primaryAction.accessibilityLabel}
          style={styles.pressable}
        >
          {({ pressed }) => (
          <LinearGradient
            colors={[homeTheme.primary, colors.navyMid]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={[styles.button, pressed && styles.pressed]}
          >
            <View style={styles.copy}>
              <View style={styles.iconTile}>
                <AppIcon name="scroll" size={22} color={colors.white} />
              </View>
              <View style={styles.textBlock}>
                <Text
                  style={[
                    homeFontStyle(fontsLoaded, homeFonts.extrabold),
                    styles.label,
                  ]}
                >
                  {primaryAction.label}
                </Text>
                {primaryAction.subtitle ? (
                  <Text
                    style={[
                      typography.caption,
                      homeFontStyle(fontsLoaded, homeFonts.regular),
                      styles.subtitle,
                    ]}
                  >
                    {primaryAction.subtitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={styles.chevron}>
              <AppIcon name="chevronLeft" size={18} color={colors.white} />
            </View>
          </LinearGradient>
          )}
        </Pressable>
      ) : null}

      {secondaryAction ? (
        <Pressable
          onPress={onSecondaryPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.accessibilityLabel}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text
            style={[
              typography.label,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              styles.secondaryLabel,
            ]}
          >
            {secondaryAction.label}
          </Text>
        </Pressable>
      ) : null}

      {pendingMessage ? (
        <Text
          style={[
            typography.bodySmall,
            homeFontStyle(fontsLoaded, homeFonts.regular),
            styles.pending,
          ]}
        >
          {pendingMessage}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: homeTheme.sectionGap,
    gap: spacing.sm,
  },
  pressable: {
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  button: {
    borderRadius: homeTheme.controlRadius,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 72,
    ...homeTheme.actionGlow,
  },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textBlock: {
    flex: 1,
    alignItems: 'flex-start',
  },
  label: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(219, 234, 254, 0.92)',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  secondary: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  secondaryLabel: {
    color: homeTheme.primary,
  },
  pending: {
    color: homeTheme.goldDeep,
    textAlign: 'center',
  },
});
