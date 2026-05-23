export const DarkColors = {
  background: '#0d0f14',
  card: '#13161e',
  cardLight: '#1e2230',
  textPrimary: '#f2f2f2',
  textMuted: '#8b90a0',
  accentBlue: '#2d6ef6',
  accentGreen: '#63ff4e',
  border: '#a9a9a9',
  borderLight: '#2a2e3d',
};

export const LightColors = {
  background: '#f0f2f5',
  card: '#ffffff',
  cardLight: '#e4e8f0',
  textPrimary: '#0d0f14',
  textMuted: '#6b7280',
  accentBlue: '#2d6ef6',
  accentGreen: '#16a34a',
  border: '#d1d5db',
  borderLight: '#e5e7eb',
};

export type ColorScheme = typeof DarkColors;

// Kept for backward-compat with module-level constants that can't use hooks
export const Colors = DarkColors;

export const FontFamily = {
  mono: 'DMMono_500Medium',
  sansRegular: 'DMSans_400Regular',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
  displayMedium: 'Syne_500Medium',
  displayBold: 'Syne_700Bold',
};

export const FontSize = {
  xs: 8,
  sm: 10,
  md: 12,
  base: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
};

export const Radius = {
  sm: 10,
  md: 18,
  lg: 20,
};

export const Shadow = {
  card: {
    shadowColor: '#8c8c8c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
};
