import { useNavigationState } from '@react-navigation/native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { getTabBarScrollClearance } from '@/navigation/tabBarInsets';

const MAIN_TAB_ROUTES = new Set([
  'Home',
  'Calendar',
  'Trivia',
  'Map',
  'Profile',
]);

export interface ScrollBottomInsetResult {
  scrollPaddingBottom: number;
  /** When true, bottom safe-area padding is handled by the tab bar. */
  excludeBottomSafeArea: boolean;
}

export function useScrollBottomInset(
  extraInset = 0,
): ScrollBottomInsetResult {
  const insets = useSafeAreaInsets();
  const isMainTabScreen = useNavigationState((state) => {
    const route = state?.routes[state.index ?? 0];
    return route?.name ? MAIN_TAB_ROUTES.has(route.name) : false;
  });

  if (isMainTabScreen) {
    const tabClearance =
      Platform.OS === 'web'
        ? getTabBarScrollClearance(insets.bottom)
        : spacing.lg;

    return {
      scrollPaddingBottom: tabClearance + extraInset,
      excludeBottomSafeArea: true,
    };
  }

  return {
    scrollPaddingBottom:
      Math.max(insets.bottom, spacing.md) + spacing.sm + extraInset,
    excludeBottomSafeArea: false,
  };
}
