import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

import { goBack } from '@/lib/navigation';
import { spacing } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export type ScreenHeaderProps = {
  title: string;
  /** Where "back" goes when there is no history (deep link) */
  fallback?: Href;
  /** Optional action at the end (left in RTL) */
  action?: ReactNode;
};

/** Header for pushed screens: back arrow and title at the start (right), optional action at the end. */
export function ScreenHeader({ title, fallback = '/home', action }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.start}>
        <IconButton icon={ArrowRight} accessibilityLabel="חזרה" onPress={() => goBack(router, fallback)} />
        <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  start: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});
