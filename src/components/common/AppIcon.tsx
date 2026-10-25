import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const GLYPHS = {
  bell: 'bell-outline',
  settings: 'cog-outline',
  sliders: 'tune-variant',
  flame: 'fire',
  moon: 'weather-night',
  info: 'information-outline',
  star: 'star',
  clock: 'clock-outline',
  scroll: 'book-open-variant',
  chevronLeft: 'chevron-left',
  chevronRight: 'chevron-right',
  check: 'check',
  play: 'play',
  pause: 'pause',
  headphones: 'headphones',
  sparkles: 'star-four-points-outline',
  home: 'home-outline',
  homeFocused: 'home',
  mitzvot: 'check-circle-outline',
  mitzvotFocused: 'check-circle',
  calendar: 'calendar-month-outline',
  calendarFocused: 'calendar-month',
  trivia: 'brain',
  map: 'map-marker-outline',
  mapFocused: 'map-marker',
  profile: 'account-outline',
  profileFocused: 'account',
  logout: 'logout',
  pencil: 'pencil-outline',
  clipboardCheck: 'clipboard-check-outline',
} as const satisfies Record<string, GlyphName>;

export type AppIconName = keyof typeof GLYPHS;

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color: string;
}

/** Cross-platform stroke icons for Home and the tab bar. Hidden from screen readers. */
export function AppIcon({ name, size = 20, color }: AppIconProps) {
  return (
    <MaterialCommunityIcons
      name={GLYPHS[name]}
      size={size}
      color={color}
      importantForAccessibility="no"
      accessibilityElementsHidden
    />
  );
}

