import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { AppText, Button, Input, Screen, StepHeader } from '@/components';
import { errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/format';
import { useAppStore } from '@/store/AppStore';
import { colors, spacing } from '@/theme';

/** 02 · התחברות. Sign in with a one-time code sent by email (free; no SMS provider). */
export default function EmailScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { sendOtp } = useAppStore();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidEmail(email);

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendOtp(email);
      router.push({ pathname: '/otp', params: { email: email.trim().toLowerCase() } });
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
          <StepHeader
            title={mode === 'login' ? 'טוב לראות אותך שוב!' : 'מה המייל שלך?'}
            subtitle="נשלח אליך קוד כניסה למייל. בלי סיסמאות, בלי כאב ראש."
          />

          <Input
            label="מייל"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            ltrValue
            autoFocus
            returnKeyType="send"
            onSubmitEditing={submit}
            containerStyle={styles.input}
          />
          {error ? (
            <AppText variant="small" color={colors.tomatoDark}>
              {error}
            </AppText>
          ) : null}

          <View style={styles.spacer} />

          <AppText variant="caption" color={colors.muted} center>
            בלחיצה על המשך את/ה מאשר/ת את תנאי השימוש ומדיניות הפרטיות
          </AppText>
          <Button label="שלחו לי קוד" onPress={submit} disabled={!valid} loading={sending} />
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
  input: { marginTop: spacing.lg },
  spacer: { flexGrow: 1, minHeight: spacing.xl },
});
