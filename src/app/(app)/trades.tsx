import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Handshake } from 'lucide-react-native';

import { AppText, EmptyState, Screen, ScreenHeader, TradeRow } from '@/components';
import type { Trade } from '@/data/types';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/** העסקאות שלי: waiting for me, waiting for the other side, completed. */
export default function TradesScreen() {
  const { trades, refreshTrades } = useAppStore();

  useEffect(() => {
    refreshTrades().catch(() => {});
  }, [refreshTrades]);

  const forMe = trades.filter((t) => !t.completedAt && !t.iConfirmed);
  const waiting = trades.filter((t) => !t.completedAt && t.iConfirmed);
  const done = trades.filter((t) => t.completedAt);

  const section = (title: string, items: Trade[]) =>
    items.length > 0 ? (
      <View style={styles.section}>
        <AppText variant="label" color={colors.muted}>
          {title}
        </AppText>
        {items.map((t) => (
          <TradeRow key={t.id} trade={t} onPress={() => router.push(`/trade/${t.id}`)} />
        ))}
      </View>
    ) : null;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshTrades} tintColor={colors.cherry} />}
      >
        <ScreenHeader title="העסקאות שלי" fallback="/profile" />
        <AppText variant="small" color={colors.muted}>
          {`כל עסקה שני הצדדים מאשרים מזכה כל אחד ב-20 נקודות.`}
        </AppText>
        {trades.length === 0 ? (
          <EmptyState
            icon={Handshake}
            art="pastries"
            title="עוד אין עסקאות"
            message="קניתם משהו? בעמוד המאפה לחצו ״קניתי את זה״, והמוכר/ת יאשר/תאשר."
          />
        ) : (
          <>
            {section('מחכות לאישור שלך', forMe)}
            {section('מחכות לצד השני', waiting)}
            {section('הושלמו', done)}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  section: { gap: spacing.sm },
});
