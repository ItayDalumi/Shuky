import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Bell, CakeSlice, CalendarClock, CircleCheck, Handshake, Star, Trophy, type LucideIcon } from 'lucide-react-native';

import { AppText, EmptyState, Screen, ScreenHeader } from '@/components';
import type { AppNotification, NotificationKind } from '@/data/types';
import { relativeTime } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

const KIND_STYLE: Record<NotificationKind, { Icon: LucideIcon; color: string; background: string }> = {
  tradeConfirm: { Icon: Handshake, color: colors.leafDark, background: colors.leafLight },
  tradeCompleted: { Icon: CircleCheck, color: colors.leafDark, background: colors.leafLight },
  newListing: { Icon: CakeSlice, color: colors.tomatoDark, background: colors.tomatoLight },
  rating: { Icon: Star, color: colors.honeyDark, background: colors.honeyLight },
  preorder: { Icon: CalendarClock, color: colors.honeyDark, background: colors.honeyLight },
  level: { Icon: Trophy, color: colors.honeyDark, background: colors.honeyLight },
};

/** התראות. Live: created by the server (trades, ratings, new bakes nearby, level-ups). */
export default function NotificationsScreen() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, refreshNotifications } =
    useAppStore();

  useEffect(() => {
    refreshNotifications().catch(() => {});
  }, [refreshNotifications]);

  const open = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.href) router.push(n.href as Href);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader
          title="התראות"
          action={
            unreadCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={markAllNotificationsRead} hitSlop={8}>
                <AppText variant="label" color={colors.tomato}>
                  סימון הכל כנקרא
                </AppText>
              </Pressable>
            ) : null
          }
        />

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="אין התראות חדשות" message="כשמשהו יקרה בשכונה, נעדכן אותך כאן" />
        ) : (
          <View style={styles.list}>
            {notifications.map((n) => {
              const { Icon, color, background } = KIND_STYLE[n.kind];
              return (
                <Pressable
                  key={n.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.read ? '' : 'חדש: '}${n.title}. ${n.body}`}
                  onPress={() => open(n)}
                  style={({ pressed }) => [
                    styles.item,
                    n.read ? null : styles.itemUnread,
                    pressed ? { opacity: 0.85 } : null,
                  ]}
                >
                  <View style={[styles.icon, { backgroundColor: background }]}>
                    <Icon size={20} color={color} strokeWidth={2} />
                  </View>
                  <View style={styles.texts}>
                    <AppText variant="cardTitle" weight={n.read ? 'medium' : 'bold'}>
                      {n.title}
                    </AppText>
                    <AppText variant="small" color={colors.muted}>
                      {n.body}
                    </AppText>
                    <AppText variant="caption" color={colors.muted}>
                      {relativeTime(n.createdAt)}
                    </AppText>
                  </View>
                  {n.read ? null : <View style={styles.dot} accessibilityElementsHidden />}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  list: { gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  itemUnread: { borderColor: colors.tomatoLight, backgroundColor: colors.white },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, alignItems: 'flex-start', gap: 3 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.tomato, marginTop: 6 },
});
