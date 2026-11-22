import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Check, Trophy } from 'lucide-react-native';

import { AppText, Button, ProgressBar, Screen } from '@/components';
import { getLevelInfo, XP_PER_TRADE } from '@/lib/levels';
import { ltr } from '@/lib/rtl';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/**
 * 09 · עסקה הושלמה.
 * Phase 3: this screen is shown only after BOTH sides confirmed the trade,
 * which is when the server awards +20 XP to each of them.
 */
export default function TradeCompletedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, getListing, getSeller } = useAppStore();

  const listing = id ? getListing(id) : undefined;
  const seller = listing ? getSeller(listing.sellerId) : undefined;
  const firstName = seller?.name.split(' ')[0];

  // Static preview of the XP gain (no persistence in Phase 1).
  const before = getLevelInfo(user.xp);
  const after = getLevelInfo(user.xp + XP_PER_TRADE);
  const target = after.nextLevelXp ?? after.xp;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} bounces={false}>
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
            {firstName ? `בתיאבון! תודה שקנית מ${firstName}, אופה מהשכונה.` : 'בתיאבון! תודה שקנית מאופה מהשכונה.'}
          </AppText>
        </View>

        <View style={styles.xpPill} accessibilityLabel={`קיבלת ${XP_PER_TRADE} נקודות ניסיון`}>
          <Trophy size={26} color={colors.honeyDark} strokeWidth={2} />
          <AppText variant="title" color={colors.honeyDark}>
            {ltr(`+${XP_PER_TRADE} XP`)}
          </AppText>
        </View>

        <View style={styles.progressCard}>
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

        <View style={styles.spacer} />

        <Button label="חזרה לבית" onPress={() => router.dismissTo('/home')} />
        <Button label="לפרופיל שלי" variant="secondary" onPress={() => router.dismissTo('/profile')} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: 40,
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
    backgroundColor: colors.leafLight,
    marginBottom: spacing.xs,
  },
  innerCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leaf,
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
  progressCard: {
    gap: spacing.sm,
    padding: 17,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
