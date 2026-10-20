import { colors } from '@/constants/colors';
import { borderRadius, spacing } from '@/constants/theme';

/** Shared visual tokens for splash → onboarding continuity. */
export const startupTheme = {
  background: colors.background,
  /** Deep leather-like cover — matched to startup book reference. */
  bookCover: '#6B3F28',
  bookCoverEdge: '#4A2818',
  bookSpine: '#4A2818',
  pagePaper: '#F3EDE3',
  pageSurface: '#FAF6EF',
  pageEdge: '#C8BFB2',
  accentLine: colors.accent,
  titleColor: colors.primary,
  subtitleColor: colors.secondary,
  headerBand: '#F5F0E8',
  headerBorder: '#DDD4C8',
  radius: borderRadius.lg,
  spacing,
} as const;
