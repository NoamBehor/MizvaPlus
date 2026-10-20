import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import {
  prayerRtlBlock,
  prayerRtlContainer,
} from '@/constants/prayerReaderLayout';
import { borderRadius, spacing, surfaces, typography } from '@/constants/theme';
import type { MitzvahPrayerContent } from '@/constants/mitzvahPrayers';

interface PrayerTextProps {
  prayer: MitzvahPrayerContent;
}

export function PrayerText({ prayer }: PrayerTextProps) {
  return (
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator
      style={{ maxHeight: 420 }}
      contentContainerStyle={{ ...prayerRtlContainer, paddingBottom: spacing.md }}
    >
      {prayer.sections.map((section, index) => (
        <View
          key={`${section.heading ?? 'section'}-${index}`}
          style={{ ...prayerRtlContainer, marginBottom: spacing.lg }}
        >
          {section.heading ? (
            <Text
              accessibilityRole="header"
              style={[
                typography.label,
                prayerRtlBlock,
                {
                  color: colors.secondary,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              {section.heading}
            </Text>
          ) : null}
          <Text
            accessibilityRole="text"
            style={[
              typography.body,
              prayerRtlBlock,
              {
                fontSize: 20,
                lineHeight: 34,
                color: colors.text,
              },
            ]}
          >
            {section.text}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function PrayerTextContainer({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        ...prayerRtlContainer,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: surfaces.prayerReaderBackground,
        padding: spacing.md,
      }}
    >
      {children}
    </View>
  );
}
