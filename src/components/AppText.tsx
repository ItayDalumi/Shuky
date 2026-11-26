import { Text, type TextProps } from 'react-native';

import { colors, fonts, typography, type FontWeightName, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  /** Override the variant's weight (maps to a Rubik font file, so it works on Android too) */
  weight?: FontWeightName;
  center?: boolean;
};

/**
 * Large system text sizes (iOS Dynamic Type, Android font size) scale all text. Body text may
 * grow freely; small labels inside fixed shapes (tabs, tags, chips, buttons) are capped so they
 * stay readable without breaking out of their pill.
 */
const MAX_SCALE: Partial<Record<TypographyVariant, number>> = {
  tab: 1.3,
  caption: 1.4,
  captionMedium: 1.4,
  label: 1.5,
  button: 1.5,
  cardTitle: 1.5,
  price: 1.5,
  logo: 1.2,
  display: 1.6,
  title: 1.6,
};

/** Text that always uses Rubik and the Shuky type scale. Alignment follows RTL naturally. */
export function AppText({ variant = 'body', color = colors.ink, weight, center, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_SCALE[variant]}
      {...rest}
      style={[
        typography[variant],
        { color },
        weight ? { fontFamily: fonts[weight] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
