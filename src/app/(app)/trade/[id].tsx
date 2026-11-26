import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Handshake, Hourglass, PackageSearch, Trophy } from 'lucide-react-native';

import { AppText, Button, EmptyState, Input, ProgressBar, Screen, ScreenHeader, StarRating } from '@/components';
import type { Trade } from '@/data/types';
import { errorMessage } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { getLevelInfo, XP_PER_TRADE } from '@/lib/levels';
import { goBack } from '@/lib/navigation';
import { ltr } from '@/lib/rtl';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/**
 * 09 · עסקה. Three states:
 *  - the other side marked it and asks me to confirm
 *  - I confirmed, waiting for the other side
 *  - completed (both confirmed): +20 XP each, and a rating for the other side
 */
export default function TradeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTrade, refreshTrades } = useAppStore();
  const trade = id ? getTrade(id) : undefined;
  const [loading, setLoading] = useState(!trade);

  useEffect(() => {
    if (trade) return;
    refreshTrades()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trade, refreshTrades]);

  if (!trade) {
    return (
      <Screen>
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={colors.cherry} />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="העסקה הזו כבר לא קיימת"
              message="אולי היא בוטלה"
              action={<Button label="לעסקאות שלי" onPress={() => router.replace('/trades')} />}
            />
          )}
        </View>
      </Screen>
    );
  }

  if (trade.completedAt) return <Completed trade={trade} />;
  return <Pending trade={trade} />;
}

function Pending({ trade }: { trade: Trade }) {
  const { confirmTrade, declineTrade } = useAppStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = trade.otherName.split(' ')[0];
  const askingMe = !trade.iConfirmed;

  const run = async (action: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () =>
    confirmAction({
      title: askingMe ? 'זו לא עסקה שלך?' : 'לבטל את העסקה?',
      message: askingMe
        ? `העסקה תימחק, ו${first} יקבל/תקבל עדכון שלא אישרת.`
        : 'העסקה תימחק ולא יתקבלו עליה נקודות.',
      confirmLabel: 'ביטול העסקה',
      destructive: true,
      onConfirm: () => run(() => declineTrade(trade.id), () => goBack(router, '/trades')),
    });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader title="עסקה" fallback="/trades" />
        <View style={styles.spacer} />

        <View style={[styles.outerCircle, { backgroundColor: colors.honeyLight }]}>
          <View style={[styles.innerCircle, { backgroundColor: colors.honey }]}>
            {askingMe ? (
              <Handshake size={52} color={colors.white} strokeWidth={2} />
            ) : (
              <Hourglass size={52} color={colors.white} strokeWidth={2} />
            )}
          </View>
        </View>

        <View style={styles.texts}>
          <AppText variant="display" center accessibilityRole="header">
            {askingMe ? 'אישור עסקה' : `מחכים לאישור של ${first}`}
          </AppText>
          <AppText variant="body" color={colors.muted} center>
            {askingMe
              ? `${trade.otherName} ${trade.role === 'seller' ? 'סימן/ה שקנה/תה ממך' : 'סימן/ה שמכר/ה לך'} את ״${trade.listingTitle}״. זה נכון?`
              : `סימנת ש${trade.role === 'buyer' ? 'קנית' : 'מכרת'} את ״${trade.listingTitle}״. ברגע ש${first} יאשר/תאשר, שניכם תקבלו ${XP_PER_TRADE} נקודות.`}
          </AppText>
        </View>

        {error ? (
          <AppText variant="small" color={colors.cherryDark} center>
            {error}
          </AppText>
        ) : null}

        <View style={styles.spacer} />

        {askingMe ? (
          <>
            <Button label="כן, אישור" onPress={() => run(() => confirmTrade(trade.id))} loading={busy} />
            <Button label="זה לא נכון" variant="secondary" onPress={cancel} disabled={busy} />
          </>
        ) : (
          <>
            <Button label="חזרה" onPress={() => goBack(router, '/trades')} />
            <Button label="ביטול העסקה" variant="secondary" onPress={cancel} disabled={busy} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Completed({ trade }: { trade: Trade }) {
  const { user, rateTrade } = useAppStore();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = trade.otherName.split(' ')[0];

  // user.xp already includes this trade's XP (if any); animate from where it was.
  const after = getLevelInfo(user.xp);
  const before = getLevelInfo(Math.max(0, user.xp - (trade.xpAwarded ? XP_PER_TRADE : 0)));
  const target = after.nextLevelXp ?? after.xp;

  const sendRating = async () => {
    if (!stars || sending) return;
    setSending(true);
    setError(null);
    try {
      await rateTrade(trade.id, stars, comment);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.spacer} />

          <View style={styles.outerCircle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.innerCircle}>
              <Check size={56} color={colors.white} strokeWidth={2.5} />
            </View>
          </View>

          <View style={styles.texts}>
            <AppText variant="display" center accessibilityRole="header">
              העסקה הושלמה!
            </AppText>
            <AppText variant="body" color={colors.muted} center>
              {trade.role === 'buyer'
                ? `בתיאבון! תודה שקנית מ${first}, אופה מהשכונה.`
                : `כל הכבוד! עוד לקוח/ה מרוצה בשכונה.`}
            </AppText>
          </View>

          {trade.xpAwarded ? (
            <View style={styles.xpPill} accessibilityLabel={`קיבלת ${XP_PER_TRADE} נקודות ניסיון`}>
              <Trophy size={26} color={colors.honeyDark} strokeWidth={2} />
              <AppText variant="title" color={colors.honeyDark}>
                {ltr(`+${XP_PER_TRADE} XP`)}
              </AppText>
            </View>
          ) : (
            <AppText variant="small" color={colors.muted} center>
              {`העסקה נרשמה. נקודות ניתנות על עסקה אחת עם אותו שכן בשבוע, ועד 3 עסקאות ביום.`}
            </AppText>
          )}

          <View style={styles.card}>
            <View style={styles.progressRow}>
              <AppText variant="cardTitle">
                {after.nextLevelXp ? `בדרך לרמה ${after.level + 1}` : `רמה ${after.level}`}
              </AppText>
              <AppText variant="caption" color={colors.muted}>
                {ltr(`${after.xp} / ${target}`)}
              </AppText>
            </View>
            <ProgressBar
              value={after.progress}
              from={before.level === after.level ? before.progress : 0}
              trackColor={colors.honeyLight}
            />
          </View>

          {trade.iRated ? (
            <AppText variant="small" color={colors.sageDark} center>
              {`תודה על הדירוג! הוא עוזר לשכנים לבחור.`}
            </AppText>
          ) : !trade.canRate ? (
            <AppText variant="small" color={colors.muted} center>
              {`כבר דירגת את ${first} החודש. אפשר לדרג כל שכן פעם בחודש.`}
            </AppText>
          ) : (
            <View style={styles.card}>
              <AppText variant="cardTitle" center>
                {`איך היה עם ${first}?`}
              </AppText>
              <StarRating value={stars} onChange={setStars} />
              {stars > 0 ? (
                <>
                  <Input
                    placeholder="כמה מילים (לא חובה)"
                    value={comment}
                    onChangeText={setComment}
                    maxLength={200}
                    returnKeyType="send"
                    onSubmitEditing={sendRating}
                  />
                  {error ? (
                    <AppText variant="small" color={colors.cherryDark} center>
                      {error}
                    </AppText>
                  ) : null}
                  <Button label="שליחת דירוג" variant="sage" onPress={sendRating} loading={sending} />
                </>
              ) : null}
            </View>
          )}

          <View style={styles.spacer} />

          <Button label="חזרה לבית" onPress={() => router.dismissTo('/home')} />
          <Button label="לעסקאות שלי" variant="secondary" onPress={() => router.replace('/trades')} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  spacer: { flexGrow: 1, minHeight: spacing.xs },
  outerCircle: {
    alignSelf: 'center',
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageLight,
    marginBottom: spacing.xs,
  },
  innerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage,
  },
  texts: { gap: spacing.md },
  xpPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: 28,
    paddingVertical: spacing.sm,
    backgroundColor: colors.honeyLight,
    borderRadius: radius.pill,
  },
  card: {
    gap: spacing.sm,
    padding: 17,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
