import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/theme';

interface PodcastSkeletonBlockProps {
  width?: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}

function PodcastSkeletonBlock({
  width = '100%',
  height,
  style,
}: PodcastSkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius.md,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PodcastCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        minHeight: 140,
        alignItems: 'flex-start',
        gap: spacing.sm,
      }}
    >
      <PodcastSkeletonBlock width={140} height={14} />
      <PodcastSkeletonBlock width="70%" height={24} />
      <PodcastSkeletonBlock width="100%" height={16} />
      <PodcastSkeletonBlock width="55%" height={16} />
      <PodcastSkeletonBlock width={110} height={12} style={{ marginTop: spacing.sm }} />
      <PodcastSkeletonBlock
        width={120}
        height={44}
        style={{ marginTop: spacing.md, alignSelf: 'center' }}
      />
    </View>
  );
}

export function PodcastHeroSkeleton() {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <PodcastSkeletonBlock
        width={160}
        height={160}
        style={{ borderRadius: borderRadius.xxl }}
      />
      <PodcastSkeletonBlock width={180} height={18} />
      <PodcastSkeletonBlock width="90%" height={14} />
      <PodcastSkeletonBlock width="75%" height={14} />
      <PodcastSkeletonBlock width={72} height={12} />
    </View>
  );
}

export function PodcastPlayerMetadataSkeleton() {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
      <PodcastSkeletonBlock width={100} height={16} />
      <PodcastSkeletonBlock width="100%" height={14} />
      <PodcastSkeletonBlock width="80%" height={14} />
      <PodcastSkeletonBlock width="60%" height={14} />
    </View>
  );
}
