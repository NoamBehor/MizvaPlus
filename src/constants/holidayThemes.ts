import type { HolidayThemeKey } from '@/types/event';

export interface HolidayTheme {
  key: HolidayThemeKey;
  heroGradient: [string, string];
  accent: string;
  textColor: string;
  labelColor: string;
  icon: string;
  backgroundTreatment: 'none' | 'warm' | 'calm' | 'natural' | 'clean';
}

const DEFAULT_THEME: HolidayTheme = {
  key: 'default',
  heroGradient: ['#1B2A4A', '#2D4A6F'],
  accent: '#C9A227',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.75)',
  icon: '✨',
  backgroundTreatment: 'none',
};

const SHABBAT_THEME: HolidayTheme = {
  key: 'shabbat',
  heroGradient: ['#1E1B4B', '#312E81'],
  accent: '#FDE047',
  textColor: '#FDE047',
  labelColor: 'rgba(253, 224, 71, 0.75)',
  icon: '🕯️',
  backgroundTreatment: 'calm',
};

const ROSH_HASHANAH_THEME: HolidayTheme = {
  key: 'rosh_hashanah',
  heroGradient: ['#4A3728', '#8B6914'],
  accent: '#D4AF37',
  textColor: '#FFF8E7',
  labelColor: 'rgba(255, 248, 231, 0.8)',
  icon: '🍎',
  backgroundTreatment: 'warm',
};

const YOM_KIPPUR_THEME: HolidayTheme = {
  key: 'yom_kippur',
  heroGradient: ['#E8E4DC', '#C9B896'],
  accent: '#8B7355',
  textColor: '#2C2C2C',
  labelColor: 'rgba(44, 44, 44, 0.7)',
  icon: '🕊️',
  backgroundTreatment: 'calm',
};

const SUKKOT_THEME: HolidayTheme = {
  key: 'sukkot',
  heroGradient: ['#2D4A3E', '#4A6741'],
  accent: '#A67C52',
  textColor: '#F5F0E8',
  labelColor: 'rgba(245, 240, 232, 0.8)',
  icon: '🌿',
  backgroundTreatment: 'natural',
};

const PESACH_THEME: HolidayTheme = {
  key: 'pesach',
  heroGradient: ['#1E3A5F', '#3D5A80'],
  accent: '#F5E6C8',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.8)',
  icon: '🫓',
  backgroundTreatment: 'clean',
};

const SHAVUOT_THEME: HolidayTheme = {
  key: 'shavuot',
  heroGradient: ['#2E4A6E', '#5A7A9E'],
  accent: '#E8D5B7',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.8)',
  icon: '🌸',
  backgroundTreatment: 'clean',
};

const HANUKKAH_THEME: HolidayTheme = {
  key: 'hanukkah',
  heroGradient: ['#1E3A5F', '#2563EB'],
  accent: '#FDE68A',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.8)',
  icon: '🕎',
  backgroundTreatment: 'warm',
};

const PURIM_THEME: HolidayTheme = {
  key: 'purim',
  heroGradient: ['#5B21B6', '#7C3AED'],
  accent: '#FDE68A',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.82)',
  icon: '🎭',
  backgroundTreatment: 'warm',
};

const SHUSHAN_PURIM_THEME: HolidayTheme = {
  key: 'shushan_purim',
  heroGradient: ['#4C1D95', '#6D28D9'],
  accent: '#FDE68A',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.82)',
  icon: '🏰',
  backgroundTreatment: 'warm',
};

const LAG_BAOMER_THEME: HolidayTheme = {
  key: 'lag_baomer',
  heroGradient: ['#7C2D12', '#B45309'],
  accent: '#FEF3C7',
  textColor: '#FFFBEB',
  labelColor: 'rgba(255, 251, 235, 0.82)',
  icon: '🔥',
  backgroundTreatment: 'warm',
};

const TU_BSHVAT_THEME: HolidayTheme = {
  key: 'tu_bshvat',
  heroGradient: ['#14532D', '#166534'],
  accent: '#BBF7D0',
  textColor: '#F0FDF4',
  labelColor: 'rgba(240, 253, 244, 0.82)',
  icon: '🌳',
  backgroundTreatment: 'natural',
};

const SHEMINI_ATZERET_THEME: HolidayTheme = {
  key: 'shemini_atzeret',
  heroGradient: ['#334155', '#475569'],
  accent: '#E2E8F0',
  textColor: '#F8FAFC',
  labelColor: 'rgba(248, 250, 252, 0.82)',
  icon: '📜',
  backgroundTreatment: 'calm',
};

const SIMCHAT_TORAH_THEME: HolidayTheme = {
  key: 'simchat_torah',
  heroGradient: ['#1E3A8A', '#2563EB'],
  accent: '#FDE68A',
  textColor: '#FFFFFF',
  labelColor: 'rgba(255, 255, 255, 0.82)',
  icon: '📖',
  backgroundTreatment: 'clean',
};

const FAST_THEME: HolidayTheme = {
  key: 'fast',
  heroGradient: ['#334155', '#78350F'],
  accent: '#FBBF24',
  textColor: '#FEF3C7',
  labelColor: 'rgba(254, 243, 199, 0.8)',
  icon: '🕯️',
  backgroundTreatment: 'calm',
};

const FAST_ACTIVE_THEME: HolidayTheme = {
  ...FAST_THEME,
  heroGradient: ['#475569', '#78350F'],
};

const THEMES: Record<HolidayThemeKey, HolidayTheme> = {
  default: DEFAULT_THEME,
  shabbat: SHABBAT_THEME,
  rosh_hashanah: ROSH_HASHANAH_THEME,
  yom_kippur: YOM_KIPPUR_THEME,
  sukkot: SUKKOT_THEME,
  shemini_atzeret: SHEMINI_ATZERET_THEME,
  simchat_torah: SIMCHAT_TORAH_THEME,
  pesach: PESACH_THEME,
  shavuot: SHAVUOT_THEME,
  purim: PURIM_THEME,
  shushan_purim: SHUSHAN_PURIM_THEME,
  hanukkah: HANUKKAH_THEME,
  lag_baomer: LAG_BAOMER_THEME,
  tu_bshvat: TU_BSHVAT_THEME,
  fast: FAST_THEME,
};

export function getHolidayTheme(
  themeKey: HolidayThemeKey,
  options?: { isActiveFast?: boolean },
): HolidayTheme {
  if (themeKey === 'fast' && options?.isActiveFast) {
    return FAST_ACTIVE_THEME;
  }

  return THEMES[themeKey] ?? DEFAULT_THEME;
}
