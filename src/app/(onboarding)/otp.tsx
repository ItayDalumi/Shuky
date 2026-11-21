import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppText, Button, OtpInput, Screen, StepHeader, type OtpInputHandle } from '@/components';
import { errorMessage } from '@/lib/api';
import { formatCountdown } from '@/lib/format';
import { finishOnboarding } from '@/lib/navigation';
import { ltr } from '@/lib/rtl';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

const RESEND_SECONDS = 60;
/** Supabase sends 6-digit SMS codes; demo mode keeps the 4 boxes from the design. */
const CODE_LENGTH = isSupabaseConfigured ? 6 : 4;

/** 03 · קוד אימות */
export default function OtpScreen() {
  const { phone = '050-123-4567' } = useLocalSearchParams<{ phone?: string }>();
  const { verifyOtp, sendOtp } = useAppStore();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpRef = useRef<OtpInputHandle>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const complete = code.length === CODE_LENGTH;

  const verify = async (value = code) => {
    if (value.length !== CODE_LENGTH || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const next = await verifyOtp(phone, value);
      if (next === 'ready') finishOnboarding(router);
      else router.replace('/name');
    } catch (e) {
      setError(errorMessage(e));
      setCode('');
      otpRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  // Verify as soon as the last digit is typed (or pasted / autofilled from the SMS).
  const onCodeChange = (value: string) => {
    setCode(value);
    if (value.length === CODE_LENGTH) verify(value);
  };

  const resend = async () => {
    setCode('');
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    try {
      await sendOtp(phone);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <StepHeader title="מה הקוד שקיבלת?" subtitle={`שלחנו קוד בן ${CODE_LENGTH} ספרות ל-${ltr(phone)}`} />

          <View style={styles.otp}>
            <OtpInput ref={otpRef} value={code} onChange={onCodeChange} length={CODE_LENGTH} autoFocus />
          </View>

          {error ? (
            <AppText variant="small" color={colors.tomatoDark} center>
              {error}
            </AppText>
          ) : null}

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

          <Button label="אימות" onPress={() => verify()} disabled={!complete} loading={verifying} />
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
