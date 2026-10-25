import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/common/AppIcon';
import { colors } from '@/constants/colors';
import { borderRadius, shadows } from '@/constants/theme';
import { ltrLayoutStyle } from '@/constants/layoutDirection';

interface MapFloatingControlsProps {
  onRecenter?: () => void;
}

export function MapFloatingControls({ onRecenter }: MapFloatingControlsProps) {
  if (!onRecenter) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute"
      style={[ltrLayoutStyle, { left: 16, top: 16 }]}
    >
      <Pressable
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="מרכוז על המיקום שלי"
        className="h-11 w-11 items-center justify-center rounded-xl border"
        style={[
          shadows.pill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <AppIcon name="crosshairs" size={20} color={colors.secondary} />
      </Pressable>
    </View>
  );
}
