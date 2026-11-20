import { Text, type TextProps } from 'react-native';

import { colors, fonts, typography, type FontWeightName, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: string;
  /** Override the variant's weight (maps to a Rubik font file, so it works on Android too) */
  weight?: FontWeightName;
  center?: boolean;
};

/** Text that always uses Rubik and the Shuky type scale. Alignment follows RTL naturally. */
export function AppText({ variant = 'body', color = colors.ink, weight, center, style, ...rest }: AppTextProps) {
  return (
    <Text
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
