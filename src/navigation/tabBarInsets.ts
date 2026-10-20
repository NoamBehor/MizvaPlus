import { TAB_BAR_CONTENT_HEIGHT } from '@/navigation/MainTabNavigator';
import { spacing } from '@/constants/theme';

const TAB_BAR_PADDING_TOP = 8;

/** Bottom padding inside the tab bar (matches MainTabNavigator). */
export function getTabBarBottomPadding(bottomSafeInset: number): number {
  return Math.max(bottomSafeInset, spacing.sm);
}

/** Total rendered height of the bottom tab bar. */
export function getTabBarTotalHeight(bottomSafeInset: number): number {
  return (
    TAB_BAR_CONTENT_HEIGHT +
    TAB_BAR_PADDING_TOP +
    getTabBarBottomPadding(bottomSafeInset)
  );
}

/**
 * Extra scroll padding so the last card clears the tab bar region on layouts
 * where tab content can sit behind the bar (notably web previews).
 */
export function getTabBarScrollClearance(
  bottomSafeInset: number,
  breathingRoom = spacing.sm,
): number {
  return getTabBarTotalHeight(bottomSafeInset) + breathingRoom;
}
