import { Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

export function MapMarkerLegend() {
  return (
    <View
      pointerEvents="none"
      className="absolute top-2 end-2 rounded-lg px-2 py-1.5"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        borderWidth: 1,
        borderColor: colors.border,
        maxWidth: 200,
      }}
      accessibilityLabel="מקרא סמלי מפה"
    >
      <Text
        style={[
          typography.caption,
          {
            color: colors.text,
            fontWeight: '700',
            textAlign: 'right',
            writingDirection: 'rtl',
            marginBottom: 4,
          },
        ]}
      >
        מקרא
      </Text>
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary,
          }}
        />
        <Text style={[typography.caption, { color: colors.muted }]}>בית כנסת</Text>
      </View>
      <View className="mt-1 flex-row items-center gap-1.5">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.accent,
          }}
        />
        <Text style={[typography.caption, { color: colors.muted }]}>
          בקשת מניין פעילה
        </Text>
      </View>
    </View>
  );
}
