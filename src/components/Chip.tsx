import { Pressable, StyleSheet } from 'react-native';

import { border, colors, radius } from '@/theme';
import { AppText } from './AppText';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

/** Pill-shaped filter / choice chip. */
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.default,
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <AppText variant="label" color={selected ? colors.white : colors.ink}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: border.hairline,
  },
  default: { backgroundColor: colors.white, borderColor: colors.line },
  selected: { backgroundColor: colors.cherry, borderColor: colors.cherry },
});
