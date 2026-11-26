import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { UserX } from 'lucide-react-native';

import { AppText, Button, EmptyState, Screen, ScreenHeader } from '@/components';
import { errorMessage } from '@/lib/api';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** Users I blocked, with "unblock". */
export default function BlockedScreen() {
  const { blockedUsers, refreshBlocks, unblockUser } = useAppStore();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshBlocks().catch(() => {});
  }, [refreshBlocks]);

  const unblock = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await unblockUser(id);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader title="משתמשים חסומים" fallback="/settings" />
        {error ? (
          <AppText variant="small" color={colors.cherryDark}>
            {error}
          </AppText>
        ) : null}
        {blockedUsers.length === 0 ? (
          <EmptyState icon={UserX} title="לא חסמת אף אחד" message="אפשר לחסום משתמש מעמוד של מאפה שלו" />
        ) : (
          blockedUsers.map((b) => (
            <View key={b.id} style={styles.row}>
              <AppText variant="bodyMedium" style={styles.name} numberOfLines={1}>
                {b.name}
              </AppText>
              <Button
                label="ביטול חסימה"
                variant="secondary"
                onPress={() => unblock(b.id)}
                loading={busyId === b.id}
                style={styles.button}
              />
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl, paddingHorizontal: spacing.screen },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  name: { flex: 1 },
  button: { minHeight: 44, paddingHorizontal: spacing.md },
});
