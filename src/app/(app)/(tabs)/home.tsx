import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, CakeSlice, MapPin, RefreshCw, Search, WifiOff } from 'lucide-react-native';

import {
  AppText,
  BakeryArt,
  Button,
  CategoryChips,
  EmptyState,
  IconButton,
  Pill,
  ProductGrid,
  Screen,
  SearchField,
  SectionHeader,
} from '@/components';
import type { CategoryFilter } from '@/data/categories';
import { greeting } from '@/lib/format';
import { filterListings } from '@/lib/search';
import { useAppStore } from '@/store/AppStore';
import { colors, radius, spacing } from '@/theme';

/** 05 · בית (פיד) */
export default function HomeScreen() {
  const { user, feed, unreadCount, feedLoading, feedError, refreshAll, mode } = useAppStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const listings = filterListings(feed, query, category);
  const filtering = query.trim().length > 0 || category !== 'all';
  const readyNow = listings.filter((l) => l.availability !== 'preorder');
  const preorder = listings.filter((l) => l.availability === 'preorder');
  const feedReady = feed.filter((l) => l.availability !== 'preorder').length;

  return (
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={feedLoading && feed.length > 0} onRefresh={refreshAll} tintColor={colors.cherry} />}
      >
        <View style={styles.header}>
          <View style={styles.greeting}>
            <AppText variant="heading" accessibilityRole="header">
              {`${greeting()}, ${user.name}`}
            </AppText>
            <View style={styles.location}>
              <MapPin size={15} color={colors.crust} strokeWidth={2} />
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

        {mode === 'demo' ? (
          <Pill tone="honey" label="מצב הדגמה · האופים, המאפים והדירוגים כאן לדוגמה בלבד" />
        ) : null}

        {feed.length > 0 ? (
          <View style={styles.banner}>
            <View style={styles.bannerText}>
              <AppText variant="heading" color={colors.crustDark}>
                מה יוצא היום מהתנור?
              </AppText>
              <AppText variant="small" color={colors.crustDark}>
                {bannerLine(feedReady, feed.length - feedReady)}
              </AppText>
            </View>
            <View style={styles.bannerArt}>
              <BakeryArt category="breads" size={92} background={colors.dough} />
            </View>
          </View>
        ) : null}

        <SearchField value={query} onChangeText={setQuery} />

        <CategoryChips value={category} onChange={setCategory} />

        {feedError && feed.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${feedError} לחצו כדי לנסות שוב`}
            onPress={refreshAll}
            style={styles.errorBar}
          >
            <WifiOff size={18} color={colors.cherryDark} strokeWidth={2} />
            <AppText variant="small" color={colors.cherryDark} style={styles.errorText} numberOfLines={2}>
              {feedError.split('\n')[0]}
            </AppText>
            <RefreshCw size={18} color={colors.cherryDark} strokeWidth={2} />
          </Pressable>
        ) : null}

        {feedLoading && feed.length === 0 ? (
          <ActivityIndicator color={colors.cherry} style={styles.loading} />
        ) : feedError && feed.length === 0 ? (
          <EmptyState
            icon={WifiOff}
            title="לא הצלחנו לטעון את הפיד"
            message={feedError}
            action={<Button label="נסו שוב" variant="secondary" onPress={refreshAll} />}
          />
        ) : listings.length > 0 && filtering ? (
          <>
            <SectionHeader title={listings.length === 1 ? 'מאפה אחד' : `${listings.length} מאפים`} />
            <ProductGrid listings={listings} />
          </>
        ) : listings.length > 0 ? (
          <>
            {readyNow.length > 0 ? (
              <>
                <SectionHeader title="טרי מהתנור" actionLabel="לכל המאפים" onActionPress={() => router.navigate('/search')} />
                <ProductGrid listings={readyNow} />
              </>
            ) : null}
            {preorder.length > 0 ? (
              <>
                <View style={styles.sectionGap} />
                <SectionHeader title="להזמנה מראש" />
                <AppText variant="small" color={colors.muted} style={styles.sectionNote}>
                  אופים במיוחד בשבילכם. מזמינים כמה ימים לפני.
                </AppText>
                <ProductGrid listings={preorder} />
              </>
            ) : null}
          </>
        ) : feed.length === 0 ? (
          <EmptyState
            icon={CakeSlice}
            art="cakes"
            title="עוד אין מאפים בשכונה"
            message="אופים משהו בבית? תהיו הראשונים לפרסם"
            action={<Button label="פרסום מאפה" onPress={() => router.push('/listing/new')} />}
          />
        ) : (
          <EmptyState icon={Search} title="לא מצאנו משהו כזה בשכונה" message="נסו מילה אחרת או קטגוריה אחרת" />
        )}
      </ScrollView>
    </Screen>
  );
}

function bannerLine(ready: number, preorder: number): string {
  const parts: string[] = [];
  if (ready > 0) parts.push(ready === 1 ? 'מאפה אחד מוכן עכשיו' : `${ready} מאפים מוכנים עכשיו`);
  if (preorder > 0) parts.push(preorder === 1 ? 'אחד להזמנה מראש' : `${preorder} להזמנה מראש`);
  return `${parts.join(' ו-')} אצל השכנים.`;
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
  loading: { marginTop: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingStart: spacing.lg,
    paddingEnd: spacing.xs,
    backgroundColor: colors.dough,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  bannerText: { flex: 1, gap: 2, alignItems: 'flex-start' },
  bannerArt: { marginVertical: -spacing.xs },
  sectionGap: { height: spacing.xs },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cherryLight,
    borderRadius: radius.lg,
  },
  errorText: { flex: 1 },
  sectionNote: { marginTop: -spacing.sm },
});
