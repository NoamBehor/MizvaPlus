import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import type { MitzvahExplanationStatus } from '@/utils/mitzvahExplanationView';

interface ExplanationHeroProps {
  icon: string;
  title: string;
  description: string;
  xpReward: number;
  timing: string[];
  status: MitzvahExplanationStatus | null;
}

export function ExplanationHero({
  icon,
  title,
  description,
  xpReward,
  timing,
  status,
}: ExplanationHeroProps) {
  const fontsLoaded = useHomeFonts();

  return (
    <View style={styles.wrap}>
      <View style={homeTheme.heroShadow}>
        <LinearGradient
          colors={[colors.navy, colors.navyMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.glowBlue} />
          <View pointerEvents="none" style={styles.glowGold} />

          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text
                accessibilityRole="header"
                style={[
                  homeFontStyle(fontsLoaded, homeFonts.display),
                  styles.title,
                ]}
              >
                {title}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  homeFontStyle(fontsLoaded, homeFonts.regular),
                  styles.description,
                ]}
              >
                {description}
              </Text>
            </View>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={styles.iconTile}
            >
              <Text style={styles.icon}>{icon}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.timing}>
              {timing.map((line) => (
                <View key={line} style={styles.timingLine}>
                  <View style={styles.timingDot} />
                  <Text
                    style={[
                      typography.caption,
                      homeFontStyle(fontsLoaded, homeFonts.semibold),
                      styles.timingText,
                    ]}
                  >
                    {line}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.xpChip}>
              <AppIcon name="star" size={14} color={homeTheme.gold} />
              <Text
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.bold),
                  styles.xpText,
                ]}
              >
                +{xpReward} XP בהשלמה
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {status ? (
        <Text
          style={[
            typography.caption,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            styles.status,
            { color: status.active ? homeTheme.successText : homeTheme.goldDeep },
          ]}
        >
          {status.text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: homeTheme.sectionGap,
  },
  hero: {
    borderRadius: homeTheme.heroRadius,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  glowBlue: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(37, 99, 235, 0.28)',
    top: -56,
    left: -48,
  },
  glowGold: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    right: -16,
    bottom: -28,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    color: colors.white,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  description: {
    marginTop: spacing.sm,
    color: 'rgba(255, 255, 255, 0.86)',
  },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    fontSize: 32,
  },
  metaRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timing: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-start',
  },
  timingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: homeTheme.success,
  },
  timingText: {
    color: 'rgba(255, 255, 255, 0.9)',
    flexShrink: 1,
  },
  xpChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 230, 138, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.35)',
  },
  xpText: {
    color: homeTheme.gold,
  },
  status: {
    marginTop: spacing.sm,
  },
});
