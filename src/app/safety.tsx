import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Phone } from 'lucide-react-native';

import { AppText, Screen, ScreenHeader } from '@/components';
import { border, colors, radius, spacing } from '@/theme';

const HOTLINES = [
  { name: 'ער״ן – עזרה ראשונה נפשית', hint: 'שיחה אנונימית, 24 שעות ביממה', number: '1201' },
  { name: 'מד״א', hint: 'מצב חירום רפואי, כולל תגובה אלרגית', number: '101' },
  { name: 'משטרה', hint: 'סכנה מיידית', number: '100' },
];

const TIPS = [
  'אלרגיה או רגישות? שאלו את האופה על כל הרכיבים לפני ההזמנה. התגיות הן הצהרה של המוכר.',
  'שמרו מאפים עם קרם או גבינה במקרר, ובדקו מתי נאפו.',
  'מספיק לאסוף בפתח הבית. אין צורך להיכנס פנימה או לשתף פרטים אישיים מעבר לנדרש.',
  'משהו נראה לא תקין, מטריד או מסוכן? דווחו מעמוד המוצר, או חסמו את המשתמש.',
];

/** בטיחות ועזרה: hotlines and practical safety tips. Reachable from Settings and after a report. */
export default function SafetyScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader title="בטיחות ועזרה" fallback="/" />

        <View style={styles.urgent}>
          <AppText variant="bodyMedium" color={colors.cherryDark}>
            מרגישים במצוקה, או שמישהו בסכנה? אפשר לפנות עכשיו:
          </AppText>
          {HOTLINES.map((h) => (
            <Pressable
              key={h.number}
              accessibilityRole="button"
              accessibilityLabel={`התקשרות ל${h.name}, ${h.number}`}
              onPress={() => Linking.openURL(`tel:${h.number}`)}
              style={({ pressed }) => [styles.hotline, pressed ? { opacity: 0.85 } : null]}
            >
              <View style={styles.phoneIcon}>
                <Phone size={18} color={colors.white} strokeWidth={2} />
              </View>
              <View style={styles.texts}>
                <AppText variant="bodyMedium">{h.name}</AppText>
                <AppText variant="caption" color={colors.muted}>
                  {h.hint}
                </AppText>
              </View>
              <AppText variant="heading" color={colors.cherry}>
                {h.number}
              </AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="section">טיפים לקנייה בטוחה</AppText>
        {TIPS.map((tip) => (
          <View key={tip} style={styles.tip}>
            <View style={styles.bullet} />
            <AppText variant="callout" style={styles.tipText}>
              {tip}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xxl, paddingHorizontal: spacing.screen },
  urgent: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.cherryLight,
    borderRadius: radius.xl,
  },
  hotline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: border.hairline,
    borderColor: colors.line,
    borderRadius: radius.lg,
  },
  phoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cherry,
  },
  texts: { flex: 1, alignItems: 'flex-start', gap: 2 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage, marginTop: 9 },
  tipText: { flex: 1 },
});
