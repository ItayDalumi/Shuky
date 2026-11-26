import { StyleSheet, View } from 'react-native';
import { MapPin, Star } from 'lucide-react-native';

import type { Seller } from '@/data/types';
import { formatDistance, formatRating } from '@/lib/format';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

/** Seller summary on the product page: avatar, name, level, rating, rounded distance. */
export function SellerCard({ seller, isMine }: { seller: Seller; isMine?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <AppText variant="heading" color={colors.cherry}>
          {seller.name.charAt(0)}
        </AppText>
      </View>

      <View style={styles.info}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {isMine ? `${seller.name} (את/ה)` : seller.name}
        </AppText>
        <View style={styles.ratingRow}>
          <Star size={14} color={colors.honey} fill={colors.honey} />
          <AppText variant="caption" color={colors.muted} numberOfLines={1}>
            {`רמה ${seller.level} · ${seller.trades} עסקאות · ${formatRating(seller.rating)}`}
          </AppText>
        </View>
      </View>

      {!isMine && seller.distanceMeters !== null ? (
        <View style={styles.distance} accessibilityLabel={`בערך ${formatDistance(seller.distanceMeters)} ממך`}>
          <MapPin size={18} color={colors.sage} strokeWidth={2} />
          <AppText variant="caption" color={colors.muted}>
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
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cherryLight,
  },
  info: { flex: 1, alignItems: 'flex-start', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distance: { alignItems: 'center', gap: 2 },
});
