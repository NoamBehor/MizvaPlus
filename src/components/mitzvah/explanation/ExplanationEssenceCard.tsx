import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';

interface ExplanationEssenceCardProps {
  body: string;
}

export function ExplanationEssenceCard({ body }: ExplanationEssenceCardProps) {
  const fontsLoaded = useHomeFonts();

  if (!body) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="info" size={18} color={homeTheme.primary} />
        <Text
          style={[
            typography.label,
            homeFontStyle(fontsLoaded, homeFonts.bold),
            styles.heading,
          ]}
        >
          מהות המצווה בקצרה
        </Text>
      </View>
      <Text
        style={[
          typography.bodySmall,
          homeFontStyle(fontsLoaded, homeFonts.regular),
          styles.body,
        ]}
      >
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: homeTheme.surface,
    borderRadius: homeTheme.cardRadius,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    padding: spacing.md,
    marginBottom: homeTheme.sectionGap,
    ...homeTheme.cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heading: {
    color: homeTheme.primary,
    flexShrink: 1,
  },
  body: {
    color: homeTheme.text,
    lineHeight: 22,
  },
});
