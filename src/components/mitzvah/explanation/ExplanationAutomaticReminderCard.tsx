import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import type { MitzvahCategory } from '@/types/mitzvah';

interface ExplanationAutomaticReminderCardProps {
  category: Extract<MitzvahCategory, 'fast' | 'holiday'>;
  trackingEnabled: boolean;
}

const WEEK_LINE = 'שבוע לפני, ב-09:00';
const DAY_LINE = 'יום לפני, ב-09:00';

export function ExplanationAutomaticReminderCard({
  category,
  trackingEnabled,
}: ExplanationAutomaticReminderCardProps) {
  const fontsLoaded = useHomeFonts();
  const hourLine =
    category === 'fast'
      ? 'שעה לפני תחילת הצום'
      : 'שעה לפני כניסת החג';
  const lines = [WEEK_LINE, DAY_LINE, hourLine];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <AppIcon name="bell" size={20} color={homeTheme.goldDeep} />
        </View>
        <View style={styles.copy}>
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              styles.kicker,
            ]}
          >
            תזכורות אוטומטיות
          </Text>
          <Text
            style={[
              homeFontStyle(fontsLoaded, homeFonts.extrabold),
              styles.title,
            ]}
          >
            {trackingEnabled
              ? 'שבוע לפני, יום לפני, ושעה לפני'
              : 'יופעלו כשתבחרו את המצווה'}
          </Text>
        </View>
      </View>
      {lines.map((line) => (
        <Text
          key={line}
          style={[
            typography.bodySmall,
            homeFontStyle(fontsLoaded, homeFonts.regular),
            styles.line,
          ]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeTheme.goldSoft,
    borderRadius: homeTheme.cardRadius,
    borderWidth: 1,
    borderColor: homeTheme.goldBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: homeTheme.goldBorder,
  },
  copy: {
    flex: 1,
    alignItems: 'flex-start',
  },
  kicker: {
    color: homeTheme.muted,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    color: homeTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  line: {
    color: homeTheme.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 2,
  },
});
