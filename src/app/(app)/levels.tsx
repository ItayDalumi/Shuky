import { ScrollView, StyleSheet, View } from 'react-native';
import { CakeSlice, Check, Crown, Croissant, Flame, Lock, Trophy, Wheat, type LucideIcon } from 'lucide-react-native';

import { AppText, Pill, ProgressBar, Screen, ScreenHeader } from '@/components';
import { getLevelInfo, LEVELS, XP_PER_TRADE } from '@/lib/levels';
import { ltr } from '@/lib/rtl';
import { useAppStore } from '@/store/AppStore';
import { border, colors, radius, spacing } from '@/theme';

/** One icon per level, following the bakery theme: dough → rising → oven → golden → star. */
const LEVEL_ICONS: Record<number, LucideIcon> = { 1: Wheat, 2: CakeSlice, 3: Flame, 4: Croissant, 5: Crown };

const HOW_TO_EARN = [
  `כל עסקה ששני הצדדים מאשרים מזכה כל אחד ב-${XP_PER_TRADE} נקודות.`,
  'נקודות ניתנות על עסקה אחת עם אותו שכן בשבוע, ועד 3 עסקאות ביום.',
  'מוכרים וקונים צוברים נקודות באותה צורה.',
];

/** הרמות שלי: what you've reached and what's ahead. Opened from the level card on the profile. */
export default function LevelsScreen() {
  const { user } = useAppStore();
  const info = getLevelInfo(user.xp);
  const CurrentIcon = LEVEL_ICONS[info.level] ?? Trophy;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader title="הרמות שלי" fallback="/profile" />

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <CurrentIcon size={40} color={colors.honeyDark} strokeWidth={1.75} />
          </View>
          <AppText variant="caption" color={colors.honeyDark}>
            הרמה שלך
          </AppText>
          <AppText variant="title" accessibilityRole="header" center>
            {`רמה ${info.level} · ${info.title}`}
          </AppText>
          <AppText variant="bodyMedium" color={colors.honeyDark}>
            {ltr(info.nextLevelXp ? `${info.xp} / ${info.nextLevelXp} XP` : `${info.xp} XP`)}
          </AppText>
          <ProgressBar
            value={info.progress}
            style={styles.heroBar}
            accessibilityLabel={info.nextLevelXp ? `התקדמות לרמה ${info.level + 1}` : `רמה ${info.level}, הרמה הגבוהה ביותר`}
          />
          <AppText variant="small" color={colors.honeyDark} center>
            {info.nextLevelXp
              ? `עוד ${info.xpToNext} נקודות לרמה ${info.level + 1}, בערך ${Math.ceil(info.xpToNext / XP_PER_TRADE)} עסקאות`
              : 'הגעת לרמה הגבוהה ביותר. כל הכבוד!'}
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText variant="section">איך צוברים נקודות</AppText>
          {HOW_TO_EARN.map((line) => (
            <View key={line} style={styles.tip}>
              <View style={styles.bullet} />
              <AppText variant="callout" style={styles.flex}>
                {line}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="section">כל הרמות</AppText>
        <View>
          {LEVELS.map((level, i) => {
            const Icon = LEVEL_ICONS[level.level] ?? Trophy;
            const reached = info.level >= level.level;
            const current = info.level === level.level;
            const missing = Math.max(0, level.minXp - user.xp);
            const last = i === LEVELS.length - 1;
            return (
              <View
                key={level.level}
                style={styles.step}
                accessibilityLabel={`רמה ${level.level}, ${level.title}. ${
                  current ? 'הרמה הנוכחית שלך' : reached ? 'הושגה' : `חסרות ${missing} נקודות`
                }`}
              >
                <View style={styles.rail}>
                  <View
                    style={[
                      styles.node,
                      reached ? styles.nodeReached : styles.nodeLocked,
                      current ? styles.nodeCurrent : null,
                    ]}
                  >
                    <Icon size={24} color={reached ? colors.honeyDark : colors.muted} strokeWidth={1.75} />
                    {reached && !current ? (
                      <View style={styles.check}>
                        <Check size={11} color={colors.white} strokeWidth={3} />
                      </View>
                    ) : null}
                  </View>
                  {!last ? (
                    <View style={[styles.line, info.level > level.level ? styles.lineReached : null]} />
                  ) : null}
                </View>

                <View style={[styles.stepCard, current ? styles.stepCardCurrent : null]}>
                  <View style={styles.stepTop}>
                    <AppText variant="bodyMedium" color={reached ? colors.ink : colors.muted} style={styles.flex}>
                      {`רמה ${level.level} · ${level.title}`}
                    </AppText>
                    {current ? (
                      <Pill size="sm" tone="cherry" label="את/ה כאן" />
                    ) : !reached ? (
                      <Lock size={16} color={colors.muted} />
                    ) : null}
                  </View>
                  <AppText variant="caption" color={colors.muted}>
                    {level.description}
                  </AppText>
                  <AppText variant="captionMedium" color={reached ? colors.sageDark : colors.honeyDark}>
                    {level.minXp === 0
                      ? 'מההתחלה'
                      : reached
                        ? `הושגה · מ-${ltr(`${level.minXp} XP`)}`
                        : `עוד ${missing} נקודות (מ-${ltr(`${level.minXp} XP`)})`}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const NODE = 52;

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xxl, paddingHorizontal: spacing.screen },
  flex: { flex: 1 },
  hero: {
    alignItems: 'center',
    gap: 6,
    padding: spacing.lg,
    backgroundColor: colors.honeyLight,
    borderRadius: radius.xl,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    marginBottom: 4,
  },
  heroBar: { alignSelf: 'stretch', marginVertical: 6 },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.xl,
  },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.honey, marginTop: 9 },
  step: { flexDirection: 'row', gap: spacing.sm },
  rail: { width: NODE, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nodeReached: { backgroundColor: colors.honeyLight, borderColor: colors.honey },
  nodeLocked: { backgroundColor: colors.white, borderColor: colors.line },
  nodeCurrent: { borderColor: colors.cherry, borderWidth: 3 },
  check: {
    position: 'absolute',
    bottom: -2,
    start: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage,
    borderWidth: 2,
    borderColor: colors.cream,
  },
  line: { flex: 1, width: 3, minHeight: 18, backgroundColor: colors.line, marginVertical: 2, borderRadius: 2 },
  lineReached: { backgroundColor: colors.honey },
  stepCard: {
    flex: 1,
    gap: 4,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  stepCardCurrent: { borderColor: colors.cherry, borderWidth: 1.5 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
