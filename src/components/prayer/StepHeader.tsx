import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { prayerRtlContainer, prayerRtlText } from '@/constants/prayerReaderLayout';
import { spacing, surfaces, typography } from '@/constants/theme';

interface StepHeaderProps {
  title: string;
  stepNumber: number | null;
  kindLabel: string | null;
}

export function StepHeader({ title, stepNumber, kindLabel }: StepHeaderProps) {
  const fontsLoaded = useHomeFonts();

  return (
    <View
      style={{
        ...prayerRtlContainer,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      {stepNumber != null ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.sacredNavy,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              typography.label,
              homeFontStyle(fontsLoaded, homeFonts.bold),
              { color: colors.white, fontSize: 14 },
            ]}
          >
            {stepNumber}
          </Text>
        </View>
      ) : null}
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        {kindLabel ? (
          <View
            style={{
              marginBottom: spacing.xs,
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: surfaces.prayerSectionChip,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
            }}
          >
            <Text
              style={[
                typography.caption,
                prayerRtlText,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
                { color: colors.sacredSlate },
              ]}
            >
              {kindLabel}
            </Text>
          </View>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[
            typography.subtitle,
            prayerRtlText,
            homeFontStyle(fontsLoaded, homeFonts.sacredBold),
            { color: colors.sacredInk },
          ]}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}
