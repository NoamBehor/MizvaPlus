import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

/**
 * On web, React Navigation bottom tabs can keep inactive screens in the layout
 * stack, which blocks pointer events on the active tab. Hide inactive scenes on
 * web only; native relies on detachInactiveScreens + pointerEvents.
 */
export function TabScreenFocusGuard({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused();

  return (
    <View
      style={
        Platform.OS === 'web'
          ? {
              flex: 1,
              display: isFocused ? 'flex' : 'none',
            }
          : { flex: 1 }
      }
      pointerEvents={isFocused ? 'auto' : 'none'}
      accessibilityElementsHidden={!isFocused}
      importantForAccessibility={isFocused ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}
