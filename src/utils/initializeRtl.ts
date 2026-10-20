import { I18nManager } from 'react-native';

/**
 * Single global RTL initialization entry point (P10.5 RTL audit).
 * Must run once before any UI renders — called from index.ts only.
 *
 * On Android, the first switch to RTL may require a full app restart before
 * layout direction fully applies. Do not add runtime restart hacks.
 */
export function initializeRtl(): void {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
}
