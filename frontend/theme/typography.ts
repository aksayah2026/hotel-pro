// ============================================================
// TYPOGRAPHY SYSTEM
// ============================================================

export const fontFamily = {
  regular:    'System',
  medium:     'System',
  semiBold:   'System',
  bold:       'System',
  extraBold:  'System',
} as const;

export const fontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const fontWeight = {
  regular:   '400',
  medium:    '500',
  semiBold:  '600',
  bold:      '700',
  extraBold: '800',
} as const;

export const lineHeight = {
  tight:   1.2,
  normal:  1.5,
  relaxed: 1.75,
} as const;

export type FontSize   = typeof fontSize;
export type FontWeight = typeof fontWeight;
