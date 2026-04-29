import { palette } from './colors';
import { spacing, radius } from './spacing';
import { fontSize, fontWeight, fontFamily } from './typography';

// ============================================================
// LIGHT THEME
// ============================================================
const lightColors = {
  // Background layers
  background:        palette.neutral50,
  backgroundSecondary: palette.neutral100,
  surface:           palette.neutral0,
  surfaceElevated:   palette.neutral0,
  overlay:           'rgba(15, 23, 42, 0.5)',

  // Brand
  primary:           palette.primary600,
  primaryLight:      palette.primary50,
  primaryMuted:      palette.primary100,
  primaryDark:       palette.primary800,
  accent:            palette.accent500,

  // Text
  textPrimary:       palette.neutral900,
  textSecondary:     palette.neutral600,
  textMuted:         palette.neutral400,
  textInverse:       palette.neutral0,
  textOnPrimary:     palette.neutral0,

  // Borders
  border:            palette.neutral200,
  borderFocused:     palette.primary500,
  divider:           palette.neutral100,

  // Semantic
  success:           palette.success500,
  successBg:         palette.success50,
  warning:           palette.warning500,
  warningBg:         palette.warning50,
  error:             palette.error500,
  errorBg:           palette.error50,
  info:              palette.info500,
  infoBg:            palette.info50,

  // Status (rooms)
  available:         palette.success500,
  availableBg:       palette.success50,
  occupied:          palette.error500,
  occupiedBg:        palette.error50,
  cleaning:          palette.warning500,
  cleaningBg:        palette.warning50,

  // Payment status
  paid:              palette.success600,
  paidBg:            palette.success50,
  partial:           palette.warning600,
  partialBg:         palette.warning50,
  pending:           palette.error600,
  pendingBg:         palette.error50,

  // Card shadow
  shadowColor:       palette.neutral900,

  // Tab bar
  tabActive:         palette.primary600,
  tabInactive:       palette.neutral400,
  tabBackground:     palette.neutral0,
  neutral:           palette.neutral500,
};

const darkColors: typeof lightColors = {
  background:        palette.neutral950,
  backgroundSecondary: palette.neutral900,
  surface:           palette.neutral800,
  surfaceElevated:   palette.neutral700,
  overlay:           'rgba(0, 0, 0, 0.7)',

  primary:           palette.primary400,
  primaryLight:      palette.primary900,
  primaryMuted:      palette.primary800,
  primaryDark:       palette.primary200,
  accent:            palette.accent400,

  textPrimary:       palette.neutral50,
  textSecondary:     palette.neutral300,
  textMuted:         palette.neutral500,
  textInverse:       palette.neutral900,
  textOnPrimary:     palette.neutral0,

  border:            palette.neutral700,
  borderFocused:     palette.primary400,
  divider:           palette.neutral800,

  success:           palette.success500,
  successBg:         'rgba(34,197,94,0.15)',
  warning:           palette.warning400,
  warningBg:         'rgba(251,191,36,0.15)',
  error:             palette.error500,
  errorBg:           'rgba(239,68,68,0.15)',
  info:              palette.info500,
  infoBg:            'rgba(59,130,246,0.15)',

  available:         palette.success500,
  availableBg:       'rgba(34,197,94,0.15)',
  occupied:          palette.error500,
  occupiedBg:        'rgba(239,68,68,0.15)',
  cleaning:          palette.warning400,
  cleaningBg:        'rgba(251,191,36,0.15)',

  paid:              palette.success500,
  paidBg:            'rgba(34,197,94,0.15)',
  partial:           palette.warning400,
  partialBg:         'rgba(251,191,36,0.15)',
  pending:           palette.error500,
  pendingBg:         'rgba(239,68,68,0.15)',

  shadowColor:       palette.neutral950,

  tabActive:         palette.primary400,
  tabInactive:       palette.neutral600,
  tabBackground:     palette.neutral900,
  neutral:           palette.neutral500,
};

// ============================================================
// THEME OBJECT
// ============================================================
const makeTheme = (colors: typeof lightColors) => ({
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  fontFamily,

  // Pre-built shadow styles
  shadow: {
    sm: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: colors.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
});

export const lightTheme = makeTheme(lightColors);
export const darkTheme  = makeTheme(darkColors);

export type AppTheme = ReturnType<typeof makeTheme>;
export type ThemeColors = typeof lightColors;
