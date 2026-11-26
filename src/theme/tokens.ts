/**
 * Shuky design tokens. Single source of truth for colors, radii, spacing and type.
 * Mirrors the Figma "Shuky · מערכת עיצוב" page.
 */

export const colors = {
  /** The logo's red. Large brand text and the app icon only (3.7:1 on white: too light for small text). */
  brand: '#E05A3E',
  /** Primary: buttons, links, prices, active states. A deeper cherry so white text on it and
   *  cherry text on cream pass WCAG AA (4.5:1). */
  cherry: '#C6462C',
  cherryDark: '#AE3E27',
  cherryLight: '#FCE3DA',

  /** Fresh from the oven: "ready now", location, bakers. Golden crust brown. */
  crust: '#B8692A',
  crustDark: '#7E4416',
  crustLight: '#F7E4CC',

  /** XP, levels, ratings */
  honey: '#F2B33D',
  honeyDark: '#8A5A00',
  honeyLight: '#FCEBC2',

  /** Success: completed trades, saved changes, WhatsApp-adjacent actions */
  sage: '#457D53',
  sageDark: '#2F6140',
  sageLight: '#E2EFE2',

  /** App background: warm flour. Never use pure white for backgrounds. */
  cream: '#FFF8EE',
  /** A deeper dough tone for banners and image placeholders */
  dough: '#F8EAD6',
  /** Cards and inputs only */
  white: '#FFFFFF',

  /** Text: dark cocoa instead of grey-black */
  ink: '#3A2A22',
  muted: '#776759',
  line: '#EEDFCB',
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

/**
 * Rubik for reading text; Fredoka (rounded, warm, supports Hebrew) for headings,
 * prices and the logo, so screens feel like a neighborhood bakery.
 */
export const fonts = {
  regular: 'Rubik_400Regular',
  medium: 'Rubik_500Medium',
  semibold: 'Rubik_600SemiBold',
  bold: 'Rubik_700Bold',
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
} as const;

export type FontWeightName = keyof typeof fonts;

/** Type scale taken from the Figma frames. */
export const typography = {
  // Always pair big sizes with a lineHeight: iOS clips glyphs that are taller than the line.
  logo: { fontFamily: fonts.displayBold, fontSize: 56, lineHeight: 70 },
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 38 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 35 },
  heading: { fontFamily: fonts.display, fontSize: 21, lineHeight: 28 },
  tagline: { fontFamily: fonts.display, fontSize: 22, lineHeight: 31 },
  section: { fontFamily: fonts.display, fontSize: 19, lineHeight: 25 },
  price: { fontFamily: fonts.display, fontSize: 17, lineHeight: 22 },
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
