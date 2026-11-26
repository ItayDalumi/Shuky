import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppText, BakeryArt, Button, Screen } from '@/components';
import type { Category } from '@/data/types';
import { colors, spacing } from '@/theme';

type HeroItem = { category: Category; background: string };

// Each row is listed right to left (RTL).
const HERO_ROWS: HeroItem[][] = [
  [
    { category: 'cakes', background: colors.white },
    { category: 'pastries', background: colors.white },
  ],
  [
    { category: 'cookies', background: colors.white },
    { category: 'breads', background: colors.white },
  ],
];

/** 01 · פתיחה */
export default function WelcomeScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <View style={styles.spacer} />

        <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {HERO_ROWS.map((row, r) => (
            <View key={r} style={styles.heroRow}>
              {row.map(({ category, background }) => (
                <View key={category} style={[styles.heroCircle, { backgroundColor: background }]}>
                  <BakeryArt category={category} size={92} background={background} />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.gap} />

        <AppText variant="logo" color={colors.brand} accessibilityRole="header" center>
          Shuky
        </AppText>
        <AppText variant="heading" color={colors.crustDark} center style={styles.hebrewName}>
          שוקי
        </AppText>
        <AppText variant="tagline" center>
          מה שנאפה בשכונה שלך
        </AppText>
        <AppText variant="body" color={colors.muted} center>
          עוגות, עוגיות ומאפים ביתיים – ישר מהתנור של השכנים
        </AppText>

        <View style={styles.spacer} />

        <Button label="בואו נתחיל" onPress={() => router.push('/email')} />
        <Button
          label="כבר יש לי חשבון"
          variant="secondary"
          onPress={() => router.push({ pathname: '/email', params: { mode: 'login' } })}
        />
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
  gap: { height: spacing.md },
  hero: {
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.dough,
  },
  hebrewName: { marginTop: -spacing.md },
  heroRow: { flexDirection: 'row', gap: 14 },
  heroCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
