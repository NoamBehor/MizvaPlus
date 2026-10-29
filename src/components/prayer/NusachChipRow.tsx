import { Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { spacing, typography } from '@/constants/theme';
import { NUSACH_LABELS, type PrayerNusach } from '@/types/prayer';

interface NusachStatusItem {
  nusach: PrayerNusach;
  available: boolean;
}

interface NusachAvailabilityRowProps {
  items: NusachStatusItem[];
  currentNusach: PrayerNusach;
}

export function NusachAvailabilityRow({
  items,
  currentNusach,
}: NusachAvailabilityRowProps) {
  const fontsLoaded = useHomeFonts();

  return (
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
      {items.map(({ nusach, available }) => {
        const isCurrent = available && nusach === currentNusach;
        const label = available
          ? NUSACH_LABELS[nusach]
          : `${NUSACH_LABELS[nusach]} — בקרוב`;

        return (
            <Pressable
              key={nusach}
              disabled={!available}
              accessibilityRole="button"
              accessibilityState={{ disabled: !available, selected: isCurrent }}
              accessibilityLabel={label}
              style={{
                minHeight: 32,
                paddingHorizontal: spacing.sm,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isCurrent
                  ? colors.sacredNavy
                  : colors.sacredCanvas,
                borderWidth: isCurrent ? 0 : 1,
                borderColor: colors.sacredLine,
                opacity: available ? 1 : 0.7,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  homeFontStyle(fontsLoaded, homeFonts.semibold),
                  {
                    color: isCurrent ? colors.white : colors.sacredSlate,
                    textAlign: 'right',
                    writingDirection: 'rtl',
                  },
                ]}
              >
                {isCurrent ? `✓ ${label}` : label}
              </Text>
            </Pressable>
        );
      })}
    </ScrollView>
  );
}
