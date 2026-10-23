import { I18nManager } from 'react-native';

/**
 * Single global RTL initialization entry point.
 * Must run once before any UI renders — called from index.ts only.
 *
 * allowRTL / forceRTL align native chrome (alerts, system back) with Hebrew.
 * The first switch on Android applies on the next full process start.
 *
 * swapLeftAndRightInRTL stays off so textAlign 'right' and borderRight
 * remain the visual right. Layout mirroring comes from direction: 'rtl'.
 */
export function initializeRtl(): void {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // Web's I18nManager does not implement this; calling it prevents the app from mounting.
  if (typeof I18nManager.swapLeftAndRightInRTL === 'function') {
    I18nManager.swapLeftAndRightInRTL(false);
  }
}
