import { useFonts } from 'expo-font';
import type { TextStyle } from 'react-native';

import { homeFonts } from '@/constants/homeTheme';

/**
 * Assistant and Rubik for Home and the tab labels.
 * Until these load, text uses the platform font.
 */
export function useHomeFonts(): boolean {
  const [loaded] = useFonts({
    [homeFonts.regular]: require('../../assets/fonts/Assistant-Regular.ttf'),
    [homeFonts.semibold]: require('../../assets/fonts/Assistant-SemiBold.ttf'),
    [homeFonts.bold]: require('../../assets/fonts/Assistant-Bold.ttf'),
    [homeFonts.extrabold]: require('../../assets/fonts/Assistant-ExtraBold.ttf'),
    [homeFonts.display]: require('../../assets/fonts/Rubik-Bold.ttf'),
  });

  return loaded;
}

export function homeFontStyle(loaded: boolean, family: string): TextStyle {
  if (!loaded) {
    return {};
  }

  return { fontFamily: family };
}
