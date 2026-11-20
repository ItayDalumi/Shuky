import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'leaf';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Rendered at the start (right in RTL) of the label, e.g. the WhatsApp glyph */
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const VARIANTS: Record<ButtonVariant, { container: ViewStyle; text: string }> = {
  primary: { container: { backgroundColor: colors.tomato }, text: colors.white },
  secondary: {
    container: { backgroundColor: colors.white, borderWidth: border.input, borderColor: colors.tomato },
    text: colors.tomato,
  },
  leaf: { container: { backgroundColor: colors.leaf }, text: colors.white },
};

export function Button({ label, onPress, variant = 'primary', icon, disabled, style, accessibilityLabel }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        <AppText variant="button" color={v.text} numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
