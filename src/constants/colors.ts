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
} as const;

export type ColorKey = keyof typeof colors;
