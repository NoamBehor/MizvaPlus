import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/theme';

interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export function ProgressBar({ percentage, label }: ProgressBarProps) {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  const animatedWidth = useRef(new Animated.Value(clampedPercentage)).current;

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
        className="h-3 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: colors.border }}
      >
        <Animated.View
          className="h-full rounded-full"
          style={{
            width: widthInterpolation,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <Text style={typography.caption}>{clampedPercentage}%</Text>
    </View>
  );
}
