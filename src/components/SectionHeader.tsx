import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { AppText } from './AppText';

export type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

/** "טרי בשכונה ........ לכל המוצרים" */
export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="section">{title}</AppText>
      {actionLabel ? (
        <Pressable accessibilityRole="link" onPress={onActionPress} hitSlop={8} disabled={!onActionPress}>
          <AppText variant="label" color={colors.cherry}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
