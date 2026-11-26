import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Lock, MapPin } from 'lucide-react-native';

import { AppText, Button, Pill, Screen } from '@/components';
import { errorMessage } from '@/lib/api';
import { finishOnboarding } from '@/lib/navigation';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/**
 * 04 · מיקום. Gets a low-accuracy position, rounds it on the phone, and the server snaps it
 * to a ~100 m grid. Neighbors only ever see a rounded distance, never the address.
 */
export default function LocationScreen() {
  const { mode, saveLocation } = useAppStore();
  const [working, setWorking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const share = async () => {
    if (mode === 'demo') return finishOnboarding(router);
    setWorking(true);
    setNote(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setNote('בלי גישה למיקום נציג את המוצרים בלי מרחק. אפשר לשנות את זה בהגדרות הטלפון.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await saveLocation(position.coords.latitude, position.coords.longitude);
      finishOnboarding(router);
    } catch (e) {
      const message = errorMessage(e);
      setNote(
        message.includes('מחוץ ללהבים')
          ? message
          : 'לא הצלחנו לקבל את המיקום. אפשר להמשיך בלי (רק לא לפרסם מוצרים), ולנסות שוב אחר כך.',
      );
    } finally {
      setWorking(false);
    }
  };

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
          <Pill label="המיקום שלך מוגן" icon={Lock} tone="sage" style={styles.pill} />
          {note ? (
            <AppText variant="small" color={colors.cherryDark} center>
              {note}
            </AppText>
          ) : null}
        </View>

        <View style={styles.spacer} />

        <Button label="שיתוף מיקום משוער" onPress={share} loading={working} />
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
    backgroundColor: colors.sageLight,
    marginBottom: spacing.sm,
  },
  innerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sage,
  },
  texts: { gap: spacing.md },
  pill: { alignSelf: 'center' },
});
