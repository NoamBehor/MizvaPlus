import { colors } from '@/constants/colors';
import { borderRadius, shadows, surfaces } from '@/constants/theme';

export const homeStatCard = {
  background: surfaces.statCard,
  backgroundAlt: surfaces.statCardAccent,
  border: 'rgba(232, 228, 222, 0.95)',
  mutedText: colors.muted,
  track: '#E8E4DE',
  radius: borderRadius.xl,
  shadow: shadows.statCard,
} as const;
