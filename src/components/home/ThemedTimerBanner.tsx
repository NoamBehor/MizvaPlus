import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import {
  getTimerContextChipLabel,
  getTimerTheme,
  type TimerDecorativeMode,
  type TimerThemeKey,
} from '@/constants/timerThemes';
import { formatCountdown } from '@/utils/time';

const HERO_MIN_HEIGHT = 200;

interface ThemedTimerBannerProps {
  heroLabel: string;
  title?: string;
  displayTime?: string;
  totalSeconds: number;
  themeKey: TimerThemeKey;
  isActiveFast?: boolean;
  fastProgress?: number | null;
  locationFootnote?: string | null;
}

const STAR_POSITIONS: Array<{
  top: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  size: number;
}> = [
  { top: '14%', left: '12%', size: 3 },
  { top: '22%', right: '16%', size: 2 },
  { top: '68%', left: '18%', size: 2 },
  { top: '74%', right: '12%', size: 3 },
  { top: '42%', left: '8%', size: 2 },
];

export function ThemedTimerBanner({
  heroLabel,
  title,
  displayTime,
  totalSeconds,
  themeKey,
  isActiveFast = false,
  fastProgress = null,
  locationFootnote = null,
}: ThemedTimerBannerProps) {
  const theme = getTimerTheme(themeKey, { isActiveFast });
  const contextChipLabel = getTimerContextChipLabel(themeKey);
  const progressDegrees =
    fastProgress !== null ? Math.round(fastProgress * 360) : 0;
  const countdownLabel = formatCountdown(totalSeconds);

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        shadows.hero,
        {
          borderRadius: borderRadius.xxl,
          minHeight: HERO_MIN_HEIGHT,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          overflow: 'hidden',
        },
      ]}
    >
      <TimerDecorations mode={theme.decorativeMode} accent={theme.accent} />

      {contextChipLabel ? (
        <View
          style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            paddingHorizontal: spacing.sm,
            paddingVertical: spacing.xs,
            borderRadius: borderRadius.full,
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            marginBottom: spacing.md,
          }}
        >
          {theme.icon ? (
            <Text style={{ fontSize: 13, opacity: 0.9 }}>{theme.icon}</Text>
          ) : null}
          <Text
            style={[
              typography.label,
              {
                color: theme.labelColor,
                fontSize: 12,
                textAlign: 'center',
                writingDirection: 'rtl',
              },
            ]}
          >
            {contextChipLabel}
          </Text>
        </View>
      ) : null}

      <Text
        accessibilityRole="header"
        style={[
          typography.subtitle,
          {
            color: theme.labelColor,
            textAlign: 'center',
            writingDirection: 'rtl',
            marginBottom: spacing.md,
            fontWeight: '600',
          },
        ]}
      >
        {heroLabel}
      </Text>

      {title && heroLabel !== title ? (
        <Text
          style={[
            typography.bodySmall,
            {
              color: theme.labelColor,
              textAlign: 'center',
              writingDirection: 'rtl',
              marginBottom: spacing.sm,
              opacity: 0.9,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <View
        className="items-center justify-center"
        style={{ alignSelf: 'stretch', flex: 1 }}
      >
        {isActiveFast && fastProgress !== null ? (
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              borderWidth: 4,
              borderColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 4,
                borderColor: theme.accent,
                borderTopColor: 'transparent',
                borderRightColor:
                  progressDegrees > 90 ? theme.accent : 'transparent',
                borderBottomColor:
                  progressDegrees > 180 ? theme.accent : 'transparent',
                borderLeftColor:
                  progressDegrees > 270 ? theme.accent : 'transparent',
                transform: [{ rotate: '-90deg' }],
              }}
            />
            <Text
              style={[
                typography.bodySmall,
                {
                  color: theme.labelColor,
                  fontSize: 11,
                  textAlign: 'center',
                },
              ]}
            >
              {Math.round(fastProgress * 100)}%
            </Text>
          </View>
        ) : null}

        <Text
          accessibilityRole="timer"
          accessibilityLabel={`זמן שנותר: ${countdownLabel}`}
          style={[
            typography.countdown,
            {
              color: theme.textColor,
              fontSize: 48,
              lineHeight: 54,
              letterSpacing: 2,
            },
          ]}
        >
          {countdownLabel}
        </Text>

        {displayTime ? (
          <Text
            style={[
              typography.body,
              {
                color: theme.labelColor,
                marginTop: spacing.sm,
                textAlign: 'center',
                writingDirection: 'rtl',
                fontWeight: '500',
              },
            ]}
          >
            {displayTime}
          </Text>
        ) : null}
      </View>

      {locationFootnote ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`מיקום לחישוב זמנים: ${locationFootnote}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            marginTop: spacing.lg,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.12)',
          }}
        >
          <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{ fontSize: 11, color: theme.labelColor, opacity: 0.85 }}
          >
            📍
          </Text>
          <Text
            style={[
              typography.caption,
              {
                color: theme.labelColor,
                textAlign: 'center',
                writingDirection: 'rtl',
                opacity: 0.9,
              },
            ]}
          >
            {locationFootnote}
          </Text>
        </View>
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
        shadows.hero,
        {
          borderRadius: borderRadius.xxl,
          minHeight: HERO_MIN_HEIGHT,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
          backgroundColor: '#1B2A4A',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="טוען טיימר"
    >
      <TimerSkeletonBlock width={72} height={24} style={{ borderRadius: borderRadius.full }} />
      <TimerSkeletonBlock width="55%" height={22} />
      <TimerSkeletonBlock width={180} height={48} style={{ marginVertical: spacing.sm }} />
      <TimerSkeletonBlock width="45%" height={18} />
      {showLocationLine ? (
        <TimerSkeletonBlock
          width="60%"
          height={12}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

interface TimerDecorationsProps {
  mode: TimerDecorativeMode;
  accent: string;
}

function TimerDecorations({ mode, accent }: TimerDecorationsProps) {
  if (mode === 'none') {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }}
    >
      {mode === 'candles' ? <CandleGlow accent={accent} /> : null}
      {mode === 'pomegranate' ? <FloatingMotif accent={accent} symbol="🍎" /> : null}
      {mode === 'harvest' ? <FloatingMotif accent={accent} symbol="🌿" /> : null}
      {mode === 'stars' ? <StarField accent={accent} /> : null}
    </View>
  );
}

function CandleGlow({ accent }: { accent: string }) {
  const glow = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 0.48,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0.28,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [glow]);

  return (
    <>
      <Animated.View
        style={{
          position: 'absolute',
          top: 18,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: accent,
          opacity: glow,
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 18,
          left: 24,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: accent,
          opacity: glow,
        }}
      />
      <Text style={{ position: 'absolute', top: 12, right: 30, fontSize: 18, opacity: 0.7 }}>
        🕯️
      </Text>
      <Text style={{ position: 'absolute', top: 12, left: 28, fontSize: 16, opacity: 0.7 }}>
        🕯️
      </Text>
    </>
  );
}

function FloatingMotif({ accent, symbol }: { accent: string; symbol: string }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [drift]);

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });

  return (
    <>
      <Animated.Text
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          fontSize: 20,
          opacity: 0.32,
          transform: [{ translateY }],
        }}
      >
        {symbol}
      </Animated.Text>
      <View
        style={{
          position: 'absolute',
          bottom: 18,
          left: 22,
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: accent,
          opacity: 0.18,
        }}
      />
    </>
  );
}

function StarField({ accent }: { accent: string }) {
  const twinkle = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, {
          toValue: 0.32,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(twinkle, {
          toValue: 0.1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [twinkle]);

  const stars = useMemo(
    () =>
      STAR_POSITIONS.map((star, index) => (
        <Animated.View
          key={`star-${index}`}
          style={{
            position: 'absolute',
            width: star.size,
            height: star.size,
            borderRadius: star.size,
            backgroundColor: accent,
            opacity: twinkle,
            top: star.top,
            left: star.left,
            right: star.right,
          }}
        />
      )),
    [accent, twinkle],
  );

  return <>{stars}</>;
}
