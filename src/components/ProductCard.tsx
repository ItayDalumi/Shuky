import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarClock, Flame, Star } from 'lucide-react-native';

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

/**
 * Feed card. Photo (or illustration) with a freshness tag; title; the baker with
 * a rounded distance; price; and the baker's rating and level.
 */
export function ProductCard({ listing, seller, isMine, onPress }: ProductCardProps) {
  const preorder = listing.availability === 'preorder';
  const baked = daysAgo(listing.bakedAt ?? listing.createdAt);
  const bakerFirst = seller?.name.split(' ')[0];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}${bakerFirst ? `, אפוי אצל ${bakerFirst}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View>
        <CategoryArt category={listing.category} photoUri={listing.photoUri} artSize={100} style={styles.image} />
        <Pill
          size="sm"
          tone="solid"
          icon={preorder ? CalendarClock : Flame}
          iconColor={preorder ? colors.honeyDark : colors.cherry}
          label={preorder ? 'בהזמנה מראש' : `נאפה ${relativeDay(baked)}`}
          style={styles.badge}
        />
      </View>

      <View style={styles.info}>
        <AppText variant="cardTitle" numberOfLines={1}>
          {listing.title}
        </AppText>

        <View style={styles.row}>
          {isMine ? (
            <AppText variant="caption" color={colors.crustDark} numberOfLines={1}>
              המאפה שלך
            </AppText>
          ) : seller ? (
            <>
              <View style={styles.avatar}>
                <AppText variant="captionMedium" color={colors.crustDark} style={styles.avatarText}>
                  {seller.name.charAt(0)}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.muted} numberOfLines={1} style={styles.shrink}>
                {`${bakerFirst} · ${formatDistanceOrNearby(seller.distanceMeters)}`}
              </AppText>
            </>
          ) : null}
        </View>

        <View style={styles.bottom}>
          <AppText variant="price" color={colors.cherry} numberOfLines={1}>
            {formatPrice(listing.price)}
          </AppText>
          {seller ? (
            <View style={styles.row}>
              <View style={styles.row} accessibilityLabel={`דירוג ${formatRating(seller.rating)}`}>
                {seller.rating !== null ? <Star size={12} color={colors.honey} fill={colors.honey} /> : null}
                <AppText variant="captionMedium" color={colors.ink}>
                  {formatRating(seller.rating)}
                </AppText>
              </View>
              <Pill size="sm" tone="honey" label={`רמה ${seller.level}`} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 6,
    paddingBottom: 10,
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  image: {
    height: 124,
    borderRadius: radius.lg,
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    start: spacing.xs,
  },
  info: { gap: 5, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shrink: { flexShrink: 1 },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.crustLight,
  },
  avatarText: { fontSize: 10, lineHeight: 13 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
});
