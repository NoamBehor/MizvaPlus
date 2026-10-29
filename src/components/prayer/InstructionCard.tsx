import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { prayerRtlBlock, prayerRtlText } from '@/constants/prayerReaderLayout';
import { borderRadius, shadows, spacing, surfaces, typography } from '@/constants/theme';

interface InstructionCardProps {
  tone: 'amber' | 'white';
  label: string;
  children: string;
  fontSize: number;
}

export function InstructionCard({
  tone,
  label,
  children,
  fontSize,
}: InstructionCardProps) {
  const fontsLoaded = useHomeFonts();
  const amber = tone === 'amber';

  return (
    <View
      style={{
        ...prayerRtlBlock,
        backgroundColor: amber
          ? surfaces.prayerInstruction
          : surfaces.prayerActionSurface,
        borderColor: amber
          ? surfaces.prayerInstructionBorder
          : surfaces.prayerActionBorder,
        borderWidth: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sacredCard,
      }}
    >
      <Text
        style={[
          typography.caption,
          prayerRtlText,
          homeFontStyle(fontsLoaded, homeFonts.semibold),
          {
            color: amber ? colors.sacredAmber : colors.sacredSlate,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
      </Text>
      <Text
        accessibilityRole="text"
        style={{
          ...prayerRtlBlock,
          fontSize: Math.max(15, fontSize - 4),
          lineHeight: Math.round(Math.max(15, fontSize - 4) * 1.7),
          color: amber ? colors.sacredAmberText : colors.sacredInk,
          ...homeFontStyle(fontsLoaded, homeFonts.regular),
        }}
      >
        {children}
      </Text>
    </View>
  );
}
