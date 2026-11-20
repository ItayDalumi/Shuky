import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

export type ScreenProps = PropsWithChildren<{
  /** Screens inside the tab navigator leave the bottom edge to the BottomNav */
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}>;

/** Cream, safe-area-aware screen container. */
export function Screen({ children, edges = ['top', 'bottom'], style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
});
