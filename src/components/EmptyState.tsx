import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, spacing } from '@/theme';
import { AppText } from './AppText';

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Icon size={36} color={colors.cherry} strokeWidth={1.75} />
      </View>
      <AppText variant="section" center>
        {title}
      </AppText>
      {message ? (
        <AppText variant="small" color={colors.muted} center>
          {message}
        </AppText>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cherryLight,
    marginBottom: spacing.xs,
  },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
