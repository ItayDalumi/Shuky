import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { Listing } from '@/data/types';
import { useAppStore } from '@/store/AppStore';
import { spacing } from '@/theme';
import { ProductCard } from './ProductCard';

/** Two-column grid of product cards (fills right to left). */
export function ProductGrid({ listings }: { listings: Listing[] }) {
  const { getSeller } = useAppStore();

  const rows: Listing[][] = [];
  for (let i = 0; i < listings.length; i += 2) rows.push(listings.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row.map((l) => l.id).join('-')} style={styles.row}>
          {row.map((listing) => (
            <ProductCard
              key={listing.id}
              listing={listing}
              seller={getSeller(listing.sellerId)}
              onPress={() => router.push(`/product/${listing.id}`)}
            />
          ))}
          {row.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.md },
  row: { flexDirection: 'row', gap: 14 },
  spacer: { flex: 1 },
});
