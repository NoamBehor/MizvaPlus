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
  /** Overrides the default gold or success fill. */
  fillColor?: string;
  height?: number;
  accessibilityLabel?: string;
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
  fillColor: fillColorOverride,
  height,
  accessibilityLabel,
}: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const animatedWidth = useRef(new Animated.Value(clampedPercentage)).current;
  const isComplete = clampedPercentage === 100;
  const shouldShowPercentageLabel =
    showPercentageLabel ?? variant === 'default';
  const fillColor = fillColorOverride ?? (isComplete ? colors.success : colors.accent);
  const trackColor = variant === 'hero' ? homeStatCard.track : colors.border;
  const barHeight = height ?? BAR_HEIGHT[variant];

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
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: clampedPercentage,
        }}
        style={{
          height: barHeight,
          width: '100%',
          overflow: 'hidden',
          borderRadius: barHeight / 2,
          backgroundColor: trackColor,
          direction: 'ltr',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            width: widthInterpolation,
            borderRadius: barHeight / 2,
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
