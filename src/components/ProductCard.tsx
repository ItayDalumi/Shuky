import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import type { Listing, Seller } from '@/data/types';
import { formatDistanceFromMe, formatPrice } from '@/lib/format';
import { border, colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { CategoryArt } from './CategoryArt';
import { Pill } from './Pill';

export type ProductCardProps = {
  listing: Listing;
  seller?: Seller;
  onPress?: () => void;
};

/** Feed card: image, title, rounded distance, price and seller level. */
export function ProductCard({ listing, seller, onPress }: ProductCardProps) {
  const isMine = seller?.id === 'me';
  const priceColor = listing.dealType === 'free' ? colors.leaf : colors.tomato;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.dealType, listing.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.9 } : null]}
    >
      <CategoryArt category={listing.category} photoUri={listing.photoUri} style={styles.image} />

      <AppText variant="cardTitle" numberOfLines={1}>
        {listing.title}
      </AppText>

      <View style={styles.row}>
        <MapPin size={14} color={colors.leaf} strokeWidth={2} />
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
          {isMine ? 'המוצר שלך' : seller ? formatDistanceFromMe(seller.distanceMeters) : ''}
        </AppText>
      </View>

      <View style={styles.bottom}>
        <AppText variant="bodyMedium" weight="bold" color={priceColor} numberOfLines={1}>
          {formatPrice(listing.dealType, listing.price)}
        </AppText>
        {seller ? <Pill size="sm" tone="leaf" label={`רמה ${seller.level}`} /> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
