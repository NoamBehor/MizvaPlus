import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface MapStatePanelProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MapStatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: MapStatePanelProps) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text style={[typography.title, { textAlign: 'center', marginBottom: 12 }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.bodySmall,
          { textAlign: 'center', marginBottom: 24, lineHeight: 22 },
        ]}
      >
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          className="rounded-xl px-6 py-3"
          style={{ backgroundColor: colors.primary }}
          accessibilityRole="button"
        >
          <Text
            style={{
              color: colors.white,
              fontWeight: '700',
              fontSize: 16,
              textAlign: 'center',
              writingDirection: 'rtl',
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LoadingPanel({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[typography.body, { marginTop: 16, textAlign: 'center' }]}>
        {message}
      </Text>
    </View>
  );
}
