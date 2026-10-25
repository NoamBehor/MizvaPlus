import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { useParashaPodcastContext } from '@/context/ParashaPodcastContext';
import { TAB_BAR_CONTENT_HEIGHT } from '@/navigation/MainTabNavigator';
import {
  navigationRef,
  navigateToParashaPodcastPlayer,
} from '@/navigation/navigationRef';
import { formatPodcastDuration } from '@/utils/podcastFormat';

const MAIN_TAB_ROUTES = new Set([
  'Home',
  'Calendar',
  'Trivia',
  'Map',
  'Profile',
]);

function getFocusedRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined,
): string | undefined {
  if (!state) {
    return undefined;
  }

  const route = state.routes[state.index ?? 0];
  if (!route) {
    return undefined;
  }

  if (route.state) {
    return getFocusedRouteName(route.state);
  }

  return route.name;
}

function useMiniPlayerVisibility(): {
  isVisible: boolean;
  bottomOffset: number;
} {
  const insets = useSafeAreaInsets();
  const [routeName, setRouteName] = useState<string | undefined>();

  useEffect(() => {
    const updateRoute = () => {
      setRouteName(
        getFocusedRouteName(navigationRef.getRootState()) ??
          navigationRef.getCurrentRoute()?.name,
      );
    };

    updateRoute();

    if (!navigationRef.isReady()) {
      return;
    }

    const unsubscribe = navigationRef.addListener('state', updateRoute);
    return unsubscribe;
  }, []);

  const isOnFullPlayer = routeName === 'ParashaPodcastPlayer';
  const isOnMainTab = routeName ? MAIN_TAB_ROUTES.has(routeName) : false;
  const bottomOffset = isOnMainTab
    ? TAB_BAR_CONTENT_HEIGHT + Math.max(insets.bottom, 8)
    : Math.max(insets.bottom, 8);

  return {
    isVisible: isOnMainTab && !isOnFullPlayer,
    bottomOffset,
  };
}

export function ParashaPodcastMiniPlayer() {
  const podcast = useParashaPodcastContext();
  const { isVisible, bottomOffset } = useMiniPlayerVisibility();
  const {
    episode,
    hasActiveSession,
    isPlaying,
    positionSeconds,
    durationSeconds,
    togglePlayback,
  } = podcast;

  if (!isVisible || !episode || !hasActiveSession) {
    return null;
  }

  const playPauseLabel = isPlaying
    ? `השהה את פרק פרשת ${episode.hebrewTitle}`
    : `הפעל את פרק פרשת ${episode.hebrewTitle}`;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        bottom: bottomOffset,
        zIndex: 50,
      }}
    >
      <View
        className="flex-row items-center"
        style={{
          ...shadows.card,
          borderRadius: borderRadius.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
          minHeight: 56,
        }}
      >
        <Pressable
          onPress={togglePlayback}
          accessibilityRole="button"
          accessibilityLabel={playPauseLabel}
          accessibilityState={{ selected: isPlaying }}
          hitSlop={8}
          className="rounded-full items-center justify-center"
          style={{
            width: 40,
            height: 40,
            backgroundColor: colors.accent,
          }}
        >
          <Text style={[typography.label, { color: colors.white }]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </Pressable>

        <Pressable
          onPress={navigateToParashaPodcastPlayer}
          accessibilityRole="button"
          accessibilityLabel={`פתיחת נגן פרשת ${episode.hebrewTitle}`}
          style={{ flex: 1, alignItems: 'flex-start' }}
        >
          <Text style={typography.label} numberOfLines={1}>
            {episode.hebrewTitle}
          </Text>
        </Pressable>

        <Pressable
          onPress={navigateToParashaPodcastPlayer}
          accessibilityRole="button"
          accessibilityLabel={`פתיחת נגן פרשת ${episode.hebrewTitle}`}
        >
          <Text
            style={[
              typography.caption,
              { color: colors.muted, writingDirection: 'ltr' },
            ]}
          >
            {formatPodcastDuration(positionSeconds)} /{' '}
            {formatPodcastDuration(durationSeconds)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
