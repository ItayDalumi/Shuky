import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';
import { AppText } from './AppText';

export type PillTone = 'leaf' | 'honey' | 'tomato' | 'neutral';

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  leaf: { bg: colors.leafLight, fg: colors.leafDark },
  honey: { bg: colors.honeyLight, fg: colors.honeyDark },
  tomato: { bg: colors.tomatoLight, fg: colors.tomatoDark },
  neutral: { bg: colors.white, fg: colors.ink },
};

export type PillProps = {
  label: string;
  tone?: PillTone;
  /** Icon at the start (right) of the label */
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

/** Small rounded tag: category, freshness, level, "המיקום שלך מוגן". */
export function Pill({ label, tone = 'neutral', icon: Icon, size = 'md', style }: PillProps) {
  const t = TONES[tone];
  const sm = size === 'sm';
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: t.bg, paddingHorizontal: sm ? 8 : 12, paddingVertical: sm ? 3 : 6 },
        style,
      ]}
    >
      {Icon ? <Icon size={sm ? 12 : 14} color={t.fg} strokeWidth={2} /> : null}
      <AppText variant="captionMedium" color={t.fg} style={sm ? { fontSize: 11 } : null}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: radius.pill,
  },
});
