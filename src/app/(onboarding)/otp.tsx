import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppText, Button, OtpInput, Screen, StepHeader } from '@/components';
import { formatCountdown } from '@/lib/format';
import { ltr } from '@/lib/rtl';
import { colors, spacing } from '@/theme';

const RESEND_SECONDS = 60;
const CODE_LENGTH = 4;

/** 03 · קוד אימות. Phase 2: supabase.auth.verifyOtp({ phone, token, type: 'sms' }). */
export default function OtpScreen() {
  const { phone = '050-123-4567' } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const complete = code.length === CODE_LENGTH;

  const verify = () => {
    if (!complete) return;
    router.push('/location');
  };

  const resend = () => {
    setCode('');
    setSecondsLeft(RESEND_SECONDS);
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <StepHeader title="מה הקוד שקיבלת?" subtitle={`שלחנו קוד בן ${CODE_LENGTH} ספרות ל-${ltr(phone)}`} />

          <View style={styles.otp}>
            <OtpInput value={code} onChange={setCode} length={CODE_LENGTH} autoFocus />
          </View>

          {secondsLeft > 0 ? (
            <AppText variant="small" color={colors.muted} center>
              {`לא קיבלת? אפשר לשלוח שוב בעוד ${formatCountdown(secondsLeft)}`}
            </AppText>
          ) : (
            <Pressable accessibilityRole="button" onPress={resend} hitSlop={8} style={styles.resend}>
              <AppText variant="label" color={colors.tomato} center>
                לא קיבלת? שלחו לי קוד חדש
              </AppText>
            </Pressable>
          )}

          <View style={styles.spacer} />

          <Button label="אימות" onPress={verify} disabled={!complete} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.screen,
  },
  otp: { marginTop: spacing.lg, marginBottom: spacing.xxs },
  resend: { alignSelf: 'center' },
  spacer: { flexGrow: 1, minHeight: spacing.xl },
});
