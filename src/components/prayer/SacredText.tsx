import { Text } from 'react-native';

import { colors } from '@/constants/colors';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts } from '@/constants/homeTheme';
import { prayerRtlBlock, SACRED_LINE_HEIGHT_RATIO } from '@/constants/prayerReaderLayout';

interface SacredTextProps {
  children: string;
  fontSize: number;
  emphasis?: boolean;
}

export function SacredText({
  children,
  fontSize,
  emphasis = false,
}: SacredTextProps) {
  const fontsLoaded = useHomeFonts();
  const size = emphasis ? fontSize + 1 : fontSize;

  return (
    <Text
      accessibilityRole="text"
      style={{
        ...prayerRtlBlock,
        fontSize: size,
        lineHeight: Math.round(size * SACRED_LINE_HEIGHT_RATIO),
        color: emphasis ? colors.sacredNavy : colors.sacredInk,
        ...homeFontStyle(
          fontsLoaded,
          emphasis ? homeFonts.sacredBold : homeFonts.sacred,
        ),
      }}
    >
      {children}
    </Text>
  );
}
