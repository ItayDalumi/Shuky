import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, MapPin, Search } from 'lucide-react-native';

import {
  AppText,
  CategoryChips,
  EmptyState,
  IconButton,
  ProductGrid,
  Screen,
  SearchField,
  SectionHeader,
} from '@/components';
import type { CategoryFilter } from '@/data/categories';
import { greeting } from '@/lib/format';
import { filterListings } from '@/lib/search';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/** 05 · בית (פיד) */
export default function HomeScreen() {
  const { user, feed, unreadCount } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const listings = filterListings(feed, query, category);

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.greeting}>
            <AppText variant="heading" accessibilityRole="header">
              {`${greeting()}, ${user.name}`}
            </AppText>
            <View style={styles.location}>
              <MapPin size={15} color={colors.leaf} strokeWidth={2} />
              <AppText variant="small" color={colors.muted}>
                {user.community}
              </AppText>
            </View>
          </View>
          <IconButton
            icon={Bell}
            accessibilityLabel={unreadCount > 0 ? `התראות, ${unreadCount} חדשות` : 'התראות'}
            size={46}
            iconSize={22}
            badge={unreadCount > 0}
            onPress={() => router.push('/notifications')}
          />
        </View>

        <SearchField value={query} onChangeText={setQuery} />

        <CategoryChips value={category} onChange={setCategory} />

        <SectionHeader title="טרי מהתנור" actionLabel="לכל המוצרים" onActionPress={() => router.navigate('/search')} />

        {listings.length > 0 ? (
          <ProductGrid listings={listings} />
        ) : (
          <EmptyState
            icon={Search}
            title="לא מצאנו משהו כזה בשכונה"
            message="נסו מילה אחרת או קטגוריה אחרת"
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: { alignItems: 'flex-start', gap: 2 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
