import { StyleSheet, View } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';

import type { Seller } from '@/data/types';
import { formatDistance, formatRating } from '@/lib/format';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Pill } from './Pill';

/** "האופה" card on the product page: avatar, name, level, rating, trades and rounded distance. */
export function SellerCard({ seller, isMine }: { seller: Seller; isMine?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <AppText variant="title" color={colors.crustDark}>
          {seller.name.charAt(0)}
        </AppText>
      </View>

      <View style={styles.info}>
        <AppText variant="caption" color={colors.muted}>
          {isMine ? 'האופה (את/ה)' : 'האופה'}
        </AppText>
        <View style={styles.nameRow}>
          <AppText variant="bodyMedium" numberOfLines={1} style={styles.shrink}>
            {seller.name}
          </AppText>
          <Pill size="sm" tone="honey" label={`רמה ${seller.level}`} />
        </View>
        <View style={styles.ratingRow}>
          {seller.rating !== null ? <Star size={13} color={colors.honey} fill={colors.honey} /> : null}
          <AppText variant="caption" color={colors.muted} numberOfLines={1}>
            {`${formatRating(seller.rating)} · ${seller.trades} עסקאות`}
          </AppText>
        </View>
      </View>

      {!isMine && seller.distanceMeters !== null ? (
        <View style={styles.distance} accessibilityLabel={`בערך ${formatDistance(seller.distanceMeters)} ממך`}>
          <MapPin size={18} color={colors.crust} strokeWidth={2} />
          <AppText variant="captionMedium" color={colors.crustDark}>
            {formatDistance(seller.distanceMeters)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.crustLight,
  },
  info: { flex: 1, alignItems: 'flex-start', gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distance: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.crustLight,
    borderRadius: radius.md,
  },
});
