export const colors = {
  background: '#FAF8F5',
  surface: '#FFFFFF',
  primary: '#1B2A4A',
  secondary: '#3D5A80',
  accent: '#C9A227',
  text: '#1B2A4A',
  muted: '#8A8A8A',
  success: '#2D6A4F',
  border: '#E8E4DE',
  error: '#B00020',
  white: '#FFFFFF',
  /** Home canvas from the Stitch homepage. Other screens keep `background`. */
  canvas: '#F8F9FC',
  navy: '#0B1536',
  navyMid: '#142354',
  gold: '#FDE68A',
  goldDeep: '#D97706',
  /** Sacred Clarity reading roles. Shared by the prayer reader and related screens. */
  sacredCanvas: '#FBF9F5',
  sacredNavy: '#0F172A',
  sacredAmber: '#B45309',
  sacredAmberSoft: '#FFFBEB',
  sacredAmberBorder: '#FDE68A',
  sacredAmberText: '#92400E',
  sacredInk: '#1B1C1A',
  sacredSlate: '#45464D',
  sacredLine: '#E2E8F0',
  slate: '#1E293B',
  slateMuted: '#64748B',
} as const;

export type ColorKey = keyof typeof colors;
