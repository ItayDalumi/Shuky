import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { border, colors } from '@/theme';

export type IconButtonProps = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  color?: string;
  /** Fill the icon (e.g. a saved heart) */
  filled?: boolean;
  /** Small cherry notification dot */
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Round white button with a thin border: back, close, bell, settings, save. */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  size = 44,
  iconSize = 20,
  color = colors.ink,
  filled,
  badge,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        pressed ? { opacity: 0.8 } : null,
        style,
      ]}
    >
      <Icon size={iconSize} color={color} fill={filled ? color : 'transparent'} strokeWidth={2} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
  },
  badge: {
    position: 'absolute',
    top: 10,
    // Logical side: "start" is the right edge in RTL, matching the design.
    start: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.cherry,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
});
