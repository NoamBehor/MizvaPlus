import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { prayerRtlText } from '@/constants/prayerReaderLayout';
import { spacing, surfaces, typography } from '@/constants/theme';

const SECTION_CHIP_MAX_WIDTH = Dimensions.get('window').width * 0.72;

interface SectionNavigatorProps {
  sections: Array<{ id: string; title: string; isConditional?: boolean }>;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onOpenTableOfContents?: () => void;
}

export function SectionNavigator({
  sections,
  activeSectionId,
  onSelectSection,
  onOpenTableOfContents,
}: SectionNavigatorProps) {
  const fontsLoaded = useHomeFonts();

  return (
    <View style={{ marginBottom: spacing.sm }}>
      {onOpenTableOfContents ? (
        <View
          style={{
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={onOpenTableOfContents}
            accessibilityRole="button"
            accessibilityLabel="קפיצה לסעיף"
            style={{
              backgroundColor: surfaces.prayerSectionChip,
              minHeight: 36,
              borderRadius: 999,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
            }}
          >
            <Text
              style={[
                typography.label,
                prayerRtlText,
                homeFontStyle(fontsLoaded, homeFonts.semibold),
              ]}
            >
              קפיצה לסעיף
            </Text>
          </Pressable>
          <Text
            style={[
              typography.caption,
              prayerRtlText,
              homeFontStyle(fontsLoaded, homeFonts.regular),
              { color: colors.sacredSlate, flexShrink: 1 },
            ]}
          >
            ניווט לפי מבנה הסידור
          </Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ direction: 'rtl', flexGrow: 0 }}
        contentContainerStyle={{
          direction: 'rtl',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingBottom: spacing.sm,
        }}
      >
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <Pressable
              key={section.id}
              onPress={() => onSelectSection(section.id)}
              accessibilityRole="button"
              accessibilityLabel={`עבור ל${section.title}`}
              style={{
                backgroundColor: isActive
                  ? colors.sacredNavy
                  : surfaces.prayerSectionChip,
                borderWidth: section.isConditional && !isActive ? 1 : 0,
                borderColor: surfaces.prayerSectionConditionalBorder,
                minHeight: 36,
                borderRadius: 999,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                flexShrink: 0,
                maxWidth: SECTION_CHIP_MAX_WIDTH,
              }}
            >
              <Text
                style={[
                  typography.label,
                  prayerRtlText,
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  { color: isActive ? colors.white : colors.sacredInk },
                ]}
              >
                {section.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
