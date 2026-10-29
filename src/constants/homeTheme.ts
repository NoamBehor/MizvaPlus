import { colors } from '@/constants/colors';
import { borderRadius, shadows } from '@/constants/theme';

export const homeStatCard = {
  background: colors.surface,
  backgroundAlt: '#FFF7ED',
  border: 'rgba(226, 232, 240, 0.9)',
  mutedText: colors.slateMuted,
  track: '#F1F5F9',
  radius: borderRadius.lg,
  shadow: shadows.statCard,
} as const;

/** Visual tokens for the Stitch homepage. Screens outside Home keep the app theme. */
export const homeTheme = {
  canvas: colors.canvas,
  surface: colors.surface,
  navy: colors.navy,
  text: colors.slate,
  muted: colors.slateMuted,
  primary: '#1D4ED8',
  primarySoft: '#F0F5FF',
  primaryBorder: '#BFDBFE',
  gold: colors.gold,
  goldDeep: colors.goldDeep,
  goldSoft: '#FFFBEB',
  goldBorder: '#FDE68A',
  success: '#10B981',
  successSoft: '#ECFDF5',
  successText: '#047857',
  danger: '#F43F5E',
  heroRadius: 32,
  cardRadius: 16,
  controlRadius: 16,
  sectionGap: 20,
  cardShadow: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  heroShadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  /** Primary explanation action. Matches the existing primary blue. */
  actionGlow: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
} as const;

export const homeFonts = {
  regular: 'Assistant_400',
  semibold: 'Assistant_600',
  bold: 'Assistant_700',
  extrabold: 'Assistant_800',
  display: 'Rubik_700',
} as const;
