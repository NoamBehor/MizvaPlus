import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, spacing, typography } from '@/constants/theme';
import {
  PODCAST_PLAYBACK_SPEEDS,
  type PodcastPlaybackSpeed,
} from '@/types/podcast';

interface PodcastSpeedSelectorProps {
  speed: PodcastPlaybackSpeed;
  onSelectSpeed: (speed: PodcastPlaybackSpeed) => void;
  disabled?: boolean;
}

export function PodcastSpeedSelector({
  speed,
  onSelectSpeed,
  disabled = false,
}: PodcastSpeedSelectorProps) {
  return (
    <View>
      <Text style={[typography.label, { marginBottom: spacing.sm }]}>
        שינוי מהירות
      </Text>
      <View className="flex-row-reverse items-center gap-2">
        {PODCAST_PLAYBACK_SPEEDS.map((option) => {
          const isSelected = option === speed;
          const label = option === 1 ? '1x' : `${option}x`;

          return (
            <Pressable
              key={option}
              onPress={() => onSelectSpeed(option)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`שינוי מהירות ההשמעה ל-${label}`}
              accessibilityState={{ selected: isSelected }}
              className="rounded-xl px-4 py-2"
              style={{
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: isSelected ? colors.primary : colors.border,
                minHeight: 44,
                minWidth: 64,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <Text
                style={[
                  typography.label,
                  { color: isSelected ? colors.white : colors.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
