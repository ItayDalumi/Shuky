/**
 * Shuky design tokens. Single source of truth for colors, radii, spacing and type.
 * Mirrors the Figma "Shuky · מערכת עיצוב" page.
 */

export const colors = {
  /** Primary: buttons, logo, active states */
  tomato: '#E85D3F',
  tomatoDark: '#B8432A',
  tomatoLight: '#FDE5DE',

  /** Freshness, location, success */
  leaf: '#4A9B5E',
  leafDark: '#2F6B3E',
  leafLight: '#E1F1E5',

  /** Baked goods, XP / levels */
  honey: '#F4B942',
  honeyDark: '#8A5A00',
  honeyLight: '#FCE7B8',

  /** App background. Never use pure white for backgrounds. */
  cream: '#FFF8EE',
  /** Cards and inputs only */
  white: '#FFFFFF',

  ink: '#2C2C2A',
  muted: '#7A766E',
  line: '#EDE3D3',
} as const;

export type ColorName = keyof typeof colors;

export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  /** Horizontal screen gutter */
  screen: 20,
} as const;

/** Thin borders only, no heavy shadows. */
export const border = {
  hairline: 1,
  input: 1.5,
} as const;

/** Rubik font family names, as registered by @expo-google-fonts/rubik. */
export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;

/** Type scale taken from the Figma frames. */
export const typography = {
  // Always pair big sizes with a lineHeight: iOS clips glyphs that are taller than the line.
  logo: { fontFamily: fonts.bold, fontSize: 56, lineHeight: 68 },
  display: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 39 },
  title: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 36 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  tagline: { fontFamily: fonts.medium, fontSize: 22, lineHeight: 31 },
  section: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 23 },
  button: { fontFamily: fonts.medium, fontSize: 17 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 15 },
  label: { fontFamily: fonts.medium, fontSize: 14 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  captionMedium: { fontFamily: fonts.medium, fontSize: 12 },
  tab: { fontFamily: fonts.regular, fontSize: 11 },
} as const;

export type TypographyVariant = keyof typeof typography;

/** Max width of the app column when running on a wide web viewport. */
export const WEB_MAX_WIDTH = 480;
