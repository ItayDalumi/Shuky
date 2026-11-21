import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarClock, Clock, MapPin, Star } from 'lucide-react-native';

import type { Listing, Seller } from '@/data/types';
import { daysAgo, formatDistanceOrNearby, formatPrice, formatRating, relativeDay } from '@/lib/format';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { CategoryArt } from './CategoryArt';
import { Pill } from './Pill';

export type ProductCardProps = {
  listing: Listing;
  seller?: Seller;
  /** The signed-in user's own listing */
  isMine?: boolean;
  onPress?: () => void;
};

/** Feed card: image + availability, title, rounded distance, price, seller rating and level. */
export function ProductCard({ listing, seller, isMine, onPress }: ProductCardProps) {
  const preorder = listing.availability === 'preorder';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.9 } : null]}
    >
      <View>
        <CategoryArt category={listing.category} photoUri={listing.photoUri} style={styles.image} />
        <Pill
          size="sm"
          tone={preorder ? 'honey' : 'leaf'}
          icon={preorder ? CalendarClock : Clock}
          label={preorder ? 'בהזמנה' : `נאפה ${relativeDay(daysAgo(listing.bakedAt ?? listing.createdAt))}`}
          style={styles.badge}
        />
      </View>

      <AppText variant="cardTitle" numberOfLines={1}>
        {listing.title}
      </AppText>

      <View style={styles.row}>
        <MapPin size={14} color={colors.leaf} strokeWidth={2} />
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
          {isMine ? 'המוצר שלך' : seller ? formatDistanceOrNearby(seller.distanceMeters, true) : ''}
        </AppText>
      </View>

      <View style={styles.bottom}>
        <AppText variant="bodyMedium" weight="bold" color={colors.tomato} numberOfLines={1}>
          {formatPrice(listing.price)}
        </AppText>
        {seller ? (
          <View style={styles.sellerMeta}>
            <View style={styles.row} accessibilityLabel={`דירוג ${formatRating(seller.rating)}`}>
              {seller.rating !== null ? <Star size={12} color={colors.honey} fill={colors.honey} /> : null}
              <AppText variant="captionMedium" color={colors.ink}>
                {formatRating(seller.rating)}
              </AppText>
            </View>
            <Pill size="sm" tone="leaf" label={`רמה ${seller.level}`} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
    padding: 10,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  image: {
    height: 112,
    borderRadius: radius.md,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    start: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
