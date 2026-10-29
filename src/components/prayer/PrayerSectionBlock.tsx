import { Text, View } from 'react-native';

import { SacredText } from '@/components/prayer/SacredText';
import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import {
  isMajorPrayerSurfaceSection,
  prayerRtlBlock,
  prayerRtlContainer,
} from '@/constants/prayerReaderLayout';
import { borderRadius, spacing, surfaces, typography } from '@/constants/theme';
import type { EnrichedPrayerSection, PrayerFontSize } from '@/types/prayer';

interface PrayerSectionBlockProps {
  section: EnrichedPrayerSection;
  isLast: boolean;
  fontSize: PrayerFontSize;
  paragraphSpacing: number;
  sectionSpacing: number;
  onLayout: (y: number) => void;
}

export function PrayerSectionBlock({
  section,
  isLast,
  fontSize,
  paragraphSpacing,
  sectionSpacing,
  onLayout,
}: PrayerSectionBlockProps) {
  const fontsLoaded = useHomeFonts();
  const isConditional = section.availability !== 'always';
  const showConditionalState = isConditional && !section.applicableToday;
  const isMajorSection = isMajorPrayerSurfaceSection(section.id);
  const showMajorSurface = isMajorSection && !showConditionalState;

  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout.y)}
      style={{
        ...prayerRtlContainer,
        marginBottom: isLast ? 0 : sectionSpacing,
        marginTop: showMajorSurface ? spacing.sm : 0,
        paddingTop: showMajorSurface ? spacing.md : spacing.sm,
        paddingBottom: showMajorSurface
          ? spacing.md
          : isConditional
            ? spacing.md
            : spacing.sm,
        paddingHorizontal: showMajorSurface
          ? spacing.md
          : isConditional
            ? spacing.sm
            : 0,
        borderRadius: showMajorSurface
          ? borderRadius.lg
          : isConditional
            ? borderRadius.md
            : 0,
        backgroundColor: showConditionalState
          ? surfaces.prayerSectionConditional
          : showMajorSurface
            ? surfaces.prayerSectionSurface
            : 'transparent',
        borderWidth: isConditional ? 1 : 0,
        borderColor: showConditionalState
          ? surfaces.prayerSectionConditionalBorder
          : 'transparent',
      }}
    >
      <View style={{ ...prayerRtlContainer, marginBottom: spacing.md }}>
        <Text
          accessibilityRole="header"
          style={{
            ...prayerRtlBlock,
            color: colors.text,
            fontSize: showMajorSurface
              ? Math.max(22, fontSize + 2)
              : Math.max(20, fontSize),
            lineHeight: Math.round(
              (showMajorSurface ? Math.max(22, fontSize + 2) : Math.max(20, fontSize)) *
                1.35,
            ),
            fontWeight: showMajorSurface ? '700' : '600',
            ...homeFontStyle(fontsLoaded, homeFonts.sacredBold),
          }}
        >
          {section.title}
        </Text>

        {section.availabilityLabel ? (
          <Text
            style={[
              typography.caption,
              prayerRtlBlock,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: colors.sacredAmber, marginTop: 4 },
            ]}
          >
            {section.availabilityLabel}
          </Text>
        ) : null}

        {section.availabilityNote ? (
          <Text
            style={[
              typography.caption,
              prayerRtlBlock,
              homeFontStyle(fontsLoaded, homeFonts.regular),
              { color: colors.sacredSlate, marginTop: 4 },
            ]}
          >
            {section.availabilityNote}
          </Text>
        ) : null}
      </View>

      {section.text.map((paragraph, index) => (
        <View
          key={`${section.id}-${index}`}
          style={{
            marginBottom:
              index === section.text.length - 1 ? 0 : paragraphSpacing,
          }}
        >
          <SacredText fontSize={fontSize}>{paragraph}</SacredText>
        </View>
      ))}
    </View>
  );
}
