import { useCallback, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { borderRadius, typography } from '@/constants/theme';
import { formatPodcastDuration } from '@/utils/podcastFormat';
import { sanitizePodcastSeconds } from '@/utils/podcastResume';

interface PodcastProgressBarProps {
  positionSeconds: number;
  durationSeconds: number;
  onSeek: (positionSeconds: number) => void;
  disabled?: boolean;
}

export function PodcastProgressBar({
  positionSeconds,
  durationSeconds,
  onSeek,
  disabled = false,
}: PodcastProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragPosition, setDragPosition] = useState<number | null>(null);

  const safeDuration = sanitizePodcastSeconds(durationSeconds);
  const safePosition = sanitizePodcastSeconds(positionSeconds);
  const displayPosition =
    dragPosition ?? safePosition;
  const progressRatio =
    safeDuration > 0
      ? Math.min(1, Math.max(0, displayPosition / safeDuration))
      : 0;

  const handleSeek = useCallback(
    (locationX: number, commit = true) => {
      if (disabled || safeDuration <= 0 || trackWidth <= 0) {
        return;
      }

      const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
      const nextPosition = ratio * safeDuration;

      if (commit) {
        setDragPosition(null);
        onSeek(nextPosition);
        return;
      }

      setDragPosition(nextPosition);
    },
    [disabled, onSeek, safeDuration, trackWidth],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && safeDuration > 0,
      onMoveShouldSetPanResponder: () => !disabled && safeDuration > 0,
      onPanResponderGrant: (event) => {
        handleSeek(event.nativeEvent.locationX, false);
      },
      onPanResponderMove: (event) => {
        handleSeek(event.nativeEvent.locationX, false);
      },
      onPanResponderRelease: (event) => {
        handleSeek(event.nativeEvent.locationX, true);
      },
      onPanResponderTerminate: (event) => {
        handleSeek(event.nativeEvent.locationX, true);
      },
    }),
  ).current;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text
          style={[
            typography.caption,
            { color: colors.muted, writingDirection: 'ltr' },
          ]}
        >
          {formatPodcastDuration(safeDuration)}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.muted, writingDirection: 'ltr' },
          ]}
        >
          {formatPodcastDuration(displayPosition)}
        </Text>
      </View>

      <View
        onLayout={(event) => {
          setTrackWidth(event.nativeEvent.layout.width);
        }}
        accessibilityRole="adjustable"
        accessibilityLabel="סרגל התקדמות"
        accessibilityValue={{
          min: 0,
          max: safeDuration,
          now: displayPosition,
          text: `${formatPodcastDuration(displayPosition)} מתוך ${formatPodcastDuration(safeDuration)}`,
        }}
        style={{ paddingVertical: 10 }}
        {...panResponder.panHandlers}
      >
        <View
          style={{
            height: 4,
            borderRadius: borderRadius.full,
            backgroundColor: colors.border,
            overflow: 'hidden',
            direction: 'ltr',
          }}
        >
          <View
            style={{
              width: `${progressRatio * 100}%`,
              height: 4,
              backgroundColor: colors.accent,
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 6,
            left: `${progressRatio * 100}%`,
            width: 16,
            height: 16,
            marginLeft: -8,
            borderRadius: borderRadius.full,
            backgroundColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.white,
          }}
        />
      </View>
    </View>
  );
}
