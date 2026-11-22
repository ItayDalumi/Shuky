import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, Handshake, MapPin, Plus, Settings, Trophy } from 'lucide-react-native';

import {
  AppText,
  Button,
  EmptyState,
  IconButton,
  ProductGrid,
  ProgressBar,
  Screen,
  SectionHeader,
} from '@/components';
import { getLevelInfo } from '@/lib/levels';
import { ltr } from '@/lib/rtl';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** 08 · פרופיל ורמה */
export default function ProfileScreen() {
  const { user, myListings, pendingForMe } = useAppStore();
  const level = getLevelInfo(user.xp);

  const stats = [
    { label: 'עסקאות', value: String(user.trades) },
    { label: 'דירוג', value: user.rating === null ? '—' : user.rating.toFixed(1) },
    { label: 'מוצרים פעילים', value: String(myListings.length) },
  ];

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.top}>
          <IconButton icon={Settings} accessibilityLabel="הגדרות" onPress={() => router.push('/settings')} />
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <AppText variant="logo" color={colors.tomato} style={styles.avatarLetter}>
              {user.name.charAt(0)}
            </AppText>
          </View>
          <AppText variant="heading" accessibilityRole="header">
            {user.name}
          </AppText>
          <View style={styles.location}>
            <MapPin size={15} color={colors.leaf} strokeWidth={2} />
            <AppText variant="small" color={colors.muted}>
              {user.community}
            </AppText>
          </View>
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View style={styles.levelTitle}>
              <Trophy size={22} color={colors.honeyDark} strokeWidth={2} />
              <AppText variant="section">{`רמה ${level.level} · ${level.title}`}</AppText>
            </View>
            {level.nextLevelXp ? (
              <View style={styles.xpPill}>
                <AppText variant="captionMedium" color={colors.honeyDark}>
                  {ltr(`${level.xp} / ${level.nextLevelXp} XP`)}
                </AppText>
              </View>
            ) : null}
          </View>
          <ProgressBar value={level.progress} />
          <AppText variant="caption" color={colors.honeyDark}>
            {level.nextLevelXp ? `עוד ${level.xpToNext} נקודות לרמה ${level.level + 1}` : 'הגעת לרמה הגבוהה ביותר!'}
          </AppText>
        </View>

        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <AppText variant="heading" center>
                {s.value}
              </AppText>
              <AppText variant="caption" color={colors.muted} center numberOfLines={1}>
                {s.label}
              </AppText>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pendingForMe > 0 ? `העסקאות שלי, ${pendingForMe} מחכות לאישור שלך` : 'העסקאות שלי'}
          onPress={() => router.push('/trades')}
          style={({ pressed }) => [styles.tradesRow, pressed ? { opacity: 0.85 } : null]}
        >
          <View style={styles.tradesIcon}>
            <Handshake size={20} color={colors.leafDark} strokeWidth={2} />
          </View>
          <View style={styles.tradesTexts}>
            <AppText variant="bodyMedium">העסקאות שלי</AppText>
            <AppText variant="caption" color={colors.muted}>
              אישורים, דירוגים והיסטוריה
            </AppText>
          </View>
          {pendingForMe > 0 ? (
            <View style={styles.badge}>
              <AppText variant="captionMedium" color={colors.white}>
                {pendingForMe}
              </AppText>
            </View>
          ) : null}
          <ChevronLeft size={20} color={colors.muted} />
        </Pressable>

        <SectionHeader title="המוצרים שלי" />

        {myListings.length > 0 ? (
          <ProductGrid listings={myListings} />
        ) : (
          <EmptyState
            icon={Plus}
            title="עוד אין לך מוצרים"
            message="יש לך עודף מהגינה או מהתנור? שתפו את השכנים"
            action={<Button label="הוספת מוצר" onPress={() => router.push('/listing/new')} />}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  profile: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tomatoLight,
  },
  avatarLetter: { fontSize: 36 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  levelCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.honeyLight,
    borderRadius: radius.xl,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  levelTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  xpPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
  },
  stats: { flexDirection: 'row', gap: 10 },
  tradesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  tradesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leafLight,
  },
  tradesTexts: { flex: 1, alignItems: 'flex-start', gap: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tomato,
  },
  stat: {
    flex: 1,
    gap: 2,
    paddingVertical: 15,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
});
