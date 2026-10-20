import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, shadows } from '@/constants/theme';

interface MapFloatingControlsProps {
  onRecenter?: () => void;
  onRefreshSynagogues?: () => void;
}

export function MapFloatingControls({
  onRecenter,
  onRefreshSynagogues,
}: MapFloatingControlsProps) {
  if (!onRecenter && !onRefreshSynagogues) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute bottom-3 start-3 gap-2"
    >
      {onRecenter ? (
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
          <Text style={{ fontSize: 20 }}>🎯</Text>
        </Pressable>
      ) : null}
      {onRefreshSynagogues ? (
        <Pressable
          onPress={onRefreshSynagogues}
          accessibilityRole="button"
          accessibilityLabel="רענון בתי כנסת"
          className="h-11 w-11 items-center justify-center rounded-xl"
          style={[
            shadows.pill,
            {
              backgroundColor: colors.accent,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <Text style={{ fontSize: 18 }}>🔄</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
