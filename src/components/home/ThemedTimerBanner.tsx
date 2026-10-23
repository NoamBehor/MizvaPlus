import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppIcon } from '@/components/common/AppIcon';
import { homeFontStyle, useHomeFonts } from '@/constants/homeFonts';
import { homeFonts, homeTheme } from '@/constants/homeTheme';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { ltrLayoutStyle } from '@/constants/layoutDirection';
import {
  getTimerTheme,
  type TimerDecorativeMode,
  type TimerThemeKey,
} from '@/constants/timerThemes';
import { formatCountdown } from '@/utils/time';

const HERO_MIN_HEIGHT = 220;

interface ThemedTimerBannerProps {
  heroLabel: string;
  title?: string;
  displayTime?: string;
  totalSeconds: number;
  themeKey: TimerThemeKey;
  isActiveFast?: boolean;
  fastProgress?: number | null;
  locationLine?: string | null;
  locationAccessibilityLabel?: string;
  onOpenLocation?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function ThemedTimerBanner({
  heroLabel,
  displayTime,
  totalSeconds,
  themeKey,
  isActiveFast = false,
  fastProgress = null,
  locationLine = null,
  locationAccessibilityLabel,
  onOpenLocation,
  actionLabel,
  onAction,
}: ThemedTimerBannerProps) {
  const fontsLoaded = useHomeFonts();
  const theme = getTimerTheme(themeKey, { isActiveFast });
  const countdownLabel = formatCountdown(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const minuteAnnouncement = `זמן שנותר ${hours} שעות ו-${minutes} דקות`;
  const progressDegrees =
    fastProgress !== null ? Math.round(fastProgress * 360) : 0;

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        homeTheme.heroShadow,
        {
          borderRadius: homeTheme.heroRadius,
          minHeight: HERO_MIN_HEIGHT,
          padding: spacing.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        },
      ]}
    >
      <TimerDecorations mode={theme.decorativeMode} accent={theme.accent} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: spacing.sm,
            paddingVertical: 6,
            borderRadius: borderRadius.full,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <AppIcon name="flame" size={14} color={theme.accent} />
          <Text
            numberOfLines={1}
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: theme.accent, flexShrink: 1 },
            ]}
          >
            {heroLabel}
          </Text>
        </View>
        {onOpenLocation ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="הגדרת זמני עיר"
            onPress={onOpenLocation}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppIcon name="sliders" size={16} color="rgba(255,255,255,0.75)" />
          </Pressable>
        ) : null}
      </View>

      {locationLine ? (
        <Text
          accessibilityRole="text"
          accessibilityLabel={locationAccessibilityLabel ?? locationLine}
          style={[
            typography.bodySmall,
            homeFontStyle(fontsLoaded, homeFonts.semibold),
            {
              color: theme.labelColor,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginTop: spacing.md,
            },
          ]}
        >
          {locationLine}
          {displayTime ? (
            <Text style={{ color: theme.textColor, fontVariant: ['tabular-nums'] }}>
              {` ${displayTime}`}
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View style={{ alignItems: 'center', marginVertical: spacing.md }}>
        {isActiveFast && fastProgress !== null ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 3,
              borderColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.sm,
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 28,
                borderWidth: 3,
                borderColor: theme.accent,
                borderTopColor: 'transparent',
                borderRightColor: progressDegrees > 90 ? theme.accent : 'transparent',
                borderBottomColor: progressDegrees > 180 ? theme.accent : 'transparent',
                borderLeftColor: progressDegrees > 270 ? theme.accent : 'transparent',
                transform: [{ rotate: '-90deg' }],
              }}
            />
            <Text style={[typography.caption, { color: theme.labelColor }]}>
              {Math.round(fastProgress * 100)}%
            </Text>
          </View>
        ) : null}

        <View style={ltrLayoutStyle}>
          <Text
            importantForAccessibility="no"
            style={[
              homeFontStyle(fontsLoaded, homeFonts.display),
              {
                color: theme.accent,
                fontSize: 48,
                lineHeight: 56,
                fontWeight: '800',
                textAlign: 'center',
                fontVariant: ['tabular-nums'],
              },
            ]}
          >
            {countdownLabel}
          </Text>
        </View>
        <Text
          accessibilityRole="timer"
          accessibilityLabel={minuteAnnouncement}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        >
          {minuteAnnouncement}
        </Text>
        <Text
          importantForAccessibility="no"
          style={[
            typography.caption,
            { color: theme.labelColor, marginTop: 4, textAlign: 'center' },
          ]}
        >
          שעות : דקות : שניות
        </Text>
      </View>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={{
            minHeight: 44,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
          }}
        >
          <AppIcon name="sparkles" size={16} color={theme.accent} />
          <Text
            style={[
              typography.caption,
              homeFontStyle(fontsLoaded, homeFonts.semibold),
              { color: theme.textColor },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

interface TimerHeroSkeletonProps {
  showLocationLine?: boolean;
}

function TimerSkeletonBlock({
  width,
  height,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  style?: object;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 1000,
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
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function TimerHeroSkeleton({
  showLocationLine = true,
}: TimerHeroSkeletonProps) {
  return (
    <View
      style={[
        homeTheme.heroShadow,
        {
          borderRadius: homeTheme.heroRadius,
          minHeight: HERO_MIN_HEIGHT,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          backgroundColor: homeTheme.navy,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="טוען טיימר"
    >
      <TimerSkeletonBlock width={140} height={24} style={{ borderRadius: borderRadius.full }} />
      <TimerSkeletonBlock width="55%" height={18} />
      <TimerSkeletonBlock width={180} height={48} />
      {showLocationLine ? <TimerSkeletonBlock width="40%" height={12} /> : null}
    </View>
  );
}

function TimerDecorations({
  mode,
  accent,
}: {
  mode: TimerDecorativeMode;
  accent: string;
}) {
  if (mode === 'none') {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -30,
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: 'rgba(59, 130, 246, 0.18)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -50,
          left: -20,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: accent,
          opacity: 0.12,
        }}
      />
    </View>
  );
}
