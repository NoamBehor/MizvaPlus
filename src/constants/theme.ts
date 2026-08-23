import { StyleSheet } from 'react-native';

import { colors } from '@/constants/colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = StyleSheet.create({
  hero: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.muted,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  countdown: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

export const shadows = {
  card: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
