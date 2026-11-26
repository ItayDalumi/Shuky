import { memo, useMemo, type ReactElement } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem, type RefreshControlProps } from 'react-native';
import { router } from 'expo-router';

import type { Listing, Seller } from '@/data/types';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { ProductCard } from './ProductCard';
import { SectionHeader } from './SectionHeader';

export type FeedSection = {
  key: string;
  title?: string;
  /** Small line under the title */
  note?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  listings: Listing[];
};

type Item =
  | { type: 'section'; key: string; section: FeedSection; first: boolean }
  | { type: 'row'; key: string; listings: Listing[] };

export type FeedListProps = {
  /** Everything above the listings (greeting, search, chips). Scrolls with the list. */
  header?: ReactElement | null;
  sections: FeedSection[];
  /** Shown instead of the listings when every section is empty */
  empty?: ReactElement | null;
  refreshControl?: ReactElement<RefreshControlProps>;
};

/**
 * Virtualized two-column feed: only the rows near the screen are rendered, so a neighborhood
 * with hundreds of listings scrolls as smoothly as one with ten.
 */
export function FeedList({ header, sections, empty, refreshControl }: FeedListProps) {
  const items = useMemo(() => {
    const out: Item[] = [];
    sections
      .filter((s) => s.listings.length > 0)
      .forEach((section, i) => {
        if (section.title) out.push({ type: 'section', key: `s-${section.key}`, section, first: i === 0 });
        for (let j = 0; j < section.listings.length; j += 2) {
          const pair = section.listings.slice(j, j + 2);
          out.push({ type: 'row', key: `r-${section.key}-${pair.map((l) => l.id).join('-')}`, listings: pair });
        }
      });
    return out;
  }, [sections]);

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      ListHeaderComponent={header ? <View style={styles.header}>{header}</View> : undefined}
      ListEmptyComponent={empty ?? undefined}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const renderItem: ListRenderItem<Item> = ({ item }) =>
  item.type === 'section' ? <SectionTitle section={item.section} first={item.first} /> : <Row listings={item.listings} />;

function SectionTitle({ section, first }: { section: FeedSection; first: boolean }) {
  return (
    <View style={[styles.section, !first ? styles.sectionGap : null]}>
      <SectionHeader title={section.title ?? ''} actionLabel={section.actionLabel} onActionPress={section.onActionPress} />
      {section.note ? (
        <AppText variant="small" color={colors.muted}>
          {section.note}
        </AppText>
      ) : null}
    </View>
  );
}

function Row({ listings }: { listings: Listing[] }) {
  const { getSeller, user } = useAppStore();
  return (
    <View style={styles.row}>
      {listings.map((listing) => (
        <ProductCardLink
          key={listing.id}
          listing={listing}
          seller={getSeller(listing.sellerId)}
          isMine={listing.sellerId === user.id}
        />
      ))}
      {listings.length === 1 ? <View style={styles.spacer} /> : null}
    </View>
  );
}

/** A card that re-renders only when its listing or baker actually changes. */
export const ProductCardLink = memo(function ProductCardLink({
  listing,
  seller,
  isMine,
}: {
  listing: Listing;
  seller?: Seller;
  isMine?: boolean;
}) {
  return (
    <ProductCard listing={listing} seller={seller} isMine={isMine} onPress={() => router.push(`/product/${listing.id}`)} />
  );
});

const styles = StyleSheet.create({
  body: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  header: { gap: spacing.md, marginBottom: spacing.md },
  section: { gap: spacing.xs, marginBottom: spacing.md },
  sectionGap: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: 14, marginBottom: spacing.md },
  spacer: { flex: 1 },
});
