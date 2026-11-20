import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Apple, Carrot, Cookie, Egg, type LucideIcon } from 'lucide-react-native';

import { AppText, Button, Screen } from '@/components';
import { colors, spacing, typography } from '@/theme';

type HeroItem = { Icon: LucideIcon; color: string; background: string };

// Each row is listed right to left (RTL). Matches the Figma hero.
const HERO_ROWS: HeroItem[][] = [
  [
    { Icon: Apple, color: colors.leaf, background: colors.leafLight },
    { Icon: Carrot, color: colors.tomatoDark, background: colors.tomatoLight },
  ],
  [
    { Icon: Egg, color: colors.honeyDark, background: colors.white },
    { Icon: Cookie, color: colors.honeyDark, background: colors.white },
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
              {row.map(({ Icon, color, background }, i) => (
                <View key={i} style={[styles.heroCircle, { backgroundColor: background }]}>
                  <Icon size={46} color={color} strokeWidth={1.5} />
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.gap} />

        <AppText accessibilityRole="header" style={styles.logo} center>
          Shuky
        </AppText>
        <AppText variant="tagline" center>
          מה שגדל ונאפה בשכונה שלך
        </AppText>
        <AppText variant="body" color={colors.muted} center>
          קונים, מוכרים ומחליפים ירקות, פירות ומאפים ביתיים עם השכנים
        </AppText>

        <View style={styles.spacer} />

        <Button label="בואו נתחיל" onPress={() => router.push('/phone')} />
        <Button
          label="כבר יש לי חשבון"
          variant="secondary"
          onPress={() => router.push({ pathname: '/phone', params: { mode: 'login' } })}
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
    backgroundColor: colors.honeyLight,
  },
  heroRow: { flexDirection: 'row', gap: 14 },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { ...typography.logo, color: colors.tomato },
});
