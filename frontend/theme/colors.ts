// ============================================================
// CENTRALIZED COLOR SYSTEM — NO HARDCODED COLORS ANYWHERE ELSE
// ============================================================

export const palette = {
  // Brand
  primary50:  '#EEF2FF',
  primary100: '#E0E7FF',
  primary200: '#C7D2FE',
  primary300: '#A5B4FC',
  primary400: '#818CF8',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary800: '#3730A3',
  primary900: '#312E81',

  // Accent / Teal
  accent400:  '#2DD4BF',
  accent500:  '#14B8A6',
  accent600:  '#0D9488',

  // Neutral
  neutral0:   '#FFFFFF',
  neutral50:  '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',
  neutral950: '#020617',

  // Semantic
  success50:  '#F0FDF4',
  success500: '#22C55E',
  success600: '#16A34A',
  success700: '#15803D',

  warning50:  '#FFFBEB',
  warning400: '#FBBF24',
  warning500: '#F59E0B',
  warning600: '#D97706',

  error50:    '#FFF1F2',
  error500:   '#EF4444',
  error600:   '#DC2626',
  error700:   '#B91C1C',

  info50:     '#EFF6FF',
  info500:    '#3B82F6',
  info600:    '#2563EB',
};

export type ColorPalette = typeof palette;
