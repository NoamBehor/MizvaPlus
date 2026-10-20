import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { homeStatCard } from '@/constants/homeTheme';
import { typography } from '@/constants/theme';

type ProgressBarVariant = 'default' | 'hero';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  variant?: ProgressBarVariant;
  showPercentageLabel?: boolean;
}

const BAR_HEIGHT: Record<ProgressBarVariant, number> = {
  default: 12,
  hero: 16,
};

export function ProgressBar({
  percentage,
  label,
  variant = 'default',
  showPercentageLabel,
}: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const animatedWidth = useRef(new Animated.Value(clampedPercentage)).current;
  const isComplete = clampedPercentage === 100;
  const shouldShowPercentageLabel =
    showPercentageLabel ?? variant === 'default';
  const fillColor = isComplete ? colors.success : colors.accent;
  const trackColor = variant === 'hero' ? homeStatCard.track : colors.border;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedPercentage,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clampedPercentage, animatedWidth]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="gap-2">
      {label ? <Text style={typography.bodySmall}>{label}</Text> : null}
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: clampedPercentage,
        }}
        style={{
          height: BAR_HEIGHT[variant],
          width: '100%',
          overflow: 'hidden',
          borderRadius: BAR_HEIGHT[variant] / 2,
          backgroundColor: trackColor,
          direction: 'ltr',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            width: widthInterpolation,
            borderRadius: BAR_HEIGHT[variant] / 2,
            backgroundColor: fillColor,
          }}
        />
      </View>
      {shouldShowPercentageLabel ? (
        <Text style={typography.caption}>{clampedPercentage}%</Text>
      ) : null}
    </View>
  );
}
