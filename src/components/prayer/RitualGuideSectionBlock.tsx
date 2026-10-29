import { Text, View } from 'react-native';

import { InstructionCard } from '@/components/prayer/InstructionCard';
import { SacredText } from '@/components/prayer/SacredText';
import { StepHeader } from '@/components/prayer/StepHeader';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { colors } from '@/constants/colors';
import { prayerRtlContainer, prayerRtlText } from '@/constants/prayerReaderLayout';
import { spacing, surfaces, typography } from '@/constants/theme';
import type { PrayerFontSize } from '@/types/prayer';
import type { RitualGuideSection, RitualGuideSectionKind } from '@/types/ritualGuide';

interface RitualGuideSectionBlockProps {
  section: RitualGuideSection;
  stepNumber: number | null;
  isLast: boolean;
  fontSize: PrayerFontSize;
  paragraphSpacing: number;
  sectionSpacing: number;
  onLayout: (y: number) => void;
}

function getRitualKindLabel(kind: RitualGuideSectionKind): string | null {
  switch (kind) {
    case 'action':
      return 'פעולה';
    case 'blessing':
      return 'ברכה';
    case 'instruction':
      return 'הסבר';
    case 'step':
      return 'שלב';
    default:
      return null;
  }
}

function paragraphIsBlessing(kind: RitualGuideSectionKind, paragraph: string): boolean {
  return kind === 'blessing' || paragraph.trim().startsWith('בָּרוּךְ');
}

export function RitualGuideSectionBlock({
  section,
  stepNumber,
  isLast,
  fontSize,
  paragraphSpacing,
  sectionSpacing,
  onLayout,
}: RitualGuideSectionBlockProps) {
  const fontsLoaded = useHomeFonts();
  const kindLabel = getRitualKindLabel(section.kind);
  const isPracticalStep = section.kind === 'action' || section.kind === 'step';
  const instructionTone = isPracticalStep ? 'white' : 'amber';
  const instructionLabel = isPracticalStep ? 'פעולה' : 'הסבר';

  return (
    <View
      onLayout={(event) => onLayout(event.nativeEvent.layout.y)}
      style={{
        ...prayerRtlContainer,
        marginBottom: isLast ? 0 : sectionSpacing,
        gap: spacing.sm,
      }}
    >
      <StepHeader
        title={section.title}
        stepNumber={stepNumber}
        kindLabel={kindLabel}
      />

      {section.instruction ? (
        <InstructionCard
          tone={instructionTone}
          label={instructionLabel}
          fontSize={fontSize}
        >
          {section.instruction}
        </InstructionCard>
      ) : null}

      {section.text.map((paragraph, index) => {
        const blessing = paragraphIsBlessing(section.kind, paragraph);

        return (
          <View
            key={`${section.id}-${index}`}
            style={{
              marginBottom:
                index === section.text.length - 1 ? 0 : paragraphSpacing,
            }}
          >
            {blessing ? (
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
                    { color: colors.sacredAmber },
                  ]}
                >
                  ברכה
                </Text>
              </View>
            ) : null}
            <SacredText fontSize={fontSize} emphasis={blessing}>
              {paragraph}
            </SacredText>
          </View>
        );
      })}
    </View>
  );
}
