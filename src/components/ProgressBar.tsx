import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

export type ProgressBarProps = {
  /** 0..1 */
  value: number;
  /** Animate from this value on mount (e.g. XP before the trade) */
  from?: number;
  trackColor?: string;
  fillColor?: string;
  height?: number;
  /** What the bar measures, for screen readers (e.g. "התקדמות לרמה 4") */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** XP progress bar. Fills from the right (start) in RTL. */
export function ProgressBar({
  value,
  from,
  trackColor = colors.white,
  fillColor = colors.honey,
  height = 10,
  accessibilityLabel = 'התקדמות',
  style,
}: ProgressBarProps) {
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const [anim] = useState(() => new Animated.Value(clamp(from ?? value)));

  useEffect(() => {
    let cancelled = false;
    // Respect "Reduce Motion": jump straight to the new value.
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) anim.setValue(clamp(value));
        else
          Animated.timing(anim, {
            toValue: clamp(value),
            duration: 900,
            delay: from !== undefined ? 300 : 0,
            useNativeDriver: false,
          }).start();
      });
    return () => {
      cancelled = true;
    };
  }, [anim, value, from]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}
    >
      <Animated.View style={{ width, height, borderRadius: height / 2, backgroundColor: fillColor }} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
});
