import { useMemo, useState } from 'react';
import { Search } from 'lucide-react-native';

import { AppText, CategoryChips, EmptyState, FeedList, Screen, SearchField, type FeedSection } from '@/components';
import type { CategoryFilter } from '@/data/categories';
import { filterListings } from '@/lib/search';
import { useAppStore } from '@/store/AppStore';
import { colors } from '@/theme';

/** חיפוש: all neighborhood listings with free-text + category filter. */
export default function SearchScreen() {
  const { feed } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const results = useMemo(() => filterListings(feed, query, category), [feed, query, category]);
  const sections = useMemo<FeedSection[]>(() => [{ key: 'results', listings: results }], [results]);

  return (
    <Screen edges={['top']}>
      <FeedList
        header={
          <>
            <AppText variant="heading" accessibilityRole="header">
              חיפוש בשכונה
            </AppText>
            <SearchField value={query} onChangeText={setQuery} placeholder="עוגת גבינה, חלה, רוגלך..." />
            <CategoryChips value={category} onChange={setCategory} />
            <AppText variant="small" color={colors.muted}>
              {results.length === 1 ? 'מאפה אחד' : `${results.length} מאפים`}
            </AppText>
          </>
        }
        sections={sections}
        empty={<EmptyState icon={Search} title="לא מצאנו משהו כזה בשכונה" message="נסו מילה אחרת או קטגוריה אחרת" />}
      />
    </Screen>
  );
}
