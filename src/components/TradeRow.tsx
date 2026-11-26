import { Pressable, StyleSheet, View } from 'react-native';

import type { Trade } from '@/data/types';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { CategoryArt } from './CategoryArt';
import { Pill, type PillTone } from './Pill';

export function tradeStatus(trade: Trade): { label: string; tone: PillTone } {
  if (trade.completedAt) return trade.iRated ? { label: 'הושלמה', tone: 'sage' } : { label: 'דרגו', tone: 'honey' };
  if (!trade.iConfirmed) return { label: 'מחכה לאישור שלך', tone: 'cherry' };
  return { label: `מחכה ל${trade.otherName.split(' ')[0]}`, tone: 'neutral' };
}

/** One trade in "העסקאות שלי": what, with whom, and where it stands. */
export function TradeRow({ trade, onPress }: { trade: Trade; onPress: () => void }) {
  const status = tradeStatus(trade);
  const who = trade.role === 'buyer' ? `קנית מ${trade.otherName}` : `מכרת ל${trade.otherName}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trade.listingTitle}, ${who}, ${status.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.85 } : null]}
    >
      {trade.listingCategory ? (
        <CategoryArt category={trade.listingCategory} artSize={44} style={styles.art} />
      ) : (
        <View style={[styles.art, { backgroundColor: colors.cream }]} />
      )}
      <View style={styles.texts}>
        <AppText variant="cardTitle" numberOfLines={1}>
          {trade.listingTitle}
        </AppText>
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
          {who}
        </AppText>
      </View>
      <Pill label={status.label} tone={status.tone} size="sm" style={status.tone === 'neutral' ? styles.neutralPill : null} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  art: { width: 48, height: 48, borderRadius: radius.md },
  texts: { flex: 1, alignItems: 'flex-start', gap: 2 },
  neutralPill: { borderWidth: border.hairline, borderColor: colors.line },
});
