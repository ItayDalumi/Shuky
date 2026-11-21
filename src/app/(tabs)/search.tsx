import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';

import { AppText, CategoryChips, EmptyState, ProductGrid, Screen, SearchField } from '@/components';
import type { CategoryFilter } from '@/data/categories';
import { filterListings } from '@/lib/search';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/** חיפוש: all neighborhood listings with free-text + category filter. */
export default function SearchScreen() {
  const { feed } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const results = filterListings(feed, query, category);

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <AppText variant="heading" accessibilityRole="header">
          חיפוש בשכונה
        </AppText>
        <SearchField value={query} onChangeText={setQuery} placeholder="עוגת גבינה, חלה, רוגלך..." />
        <CategoryChips value={category} onChange={setCategory} />

        <AppText variant="small" color={colors.muted}>
          {results.length === 1 ? 'מוצר אחד' : `${results.length} מוצרים`}
        </AppText>

        {results.length > 0 ? (
          <ProductGrid listings={results} />
        ) : (
          <EmptyState icon={Search} title="לא מצאנו משהו כזה בשכונה" message="נסו מילה אחרת או קטגוריה אחרת" />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
});
