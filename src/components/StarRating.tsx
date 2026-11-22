import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';

import { colors } from '@/theme';

export type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
};

/** 1-5 stars. Interactive when onChange is given. Fills from the start (right in RTL). */
export function StarRating({ value, onChange, size = 36 }: StarRatingProps) {
  return (
    <View style={styles.row} accessibilityRole={onChange ? 'adjustable' : 'image'} accessibilityLabel={`${value} מתוך 5 כוכבים`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            size={size}
            color={filled ? colors.honey : colors.line}
            fill={filled ? colors.honey : 'transparent'}
            strokeWidth={1.75}
          />
        );
        return onChange ? (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} כוכבים`} onPress={() => onChange(n)} hitSlop={4}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignSelf: 'center' },
});
