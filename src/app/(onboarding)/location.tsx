import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Lock, MapPin } from 'lucide-react-native';

import { AppText, Button, Pill, Screen } from '@/components';
import { finishOnboarding } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

/**
 * 04 · מיקום. Phase 2: expo-location, store a fuzzed point, and only ever show
 * rounded distances to neighbors (PostGIS). Never the address.
 */
export default function LocationScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} bounces={false}>
        <View style={styles.spacer} />

        <View style={styles.outerCircle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.innerCircle}>
            <MapPin size={64} color={colors.white} strokeWidth={1.75} />
          </View>
        </View>

        <View style={styles.texts}>
          <AppText variant="display" center accessibilityRole="header">
            איפה הבית שלך?
          </AppText>
          <AppText variant="body" color={colors.muted} center>
            כדי להראות לך מה יש בסביבה. השכנים יראו רק מרחק משוער – אף פעם לא את הכתובת שלך.
          </AppText>
          <Pill label="המיקום שלך מוגן" icon={Lock} tone="leaf" style={styles.pill} />
        </View>

        <View style={styles.spacer} />

        <Button label="שיתוף מיקום משוער" onPress={() => finishOnboarding(router)} />
        <Button label="אולי אחר כך" variant="secondary" onPress={() => finishOnboarding(router)} />
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
    width: 210,
    height: 210,
    borderRadius: 105,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leafLight,
    marginBottom: spacing.sm,
  },
  innerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leaf,
  },
  texts: { gap: spacing.md },
  pill: { alignSelf: 'center' },
});
