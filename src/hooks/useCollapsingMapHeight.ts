import { useCallback } from 'react';
import { Dimensions } from 'react-native';
import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

const WINDOW_HEIGHT = Dimensions.get('window').height;

export const MAP_EXPANDED_HEIGHT = Math.round(WINDOW_HEIGHT * 0.45);
export const MAP_COLLAPSED_HEIGHT = Math.max(
  140,
  Math.round(WINDOW_HEIGHT * 0.18),
);

const MAP_COLLAPSE_RANGE = Math.max(
  1,
  MAP_EXPANDED_HEIGHT - MAP_COLLAPSED_HEIGHT,
);

export function useCollapsingMapHeight() {
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const mapWrapperStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, MAP_COLLAPSE_RANGE],
      [MAP_EXPANDED_HEIGHT, MAP_COLLAPSED_HEIGHT],
      Extrapolation.CLAMP,
    ),
    overflow: 'hidden' as const,
    width: '100%',
  }));

  const legendStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, MAP_COLLAPSE_RANGE * 0.45],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const expandMap = useCallback(() => {
    scrollY.value = 0;
  }, [scrollY]);

  return {
    expandedHeight: MAP_EXPANDED_HEIGHT,
    onScroll,
    expandMap,
    mapWrapperStyle,
    legendStyle,
  };
}
