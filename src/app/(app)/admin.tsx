import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CircleCheck, EyeOff, Lock, ShieldCheck, Undo2, UserX } from 'lucide-react-native';

import { AppText, CategoryArt, EmptyState, Pill, Screen, ScreenHeader } from '@/components';
import { REPORT_REASON_LABELS } from '@/data/categories';
import type { AdminReport, ModerationAction } from '@/data/types';
import { errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { relativeTime } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';


/** ניהול דיווחים: the operator reviews reports (hide / restore a listing, dismiss, suspend a user). */
export default function AdminScreen() {
  const { isAdmin, adminReports, refreshAdminReports } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshAdminReports();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [refreshAdminReports]);

  useEffect(() => {
    if (!isAdmin) return;
    refreshAdminReports().catch((e) => setError(errorMessage(e)));
  }, [isAdmin, refreshAdminReports]);

  if (!isAdmin) {
    return (
      <Screen>
        <View style={styles.body}>
          <ScreenHeader title="ניהול דיווחים" fallback="/settings" />
          <EmptyState icon={Lock} title="אין לך גישה למסך הזה" message="המסך מיועד למנהלי שוקי בלבד" />
        </View>
      </Screen>
    );
  }

  const open = adminReports.filter((r) => r.status === 'open');
  const closed = adminReports.filter((r) => r.status !== 'open');

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.cherry} />}
      >
        <ScreenHeader title="ניהול דיווחים" fallback="/settings" />
        <AppText variant="small" color={colors.muted}>
          כל דיווח חדש מגיע אליך כהתראה. כדאי לטפל תוך יממה.
        </AppText>

        {error ? (
          <AppText variant="small" color={colors.cherryDark}>
            {error}
          </AppText>
        ) : null}

        <AppText variant="section" accessibilityRole="header">
          {open.length > 0 ? `ממתינים לטיפול (${open.length})` : 'ממתינים לטיפול'}
        </AppText>
        {open.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="אין דיווחים פתוחים" message="הכל שקט בשכונה" />
        ) : (
          open.map((r) => <ReportCard key={r.id} report={r} />)
        )}

        {closed.length > 0 ? (
          <>
            <AppText variant="section" accessibilityRole="header" style={styles.closedTitle}>
              טופלו ב-30 הימים האחרונים
            </AppText>
            {closed.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ReportCard({ report: r }: { report: AdminReport }) {
  const { resolveReport, unsuspendUser } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOpen = r.status === 'open';

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const act = (action: ModerationAction) => run(() => resolveReport(r.id, action));

  const suspend = () =>
    confirmAction({
      title: `להשעות את ${r.reportedName}?`,
      message: 'כל המאפים שלו/ה יוסתרו, ולא יוכל/תוכל לפרסם עד שתבטל/י את ההשעיה.',
      confirmLabel: 'השעיה',
      destructive: true,
      onConfirm: () => act('suspend'),
    });

  return (
    <View style={[styles.card, !isOpen ? styles.cardClosed : null]}>
      <View style={styles.row}>
        <Pill size="sm" tone={isOpen ? 'cherry' : 'neutral'} label={REPORT_REASON_LABELS[r.reason]} />
        <AppText variant="caption" color={colors.muted}>
          {relativeTime(r.createdAt)}
        </AppText>
      </View>

      {r.listingId && r.listingCategory ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${r.listingTitle ?? ''}, ${r.listingActive ? 'מוצג' : 'מוסתר'}`}
          onPress={() => (r.listingActive ? router.push(`/product/${r.listingId}`) : undefined)}
          style={styles.listing}
        >
          <CategoryArt category={r.listingCategory} photoUri={r.listingPhotoUri} artSize={44} style={styles.thumb} />
          <View style={styles.listingText}>
            <AppText variant="cardTitle" numberOfLines={1}>
              {r.listingTitle ?? 'מאפה שנמחק'}
            </AppText>
            <View style={styles.row}>
              <Pill size="sm" tone={r.listingActive ? 'sage' : 'neutral'} label={r.listingActive ? 'מוצג' : 'מוסתר'} />
              {r.openOnTarget > 1 ? (
                <AppText variant="caption" color={colors.cherryDark}>
                  {`${r.openOnTarget} דיווחים פתוחים`}
                </AppText>
              ) : null}
            </View>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.people}>
        <AppText variant="small">
          {'על: '}
          <AppText variant="small" weight="medium">
            {r.reportedName}
          </AppText>
          {r.reportedSuspended ? ' · מושעה/ית' : ''}
        </AppText>
        <AppText variant="small" color={colors.muted}>
          {`דיווח/ה: ${r.reporterName}`}
        </AppText>
      </View>

      {r.details ? (
        <View style={styles.quote}>
          <AppText variant="small">{`״${r.details}״`}</AppText>
        </View>
      ) : null}

      {error ? (
        <AppText variant="small" color={colors.cherryDark}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.actions}>
        {isOpen && r.listingId && r.listingActive ? (
          <Action icon={EyeOff} label="הסתרת המאפה" tone="cherry" onPress={() => act('hide')} disabled={busy} />
        ) : null}
        {r.listingId && r.listingActive === false && !r.reportedSuspended ? (
          <Action icon={Undo2} label="החזרת המאפה" onPress={() => act('restore')} disabled={busy} />
        ) : null}
        {isOpen ? <Action icon={CircleCheck} label="הדיווח לא מוצדק" onPress={() => act('dismiss')} disabled={busy} /> : null}
        {isOpen && !r.reportedSuspended ? (
          <Action icon={UserX} label="השעיית המשתמש" tone="danger" onPress={suspend} disabled={busy} />
        ) : null}
        {r.reportedSuspended ? (
          <Action
            icon={Undo2}
            label="ביטול השעיה"
            onPress={() => run(() => unsuspendUser(r.reportedUserId))}
            disabled={busy}
          />
        ) : null}
      </View>
    </View>
  );
}

function Action({
  icon: Icon,
  label,
  onPress,
  disabled,
  tone = 'neutral',
}: {
  icon: typeof EyeOff;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'neutral' | 'cherry' | 'danger';
}) {
  const filled = tone === 'cherry';
  const color = filled ? colors.white : tone === 'danger' ? colors.cherryDark : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.action,
        filled ? styles.actionFilled : null,
        disabled ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      <Icon size={16} color={color} strokeWidth={2} />
      <AppText variant="label" color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  closedTitle: { marginTop: spacing.sm },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  cardClosed: { backgroundColor: colors.cream },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  listing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  listingText: { flex: 1, gap: 4, alignItems: 'flex-start' },
  people: { gap: 2, alignItems: 'flex-start' },
  quote: {
    padding: spacing.sm,
    backgroundColor: colors.dough,
    borderRadius: radius.md,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: border.hairline,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  actionFilled: { backgroundColor: colors.cherry, borderColor: colors.cherry },
});
