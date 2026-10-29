import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';

interface ExplanationInsightCardProps {
  paragraphs: string[];
}

export function ExplanationInsightCard({
  paragraphs,
}: ExplanationInsightCardProps) {
  const fontsLoaded = useHomeFonts();

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <AppIcon name="sparkles" size={18} color={homeTheme.goldDeep} />
        </View>
        <Text
          style={[
            typography.label,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            styles.heading,
          ]}
        >
          הסבר מפורט
        </Text>
      </View>

      <View style={styles.list}>
        {paragraphs.map((paragraph, index) => (
          <View key={`${index}-${paragraph.slice(0, 24)}`} style={styles.row}>
            <Text
              style={[
                typography.bodySmall,
                homeFontStyle(fontsLoaded, homeFonts.regular),
                styles.paragraph,
              ]}
            >
              {paragraph}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeTheme.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    padding: spacing.lg,
    marginBottom: homeTheme.sectionGap,
    ...homeTheme.cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: homeTheme.goldSoft,
  },
  heading: {
    color: homeTheme.text,
    flexShrink: 1,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: '#F8FAFC',
    borderRadius: homeTheme.cardRadius,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.9)',
    padding: spacing.md,
  },
  paragraph: {
    color: homeTheme.text,
    lineHeight: 22,
  },
});
